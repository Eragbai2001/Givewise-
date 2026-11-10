import { getConnection, getLimits, getPlan, givenThisMonth, paidThisMonth, recentPayments, releaseStalePending } from "@/lib/payments";
import { foundFor } from "@/lib/pip-search";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  await releaseStalePending(user.id);
  const [connection, limits, plan, payments, given, paidIds, found] = await Promise.all([
    getConnection(user.id),
    getLimits(user.id),
    getPlan(user.id),
    recentPayments(user.id),
    givenThisMonth(user.id),
    paidThisMonth(user.id),
    // What Pip found about this donor's charities: sources, confidence, what they do.
    foundFor(user.id).catch(() => ({}) as Awaited<ReturnType<typeof foundFor>>),
  ]);
  const sandbox = process.env.PAYPAL_ENV !== "live";
  const testEmail = process.env.PAYPAL_TEST_BUYER_EMAIL;
  const testPassword = process.env.PAYPAL_TEST_BUYER_PASSWORD;
  return Response.json({
    connected: Boolean(connection),
    paypalEmail: connection?.email ?? null,
    env: sandbox ? "sandbox" : "live",
    // Fake-money login for judges. Never sent in live mode.
    testLogin: sandbox && testEmail && testPassword ? { email: testEmail, password: testPassword } : null,
    hardLimitCents: limits.hardLimitCents,
    oneOffLimitCents: limits.oneOffLimitCents,
    givenThisMonthCents: given,
    planSaved: plan.saved,
    // Charities whose gift for this month has already gone out.
    paidCharityIds: paidIds,
    plan: plan.items.map((i) => ({ ...i, details: found[i.charityId] ?? null })),
    payments,
  });
}
