import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";

/**
 * Pip's research agent. Claude searches the live web (news, registries, charity sites,
 * public social posts that search engines index), then returns charities with proof links.
 *
 * Trust rules enforced HERE, not trusted from the model:
 *  - A proof link only counts if that exact URL appeared in the web search results.
 *  - Confidence is recomputed from the validated proofs; the model can only lower it.
 */
export type ProofKind = "registry" | "report" | "news" | "official" | "social" | "other";
export type Confidence = "verified" | "partial" | "none";
export type Proof = { url: string; title: string; kind: ProofKind; note: string; domain: string };
export type FoundCharity = {
  name: string;
  cause: string;
  place: string;
  what: string;
  need: string;
  website: string | null;
  donateUrl: string | null;
  confidence: Confidence;
  confidenceReason: string;
  proofs: Proof[];
  redFlags: string[];
};
export type SearchResult = { summary: string; results: FoundCharity[]; searchedAt: string; cached: boolean };

export class NotConfigured extends Error {}
export class RateLimited extends Error {}

const MODEL = process.env.PIP_MODEL ?? "claude-opus-5-5";
const CACHE_HOURS = 6;
const HOURLY_LIMIT = 20;

const SYSTEM = `You are Pip's research desk for GiveWise, an app that helps people give to charities they can trust.

Find real, currently operating charities, NGOs, animal shelters/rescues or community causes that match the donor's request, using web search. Include animal causes (dogs, puppies, strays, rescues) when asked.

For each result, gather PROOF the donor can open:
- registry: a government or regulator record (charity commission, IRS/tax-exempt lookup, CAC, etc.)
- report: the charity's own annual report, audit, or impact report
- news: independent news coverage
- official: the charity's own website or donation page
- social: a public Instagram / X / Facebook / YouTube post or page found through search
- other

Rules you must follow:
1. Only use URLs that appeared in your search results. Never invent, guess or "fix" a URL.
2. If you could not find proof for something, say so. Do not fill gaps with plausible-sounding facts.
3. "need" is what they need right now and why, only if a source shows it (an active appeal, a recent post, a news story). Otherwise write "No current appeal found".
4. Note red flags: no registration found, no recent updates, only social media presence, vague finances, pressure to give urgently.
5. Prefer charities with several independent sources. Return at most 5 results, best evidence first.
6. Be plain and short. No hype.

When you are done, reply with ONLY a JSON object in a \`\`\`json fenced block, exactly this shape:
{"summary": string, "results": [{"name": string, "cause": string, "place": string, "what": string, "need": string, "website": string|null, "donateUrl": string|null, "confidence": "verified"|"partial"|"none", "confidenceReason": string, "proofs": [{"url": string, "title": string, "kind": "registry"|"report"|"news"|"official"|"social"|"other", "note": string}], "redFlags": [string]}]}`;

function domainOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function normUrl(u: string) {
  try {
    const x = new URL(u);
    x.hash = "";
    return (x.origin + x.pathname.replace(/\/$/, "") + x.search).toLowerCase();
  } catch {
    return "";
  }
}

async function hit(key: string): Promise<string | null> {
  const [r] = await query<{ result: string; created_at: string }>("SELECT result, created_at FROM gw_pip_cache WHERE key = $1", [key]);
  if (!r) return null;
  if (Date.now() - new Date(r.created_at).getTime() > CACHE_HOURS * 3600_000) return null;
  return r.result;
}
async function put(key: string, result: string) {
  await query(
    `INSERT INTO gw_pip_cache (key, result, created_at) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET result = EXCLUDED.result, created_at = EXCLUDED.created_at`,
    [key, result, new Date().toISOString()],
  );
}

async function takeSearchToken(userId: string) {
  const key = `rl:${userId}:${new Date().toISOString().slice(0, 13)}`;
  const [row] = await query<{ result: string }>("SELECT result FROM gw_pip_cache WHERE key = $1", [key]);
  const used = Number(row?.result ?? 0);
  if (used >= HOURLY_LIMIT) throw new RateLimited(`Pip can do ${HOURLY_LIMIT} searches an hour. Try again a little later.`);
  await put(key, String(used + 1));
}

/** Pull every URL that actually showed up in the web search results (and citations). */
function collectSeenUrls(content: unknown[]) {
  const seen = new Set<string>();
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content as { url?: string }[]) if (r.url) seen.add(normUrl(r.url));
    }
    if (block.type === "text" && Array.isArray(block.citations)) {
      for (const c of block.citations as { url?: string }[]) if (c.url) seen.add(normUrl(c.url));
    }
  }
  seen.delete("");
  return seen;
}

const KINDS: ProofKind[] = ["registry", "report", "news", "official", "social", "other"];
const INDEPENDENT: ProofKind[] = ["registry", "report", "news"];

