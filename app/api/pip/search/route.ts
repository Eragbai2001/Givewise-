import { NotConfigured, RateLimited, searchCharities } from "@/lib/pip-search";
import { currentUser } from "@/lib/session";

// Web research takes a while; allow it.
export const maxDuration = 120;

/** "Ask Pip": search the live web for charities that match, with proof links. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in to ask Pip to search." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { query?: string } | null;
  const q = body?.query?.trim() ?? "";
  if (q.length < 3) return Response.json({ error: "Tell Pip a bit more about what you care about." }, { status: 400 });

  try {
    return Response.json(await searchCharities({ query: q, userId: user.id }));
  } catch (e) {
    if (e instanceof NotConfigured) return Response.json({ error: e.message, code: "not_configured" }, { status: 503 });
    if (e instanceof RateLimited) return Response.json({ error: e.message, code: "rate_limited" }, { status: 429 });
    console.error("[GiveWise] Pip search failed:", e);
    return Response.json({ error: "Pip couldn’t finish that search. Please try again." }, { status: 502 });
  }
}
