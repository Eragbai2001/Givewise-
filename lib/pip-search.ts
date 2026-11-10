import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import { foundId } from "./found-id";

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
export type FoundKind = "charity" | "person";
export type FoundCharity = {
  /** "person" = an individual in need (e.g. surgery, war victim), found through news, fundraisers or public posts. */
  type: FoundKind;
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
/** stale = an older saved result, shown because a fresh search couldn't run (limit reached or the web search failed). */
export type SearchResult = { summary: string; results: FoundCharity[]; searchedAt: string; cached: boolean; stale?: boolean };

export class NotConfigured extends Error {}
export class RateLimited extends Error {}

/** Called with each finding as soon as Pip has checked it, so the UI can show results while Pip keeps reading. */
export type OnFound = (item: FoundCharity) => void;

const MODEL = process.env.PIP_MODEL ?? "claude-haiku-5-5";
const CACHE_HOURS = 6;
// Spending guards. Cached repeats don't count. Change them in .env.local.
const HOURLY_LIMIT = Number(process.env.PIP_HOURLY_LIMIT) || 5; // per donor
const DAILY_LIMIT = Number(process.env.PIP_DAILY_LIMIT) || 15; // across everyone

const SYSTEM = `You are Pip's research desk for GiveWise, an app that helps people give to causes they can trust.

Using ONLY the numbered web search results you are given, find two kinds of things that match the donor's request:
1. "charity": real, currently operating charities, NGOs, animal shelters/rescues or community causes. Include animal causes when asked.
2. "person": a specific individual or family with a current, public need, such as urgent surgery, medical bills, war or disaster victims, found in news stories, fundraiser pages (GoFundMe etc.) or public posts on X, Instagram, Threads or Facebook. Only include a person if a result clearly describes their need. Never include phone numbers, home addresses, bank or account details, or anything about a child beyond what a public news story says.

For each finding, gather PROOF the donor can open:
- registry: a government or regulator record (charity commission, IRS/tax-exempt lookup, CAC, etc.)
- report: the charity's own annual report, audit, or impact report
- news: independent news coverage
- official: the charity's own website, or a person's fundraiser page
- social: a public Instagram / X / Threads / Facebook / TikTok / YouTube post or page
- other

Rules you must follow:
1. Only use URLs exactly as they appear in the search results. Never invent, guess or "fix" a URL. Don't add facts from memory: if the results don't say it, leave it out.
2. If you could not find proof for something, say so. Do not fill gaps with plausible-sounding facts.
3. "need" is what they need right now and why, only if a source shows it (an active appeal, a recent post, a news story). Otherwise write "No current appeal found".
4. Note red flags: no registration found, no recent updates, only social media presence, vague finances, pressure to give urgently, the same appeal posted by different people with different stories.
5. Prefer findings with several independent sources. At most 5 charities and 3 people, best evidence first.
6. Be plain and short. No hype. "what" is one or two sentences.

Output format (important, the app shows each line as soon as you write it):
- Write one finding per line, as a single-line JSON object. No code fences, no other text.
- Each finding line: {"type": "charity"|"person", "name": string, "cause": string (2-4 words), "place": string, "what": string, "need": string, "website": string|null, "donateUrl": string|null, "confidence": "verified"|"partial"|"none", "confidenceReason": string, "proofs": [{"url": string, "title": string, "kind": "registry"|"report"|"news"|"official"|"social"|"other", "note": string}], "redFlags": [string]}
- For a person, "name" is how the sources name them (e.g. "Amina, 9, heart surgery"), and "donateUrl" is their fundraiser link if one is in the results.
- The last line is {"type": "summary", "summary": string}: one or two sentences on what you found.`;

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

async function hit(key: string, anyAge = false): Promise<string | null> {
  const [r] = await query<{ result: string; created_at: string }>("SELECT result, created_at FROM gw_pip_cache WHERE key = $1", [key]);
  if (!r) return null;
  if (!anyAge && Date.now() - new Date(r.created_at).getTime() > CACHE_HOURS * 3600_000) return null;
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

const SOCIAL_DOMAINS = ["x.com", "twitter.com", "instagram.com", "threads.net", "threads.com", "facebook.com", "tiktok.com", "gofundme.com"];
const isSocial = (domain: string) => SOCIAL_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));

