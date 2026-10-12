import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "./db";
import { chargeVault, PayPalError } from "./paypal";

/**
 * The money rules live here, on the server. The UI can show a limit; this enforces it.
 *  - No charge without a saved PayPal and a plan item the donor approved.
 *  - Every charge reserves its amount first, then checks this month's total against the hard limit.
 *  - GiveWise never holds money: each order is paid to the charity's PayPal (payee) directly.
 */
export const DEFAULT_LIMIT_CENTS = 5000;

/** The sample plan shown across the app until the donor saves their own. */
export const SAMPLE_PLAN = [
  { charityId: "cs", charityName: "ClearSpring Water Initiative", amountCents: 2500 },
  { charityId: "bf", charityName: "Bright Futures Scholarship Fund", amountCents: 1500 },
  { charityId: "rl", charityName: "Roots Local Aid", amountCents: 1000 },
];

const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
const now = () => new Date().toISOString();

type Settings = { hard_limit_cents: number; one_off_limit_cents: number };
export async function getLimits(userId: string) {
  const [s] = await query<Settings>("SELECT hard_limit_cents, one_off_limit_cents FROM gw_setting WHERE user_id = $1", [userId]);
  return { hardLimitCents: s?.hard_limit_cents ?? DEFAULT_LIMIT_CENTS, oneOffLimitCents: s?.one_off_limit_cents ?? DEFAULT_LIMIT_CENTS };
}

