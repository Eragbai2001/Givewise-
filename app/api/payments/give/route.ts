import { LimitError, giveOnce } from "@/lib/payments";
import { currentUser } from "@/lib/session";

/** One-off gift (e.g. an urgent appeal the donor approved). Amount is checked on the server. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { charityId?: string; charityName?: string; amountCents?: number } | null;
  if (!b?.charityId || !b.charityName || !Number.isInteger(b.amountCents) || (b.amountCents as number) <= 0) {
    return Response.json({ error: "Missing charity or amount." }, { status: 400 });
  }
  try {
    const result = await giveOnce(user.id, { charityId: b.charityId, charityName: b.charityName, amountCents: b.amountCents as number });
    return Response.json({ result });
  } catch (e) {
    if (e instanceof LimitError) return Response.json({ error: e.message }, { status: 409 });
    console.error("[GiveWise] one-off gift failed:", e);
    return Response.json({ error: "That gift couldn’t be sent. Nothing was charged." }, { status: 500 });
  }
}
