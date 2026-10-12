import { LimitError, savePlan } from "@/lib/payments";
import { currentUser } from "@/lib/session";

/** Save the donor's approved split. Rejected on the server if it goes over their hard limit. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { items?: { charityId: string; charityName: string; amountCents: number }[] } | null;
  if (!b?.items?.length || b.items.some((i) => !i.charityId || !i.charityName || !Number.isInteger(i.amountCents) || i.amountCents <= 0)) {
    return Response.json({ error: "That plan isn’t valid." }, { status: 400 });
  }
  try {
    await savePlan(user.id, b.items);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof LimitError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