/** Check one finding against the search results. Returns null if it can't be shown. */
function cleanItem(item: Record<string, unknown>, seen: Set<string>): FoundCharity | null {
  const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(item.name, 120);
  if (!name) return null;
  const type: FoundKind = item.type === "person" ? "person" : "charity";

  // Keep only proofs whose exact URL came back from search. Everything else is dropped.
  const proofs: Proof[] = [];
  const used = new Set<string>();
  for (const p of (Array.isArray(item.proofs) ? item.proofs : []) as Record<string, unknown>[]) {
    const url = str(p.url, 600);
    const n = normUrl(url);
    if (!/^https?:\/\//i.test(url) || !n || !seen.has(n) || used.has(n)) continue;
    used.add(n);
    const domain = domainOf(url);
    let kind = KINDS.includes(p.kind as ProofKind) ? (p.kind as ProofKind) : "other";
    // A post on a social or fundraiser site is never a registry, report or news story, whatever the model says.
    if (isSocial(domain) && INDEPENDENT.includes(kind)) kind = "social";
    proofs.push({ url, title: str(p.title, 140) || domain, kind, note: str(p.note, 240), domain });
  }
  // A person with no link we can show is never shown at all.
  if (type === "person" && proofs.length === 0) return null;

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

  const redFlags = (Array.isArray(item.redFlags) ? item.redFlags : []).map((r) => str(r, 160)).filter(Boolean);
  if (proofs.length > 0 && proofs.every((p) => isSocial(p.domain))) {
    redFlags.unshift("Only found on social media or a fundraiser page so far. Read the post and its comments before you give.");
  }

  return {
    type,
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
    redFlags: redFlags.slice(0, 5),
  };
}

type WebHit = { url: string; title: string; content: string; published: string | null };

/** One Tavily search (1 credit). https://docs.tavily.com/documentation/api-reference/endpoint/search */
async function tavily(key: string, query: string, topic: "general" | "news", opts: { domains?: string[]; max?: number } = {}): Promise<WebHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      topic,
      search_depth: "basic",
      max_results: opts.max ?? 7,
      ...(opts.domains ? { include_domains: opts.domains } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
  const data = (await res.json()) as { results?: { url?: string; title?: string; content?: string; published_date?: string | null }[] };
  return (data.results ?? [])
    .filter((r) => r.url && /^https?:\/\//i.test(r.url))
    .map((r) => ({ url: r.url!, title: (r.title ?? "").slice(0, 200), content: (r.content ?? "").slice(0, 900), published: r.published_date ?? null }));
}

/**
 * Three searches at once (3 credits): the web in general (charity sites, registries, reports), recent news
 * (independent coverage, appeals, people in need), and public posts and fundraisers on social sites.
 * We only read what the search engine has indexed. We never scrape X, Instagram or Threads.
 */
async function searchWeb(key: string, q: string) {
  const runs = await Promise.allSettled([
    tavily(key, `${q} charity`, "general"),
    tavily(key, `${q} appeal donate`, "news"),
    tavily(key, `${q} urgent help needed fundraiser`, "general", { domains: SOCIAL_DOMAINS, max: 6 }),
  ]);
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
  return { hits: hits.slice(0, 20), seen };
}

/** Run Pip's research. Pass onFound to get each finding as soon as it is checked. */
export async function searchCharities(opts: { query: string; userId: string; onFound?: OnFound }): Promise<SearchResult> {
  try {
    return await freshSearch(opts);
  } catch (e) {
    // A new search couldn't run. If Pip searched this before (even days ago), show that rather than nothing.
    if (e instanceof NotConfigured) throw e;
    const q = opts.query.trim().replace(/\s+/g, " ").slice(0, 300);
    const old = await hit("s2:" + createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 32), true).catch(() => null);
    if (!old) throw e;
    const r = JSON.parse(old) as Omit<SearchResult, "cached">;
    r.results.forEach((x) => opts.onFound?.(x));
    return { ...r, cached: true, stale: true };
  }
}

async function freshSearch(opts: { query: string; userId: string; onFound?: OnFound }): Promise<SearchResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey || !tavilyKey) throw new NotConfigured("Pip’s web search isn’t switched on yet.");

  const q = opts.query.trim().replace(/\s+/g, " ").slice(0, 300);
  // "s2:" = results that include people in need (older cached results don't).
  const cacheKey = "s2:" + createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 32);

  const cached = await hit(cacheKey);
  if (cached) {
    const r = JSON.parse(cached) as Omit<SearchResult, "cached">;
    r.results.forEach((x) => opts.onFound?.(x));
    await rememberFound(opts.userId, r.results);
    return { ...r, cached: true };
  }

  await takeSearchToken(opts.userId);

  const { hits, seen } = await searchWeb(tavilyKey, q);
  if (!hits.length) {
    return { summary: "I couldn’t find anything on the web for that. Try different words.", results: [], searchedAt: new Date().toISOString(), cached: false };
  }

  // Only URLs from this list can become proof links (cleanItem checks against `seen`).
  const sources = hits
    .map((h, i) => `[${i + 1}] ${h.title}\nURL: ${h.url}${h.published ? `\nPublished: ${h.published}` : ""}\n${h.content}`)
    .join("\n\n");
  const today = new Date().toISOString().slice(0, 10);

  const client = new Anthropic({ apiKey: anthropicKey });
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Donor request: "${q}"\n\nWeb search results:\n\n${sources}\n\nFind matching charities and people in need, with proof links taken from these results only. One JSON object per line.`,
      },
    ],
  });

  // Read the answer line by line and pass on each finding as soon as it is complete and checked.
  const results: FoundCharity[] = [];
  const names = new Set<string>();
  let summary = "";
  let buf = "";
  let full = "";
  const takeLine = (line: string) => {
    const t = line.trim().replace(/,$/, "");
    if (!t.startsWith("{")) return;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(t);
    } catch {
      return;
    }
    takeObj(obj);
  };
  const takeObj = (obj: Record<string, unknown>) => {
    if (obj.type === "summary") {
      summary = typeof obj.summary === "string" ? obj.summary.slice(0, 500) : "";
      return;
    }
    const item = cleanItem(obj, seen);
    if (!item) return;
    const key = `${item.type}:${item.name.toLowerCase()}`;
    const count = results.filter((r) => r.type === item.type).length;
    if (names.has(key) || count >= (item.type === "person" ? 3 : 5)) return;
    names.add(key);
    results.push(item);
    opts.onFound?.(item);
  };
  stream.on("text", (delta) => {
    full += delta;
    buf += delta;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      takeLine(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  });
  const msg = await stream.finalMessage();
  takeLine(buf);
  // Fallback: if the model wrote one big JSON block instead of one line per finding, read it whole.
  if (!results.length) {
    const fenced = full.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? full;
    try {
      const start = fenced.search(/[[{]/);
      const parsed = JSON.parse(fenced.slice(start, Math.max(fenced.lastIndexOf("}"), fenced.lastIndexOf("]")) + 1));
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.results) ? parsed.results : [parsed];
      if (!Array.isArray(parsed) && typeof parsed?.summary === "string") summary = parsed.summary.slice(0, 500);
      for (const o of list) if (o && typeof o === "object") takeObj(o as Record<string, unknown>);
    } catch {}
  }
  if (msg.stop_reason === "refusal") throw new Error("Pip couldn’t research that request.");

  // Rough cost so you can watch spend in the server log (Haiku 5.5 list price: $0.10 / $0.50 per M tokens). Plus 3 Tavily credits.
  const cost = (msg.usage.input_tokens * 0.1 + msg.usage.output_tokens * 0.5) / 1_000_000;
  console.log(`[GiveWise] Pip search: ${hits.length} web results, ${msg.usage.input_tokens} in + ${msg.usage.output_tokens} out tokens on ${MODEL} (about $${cost.toFixed(4)}), 3 Tavily credits, ${results.length} findings.`);

  if (!results.length && !summary) throw new Error("Pip couldn’t put its findings together. Please try again.");

  const result = { summary, results, searchedAt: new Date().toISOString() };
  await put(cacheKey, JSON.stringify(result));
  await rememberFound(opts.userId, results);
  return { ...result, cached: false };
}

/** Keep the donor's copy of each finding (already checked above), so My plan can show it with its sources. */
async function rememberFound(userId: string, items: FoundCharity[]) {
  const now = new Date().toISOString();
  for (const f of items) {
    await query(
      `INSERT INTO gw_found (user_id, charity_id, data, updated_at) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, charity_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [userId, foundId(f), JSON.stringify(f), now],
    ).catch((e) => console.error("[GiveWise] couldn’t save a finding:", e));
  }
}

/** What Pip found earlier for these ids (this donor only). Missing ids are left out. */
export async function foundFor(userId: string, ids: string[]): Promise<Record<string, FoundCharity & { checkedAt: string }>> {
  if (!ids.length) return {};
  const rows = await query<{ charity_id: string; data: string; updated_at: string }>(
    "SELECT charity_id, data, updated_at FROM gw_found WHERE user_id = $1",
    [userId],
  );
  const out: Record<string, FoundCharity & { checkedAt: string }> = {};
  for (const r of rows) {
    if (!ids.includes(r.charity_id)) continue;
    try {
      out[r.charity_id] = { ...(JSON.parse(r.data) as FoundCharity), checkedAt: r.updated_at };
    } catch {}
  }
  return out;
}