function sanitize(raw: unknown, seen: Set<string>): { summary: string; results: FoundCharity[] } {
  const obj = (raw ?? {}) as { summary?: unknown; results?: unknown };
  const list = Array.isArray(obj.results) ? obj.results : [];
  const results: FoundCharity[] = [];

  for (const item of list.slice(0, 5) as Record<string, unknown>[]) {
    const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const name = str(item.name, 120);
    if (!name) continue;

    // Keep only proofs whose exact URL came back from search. Everything else is dropped.
    const proofs: Proof[] = [];
    const used = new Set<string>();
    for (const p of (Array.isArray(item.proofs) ? item.proofs : []) as Record<string, unknown>[]) {
      const url = str(p.url, 600);
      const n = normUrl(url);
      if (!/^https?:\/\//i.test(url) || !n || !seen.has(n) || used.has(n)) continue;
      used.add(n);
      const kind = KINDS.includes(p.kind as ProofKind) ? (p.kind as ProofKind) : "other";
      proofs.push({ url, title: str(p.title, 140) || domainOf(url), kind, note: str(p.note, 240), domain: domainOf(url) });
    }

    const site = str(item.website, 600);
    const donate = str(item.donateUrl, 600);
    const okLink = (u: string) => (u && seen.has(normUrl(u)) ? u : null);

    // Recompute confidence from what survived validation. The model can only make it lower.
    const domains = new Set(proofs.map((p) => p.domain));
    const independent = proofs.some((p) => INDEPENDENT.includes(p.kind));
    let computed: Confidence = "none";
    if (proofs.length >= 1) computed = "partial";
    if (domains.size >= 2 && independent) computed = "verified";
    const rank: Record<Confidence, number> = { none: 0, partial: 1, verified: 2 };
    const claimed = (["verified", "partial", "none"].includes(item.confidence as string) ? item.confidence : "none") as Confidence;
    const confidence = rank[claimed] < rank[computed] ? claimed : computed;

    const reason =
      confidence === "none"
        ? "Couldn’t find a source I can show you for this."
        : str(item.confidenceReason, 300) ||
          (confidence === "verified" ? "Several independent sources agree." : "Only a little evidence so far.");

    results.push({
      name,
      cause: str(item.cause, 60),
      place: str(item.place, 100),
      what: str(item.what, 400),
      need: str(item.need, 400),
      website: okLink(site),
      donateUrl: okLink(donate),
      confidence,
      confidenceReason: reason,
      proofs,
      redFlags: (Array.isArray(item.redFlags) ? item.redFlags : []).map((r) => str(r, 160)).filter(Boolean).slice(0, 5),
    });
  }
  return { summary: typeof obj.summary === "string" ? obj.summary.slice(0, 500) : "", results };
}

function extractJson(content: unknown[]) {
  const text = (content as { type: string; text?: string }[])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function runModel(client: Anthropic, request: string) {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: request }];
  const all: unknown[] = [];

  for (let turn = 0; turn < 4; turn++) {
    const params = {
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      thinking: { type: "adaptive" as const },
      output_config: { effort: "medium" as const },
      tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 8 }],
      messages,
    };
    // Safety fallback is on by default for this model; if the API rejects the parameter, retry without it.
    let msg: Anthropic.Beta.BetaMessage;
    try {
      msg = await client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }).finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && /fallback|beta/i.test(e.message)) {
        msg = await client.beta.messages.stream(params).finalMessage();
      } else throw e;
    }
    all.push(...msg.content);
    if (msg.stop_reason === "refusal") break;
    if (msg.stop_reason !== "pause_turn") break;
    // Server-side search needs more time: hand the partial turn back and let it continue.
    messages.push({ role: "assistant", content: msg.content });
  }
  return all;
}

export async function searchCharities(opts: { query: string; userId: string }): Promise<SearchResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new NotConfigured("Pip’s web search isn’t switched on yet.");

  const q = opts.query.trim().replace(/\s+/g, " ").slice(0, 300);
  const cacheKey = "s:" + createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 32);

  const cached = await hit(cacheKey);
  if (cached) return { ...(JSON.parse(cached) as Omit<SearchResult, "cached">), cached: true };

  await takeSearchToken(opts.userId);

  const client = new Anthropic({ apiKey: key });
  const today = new Date().toISOString().slice(0, 10);
  const content = await runModel(client, `Today is ${today}. Donor request: "${q}"\n\nFind charities that match, with proof links.`);

  const parsed = extractJson(content);
  if (!parsed) throw new Error("Pip couldn’t put its findings together. Please try again.");

  const clean = sanitize(parsed, collectSeenUrls(content));
  const result = { ...clean, searchedAt: new Date().toISOString() };
  await put(cacheKey, JSON.stringify(result));
  return { ...result, cached: false };
}