export async function getConnection(userId: string) {
  const [m] = await query<{ vault_id: string; paypal_email: string | null; created_at: string }>(
    "SELECT vault_id, paypal_email, created_at FROM gw_payment_method WHERE user_id = $1 AND revoked = 0 ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  return m ? { vaultId: m.vault_id, email: m.paypal_email, since: m.created_at } : null;
}

export async function saveConnection(userId: string, vaultId: string, customerId: string | null, email: string | null) {
  await query("UPDATE gw_payment_method SET revoked = 1 WHERE user_id = $1", [userId]);
  await query(
    "INSERT INTO gw_payment_method (id, user_id, vault_id, customer_id, paypal_email, revoked, created_at) VALUES ($1,$2,$3,$4,$5,0,$6)",
    [randomUUID(), userId, vaultId, customerId, email, now()],
  );
}

export async function getPlan(userId: string) {
  const rows = await query<{ charity_id: string; charity_name: string; amount_cents: number; payee_email: string | null }>(
    "SELECT charity_id, charity_name, amount_cents, payee_email FROM gw_plan_item WHERE user_id = $1 AND active = 1 ORDER BY created_at",
    [userId],
  );
  if (!rows.length) return { saved: false, items: SAMPLE_PLAN.map((i) => ({ ...i, payeeEmail: null as string | null })) };
  return {
    saved: true,
    items: rows.map((r) => ({ charityId: r.charity_id, charityName: r.charity_name, amountCents: Number(r.amount_cents), payeeEmail: r.payee_email })),
  };
}

export async function savePlan(userId: string, items: { charityId: string; charityName: string; amountCents: number; payeeEmail?: string | null }[]) {
  const { hardLimitCents } = await getLimits(userId);
  const total = items.reduce((s, i) => s + i.amountCents, 0);
  if (total > hardLimitCents) {
    throw new LimitError(`That plan adds up to $${(total / 100).toFixed(2)} a month, which is over your $${(hardLimitCents / 100).toFixed(2)} limit.`);
  }
  await query("UPDATE gw_plan_item SET active = 0 WHERE user_id = $1", [userId]);
  for (const i of items) {
    if (!Number.isInteger(i.amountCents) || i.amountCents <= 0) continue;
    await query(
      `INSERT INTO gw_plan_item (id, user_id, charity_id, charity_name, amount_cents, payee_email, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,1,$7)
       ON CONFLICT (user_id, charity_id) DO UPDATE SET charity_name = EXCLUDED.charity_name,
         amount_cents = EXCLUDED.amount_cents, payee_email = EXCLUDED.payee_email, active = 1`,
      [randomUUID(), userId, i.charityId, i.charityName, i.amountCents, i.payeeEmail ?? null, now()],
    );
  }
}

export class LimitError extends Error {}

async function spentThisMonth(userId: string, month: string) {
  const [r] = await query<{ s: string | number | null }>(
    "SELECT COALESCE(SUM(amount_cents), 0) AS s FROM gw_payment WHERE user_id = $1 AND month = $2 AND status IN ('PENDING','COMPLETED')",
    [userId, month],
  );
  return Number(r?.s ?? 0);
}

export type PaymentResult = {
  charityId: string;
  charityName: string;
  amountCents: number;
  status: "COMPLETED" | "FAILED" | "BLOCKED" | "SKIPPED";
  orderId?: string | null;
  reason?: string;
};

/** Reserve → check the hard limit → charge → record. Never charges over the limit. */
async function charge(opts: {
  userId: string;
  vaultId: string;
  kind: "monthly" | "one-off";
  item: { charityId: string; charityName: string; amountCents: number; payeeEmail?: string | null };
  limitCents: number;
}): Promise<PaymentResult> {
  const { userId, vaultId, kind, item, limitCents } = opts;
  const id = randomUUID();
  const month = monthKey();
  const base = { charityId: item.charityId, charityName: item.charityName, amountCents: item.amountCents };

  await query(
    "INSERT INTO gw_payment (id, user_id, charity_id, charity_name, amount_cents, currency, kind, month, status, created_at) VALUES ($1,$2,$3,$4,$5,'USD',$6,$7,'PENDING',$8)",
    [id, userId, item.charityId, item.charityName, item.amountCents, kind, month, now()],
  );

  // The reserved row counts toward the total, so two requests at once can't both slip under the limit.
  const total = await spentThisMonth(userId, month);
  if (total > limitCents) {
    const reason = `This would take this month’s giving to $${(total / 100).toFixed(2)}, over your $${(limitCents / 100).toFixed(2)} limit.`;
    await query("UPDATE gw_payment SET status = 'BLOCKED', error = $2 WHERE id = $1", [id, reason]);
    return { ...base, status: "BLOCKED", reason };
  }

  try {
    const r = await chargeVault({
      vaultId,
      amountCents: item.amountCents,
      description: `GiveWise donation to ${item.charityName}`,
      customId: id,
      payeeEmail: item.payeeEmail || process.env.PAYPAL_DEMO_PAYEE_EMAIL || null,
      requestId: id,
    });
    if (r.status === "COMPLETED" && r.captureStatus !== "DECLINED") {
      await query("UPDATE gw_payment SET status = 'COMPLETED', order_id = $2, capture_id = $3 WHERE id = $1", [id, r.orderId, r.captureId]);
      return { ...base, status: "COMPLETED", orderId: r.orderId };
    }
    const reason = `PayPal returned “${r.status}”${r.captureStatus ? ` (${r.captureStatus})` : ""}.`;
    await query("UPDATE gw_payment SET status = 'FAILED', order_id = $2, error = $3 WHERE id = $1", [id, r.orderId, reason]);
    return { ...base, status: "FAILED", orderId: r.orderId, reason };
  } catch (e) {
    const reason = e instanceof PayPalError ? e.message : "Something went wrong reaching PayPal.";
    await query("UPDATE gw_payment SET status = 'FAILED', error = $2 WHERE id = $1", [id, reason]);
    return { ...base, status: "FAILED", reason };
  }
}

/** Payment day: one order per charity in the plan. `dedupe` skips charities already paid this month. */
export async function runPaymentDay(userId: string, opts: { dedupe: boolean }) {
  const conn = await getConnection(userId);
  if (!conn) throw new LimitError("Connect PayPal first. Nothing can be sent until you approve it.");
  const { hardLimitCents } = await getLimits(userId);
  const plan = await getPlan(userId);

  const planTotal = plan.items.reduce((s, i) => s + i.amountCents, 0);
  if (planTotal > hardLimitCents) {
    throw new LimitError(`Your plan is $${(planTotal / 100).toFixed(2)}, over your $${(hardLimitCents / 100).toFixed(2)} limit. Nothing was sent.`);
  }

  const month = monthKey();
  const results: PaymentResult[] = [];
  for (const item of plan.items) {
    if (opts.dedupe) {
      const [done] = await query<{ n: string | number }>(
        "SELECT COUNT(*) AS n FROM gw_payment WHERE user_id=$1 AND charity_id=$2 AND month=$3 AND kind='monthly' AND status IN ('PENDING','COMPLETED')",
        [userId, item.charityId, month],
      );
      if (Number(done?.n) > 0) {
        results.push({ charityId: item.charityId, charityName: item.charityName, amountCents: item.amountCents, status: "SKIPPED", reason: "Already paid this month." });
        continue;
      }
    }
    results.push(await charge({ userId, vaultId: conn.vaultId, kind: "monthly", item, limitCents: hardLimitCents }));
  }
  return results;
}

/** An extra one-off gift (e.g. an urgent appeal). Checked against the one-off limit and the monthly hard limit. */
export async function giveOnce(userId: string, item: { charityId: string; charityName: string; amountCents: number; payeeEmail?: string | null }) {
  const conn = await getConnection(userId);
  if (!conn) throw new LimitError("Connect PayPal first. Nothing can be sent until you approve it.");
  const limits = await getLimits(userId);
  if (item.amountCents > limits.oneOffLimitCents) {
    throw new LimitError(`One gift can be at most $${(limits.oneOffLimitCents / 100).toFixed(2)}.`);
  }
  return charge({ userId, vaultId: conn.vaultId, kind: "one-off", item, limitCents: limits.hardLimitCents });
}

export async function recentPayments(userId: string, limit = 20) {
  const rows = await query<{
    id: string; charity_name: string; amount_cents: number; kind: string; status: string;
    order_id: string | null; error: string | null; created_at: string;
  }>(
    "SELECT id, charity_name, amount_cents, kind, status, order_id, error, created_at FROM gw_payment WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit],
  );
  return rows.map((r) => ({
    id: r.id, charityName: r.charity_name, amountCents: Number(r.amount_cents), kind: r.kind,
    status: r.status, orderId: r.order_id, error: r.error, createdAt: r.created_at,
  }));
}

export async function givenThisMonth(userId: string) {
  return spentThisMonth(userId, monthKey());
}
