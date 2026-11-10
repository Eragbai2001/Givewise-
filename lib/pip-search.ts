import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";

/**
 * Pip's research agent. Tavily searches the live web (news, registries, charity sites,
 * public posts that search engines index). Claude Haiku reads those results and returns
 * charities with proof links. Tavily has a free tier and Haiku costs far less than Opus.
 *
 * Trust rules enforced HERE, not trusted from the model:
 *  - A proof link only counts if that exact URL came back from Tavily.
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

const MODEL = process.env.PIP_MODEL ?? "claude-haiku-5-5";
const CACHE_HOURS = 6;
// Spending guards. Cached repeats don't count. Change them in .env.local.
const HOURLY_LIMIT = Number(process.env.PIP_HOURLY_LIMIT) || 5; // per donor
const DAILY_LIMIT = Number(process.env.PIP_DAILY_LIMIT) || 15; // across everyone

const SYSTEM = `You are Pip's research desk for GiveWise, an app that helps people give to charities they can trust.

Find real, currently operating charities, NGOs, animal shelters/rescues or community causes that match the donor's request, using ONLY the numbered web search results you are given. Include animal causes (dogs, puppies, strays, rescues) when asked.

For each result, gather PROOF the donor can open:
- registry: a government or regulator record (charity commission, IRS/tax-exempt lookup, CAC, etc.)
- report: the charity's own annual report, audit, or impact report
- news: independent news coverage
- official: the charity's own website or donation page
- social: a public Instagram / X / Facebook / YouTube post or page found through search
- other

Rules you must follow:
1. Only use URLs exactly as they appear in the search results. Never invent, guess or "fix" a URL. Don't add facts from memory: if the results don't say it, leave it out.
2. If you could not find proof for something, say so. Do not fill gaps with plausible-sounding facts.
3. "need" is what they need right now and why, only if a source shows it (an active appeal, a recent post, a news story). Otherwise write "No current appeal found".
4. Note red flags: no registration found, no recent updates, only social media presence, vague finances, pressure to give urgently.
5. Prefer charities with several independent sources. Return at most 5 results, best evidence first.
6. Be plain and short. No hype.

Reply with ONLY a JSON object in a \`\`\`json fenced block, exactly this shape:
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

/** Count one search against a key and return the new total, in one atomic statement (parallel requests can't slip through). */
async function bump(key: string) {
  const [row] = await query<{ result: string }>(
    `INSERT INTO gw_pip_cache (key, result, created_at) VALUES ($1, '1', $2)
     ON CONFLICT (key) DO UPDATE SET result = CAST(CAST(gw_pip_cache.result AS INTEGER) + 1 AS TEXT)
     RETURNING result`,
    [key, new Date().toISOString()],
  );
  return Number(row?.result ?? 0);
}

async function takeSearchToken(userId: string) {
  const now = new Date().toISOString();
  if ((await bump(`rl:${userId}:${now.slice(0, 13)}`)) > HOURLY_LIMIT) {
    throw new RateLimited(`Pip can do ${HOURLY_LIMIT} new searches an hour. Try again a little later, or repeat a recent search (those are free).`);
  }
  if ((await bump(`rl:all:${now.slice(0, 10)}`)) > DAILY_LIMIT) {
    throw new RateLimited("Pip has done all its new searches for today. Recent searches still work. Please try again tomorrow.");
  }
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

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

type WebHit = { url: string; title: string; content: string; published: string | null };

/** One Tavily search (1 credit). https://docs.tavily.com/documentation/api-reference/endpoint/search */
async function tavily(key: string, query: string, topic: "general" | "news"): Promise<WebHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, topic, search_depth: "basic", max_results: 8, chunks_per_source: 3 }),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
  const data = (await res.json()) as { results?: { url?: string; title?: string; content?: string; published_date?: string | null }[] };
  return (data.results ?? [])
    .filter((r) => r.url && /^https?:\/\//i.test(r.url))
    .map((r) => ({ url: r.url!, title: (r.title ?? "").slice(0, 200), content: (r.content ?? "").slice(0, 1200), published: r.published_date ?? null }));
}

/** Two searches: the web in general (charity sites, registries, reports) and recent news (independent coverage, appeals). */
async function searchWeb(key: string, q: string) {
  const runs = await Promise.allSettled([tavily(key, `${q} charity`, "general"), tavily(key, `${q} charity`, "news")]);
  const ok = runs.filter((r): r is PromiseFulfilledResult<WebHit[]> => r.status === "fulfilled");
  if (!ok.length) {
    console.error("[GiveWise] Tavily failed:", runs.map((r) => (r.status === "rejected" ? String(r.reason) : "ok")).join("; "));
    throw new Error("Pip couldn’t reach the web search just now. Please try again.");
  }
  const hits: WebHit[] = [];
  const seen = new Set<string>();
  for (const h of ok.flatMap((r) => r.value)) {
    const n = normUrl(h.url);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    hits.push(h);
  }
  return { hits: hits.slice(0, 16), seen };
}

export async function searchCharities(opts: { query: string; userId: string }): Promise<SearchResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey || !tavilyKey) throw new NotConfigured("Pip’s web search isn’t switched on yet.");

  const q = opts.query.trim().replace(/\s+/g, " ").slice(0, 300);
  const cacheKey = "s:" + createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 32);

  const cached = await hit(cacheKey);
  if (cached) return { ...(JSON.parse(cached) as Omit<SearchResult, "cached">), cached: true };

  await takeSearchToken(opts.userId);

  const { hits, seen } = await searchWeb(tavilyKey, q);
  if (!hits.length) {
    return { summary: "I couldn’t find anything on the web for that. Try different words.", results: [], searchedAt: new Date().toISOString(), cached: false };
  }

  // Only URLs from this list can become proof links (sanitize checks against `seen`).
  const sources = hits
    .map((h, i) => `[${i + 1}] ${h.title}\nURL: ${h.url}${h.published ? `\nPublished: ${h.published}` : ""}\n${h.content}`)
    .join("\n\n");
  const today = new Date().toISOString().slice(0, 10);

  const client = new Anthropic({ apiKey: anthropicKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Donor request: "${q}"\n\nWeb search results:\n\n${sources}\n\nFind charities that match, with proof links taken from these results only.`,
      },
    ],
  });
  if (msg.stop_reason === "refusal") throw new Error("Pip couldn’t research that request.");

  // Rough cost so you can watch spend in the server log (Haiku 5.5 list price: $0.10 / $0.50 per M tokens). Plus 2 Tavily credits.
  const cost = (msg.usage.input_tokens * 0.1 + msg.usage.output_tokens * 0.5) / 1_000_000;
  console.log(`[GiveWise] Pip search: ${hits.length} web results, ${msg.usage.input_tokens} in + ${msg.usage.output_tokens} out tokens on ${MODEL} (about $${cost.toFixed(4)}), 2 Tavily credits.`);

  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const parsed = extractJson(text);
  if (!parsed) throw new Error("Pip couldn’t put its findings together. Please try again.");

  const clean = sanitize(parsed, seen);
  const result = { ...clean, searchedAt: new Date().toISOString() };
  await put(cacheKey, JSON.stringify(result));
  return { ...result, cached: false };
}
