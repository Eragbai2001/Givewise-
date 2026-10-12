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
  return Response.json({
    connected: Boolean(connection),
    paypalEmail: connection?.email ?? null,
    env: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
    hardLimitCents: limits.hardLimitCents,
    oneOffLimitCents: limits.oneOffLimitCents,
    givenThisMonthCents: given,
    planSaved: plan.saved,
    plan: plan.items,
    payments,
  });
}
