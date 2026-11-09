import { LimitError, getLimits, getPlan, saveLimits } from "@/lib/payments";
import { currentUser } from "@/lib/session";

/** Change the monthly hard limit and the one-off gift limit. Checked on the server. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { hardLimitCents?: number; oneOffLimitCents?: number } | null;
  if (!b || !Number.isInteger(b.hardLimitCents) || !Number.isInteger(b.oneOffLimitCents)) {
    return Response.json({ error: "Enter both limits in whole cents." }, { status: 400 });
  }
  const hard = b.hardLimitCents as number;
  const plan = await getPlan(user.id);
  const planTotal = plan.saved ? plan.items.reduce((s, i) => s + i.amountCents, 0) : 0;
  if (hard < planTotal) {
    return Response.json(
      { error: `Your plan gives $${(planTotal / 100).toFixed(2)} a month. Lower your plan first, or keep the limit at least that high.` },
      { status: 409 },
    );
  }
  try {
    await saveLimits(user.id, { hardLimitCents: hard, oneOffLimitCents: b.oneOffLimitCents as number });
    return Response.json({ ok: true, ...(await getLimits(user.id)) });
  } catch (e) {
    if (e instanceof LimitError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
