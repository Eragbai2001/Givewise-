import { NotConfigured, RateLimited, searchCharities, type FoundCharity } from "@/lib/pip-search";
import { currentUser } from "@/lib/session";

// Web research takes a while; allow it.
export const maxDuration = 120;

function errorOf(e: unknown): { error: string; code?: string; status: number } {
  if (e instanceof NotConfigured) return { error: e.message, code: "not_configured", status: 503 };
  if (e instanceof RateLimited) return { error: e.message, code: "rate_limited", status: 429 };
  console.error("[GiveWise] Pip search failed:", e);
  return { error: "Pip couldn’t finish that search. Please try again.", status: 502 };
}

/**
 * "Ask Pip": search the live web for charities and people in need, with proof links.
 * With { stream: true } the answer is NDJSON, one line per event, so cards can show up while Pip keeps reading:
 *   {"event":"found","item":{...}}   …   {"event":"done","result":{...}}   or   {"event":"error","error":"…"}
 */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in to ask Pip to search." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { query?: string; stream?: boolean } | null;
  const q = body?.query?.trim() ?? "";
  if (q.length < 3) return Response.json({ error: "Tell Pip a bit more about what you care about." }, { status: 400 });

  if (!body?.stream) {
    try {
      return Response.json(await searchCharities({ query: q, userId: user.id }));
    } catch (e) {
      const { error, code, status } = errorOf(e);
      return Response.json({ error, code }, { status });
    }
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (x: unknown) => controller.enqueue(enc.encode(JSON.stringify(x) + "\n"));
      try {
        const result = await searchCharities({ query: q, userId: user.id, onFound: (item: FoundCharity) => send({ event: "found", item }) });
        send({ event: "done", result });
      } catch (e) {
        const { error, code } = errorOf(e);
        send({ event: "error", error, code });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
