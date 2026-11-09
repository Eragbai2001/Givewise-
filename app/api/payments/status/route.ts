import { getConnection, getLimits, getPlan, givenThisMonth, recentPayments } from "@/lib/payments";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  const [connection, limits, plan, payments, given] = await Promise.all([
    getConnection(user.id),
    getLimits(user.id),
    getPlan(user.id),
    recentPayments(user.id),
    givenThisMonth(user.id),
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
    plan: plan.items,
    payments,
  });
}
