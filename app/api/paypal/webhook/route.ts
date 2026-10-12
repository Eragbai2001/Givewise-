import { query } from "@/lib/db";
import { ensureDb } from "@/lib/auth";
import { verifyWebhook } from "@/lib/paypal";

/**
 * PayPal webhooks: failed or reversed payments, and revoked PayPal approvals.
 * Needs PAYPAL_WEBHOOK_ID (Developer dashboard → your app → Webhooks). Unsigned calls are refused.
 */
export async function POST(req: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return Response.json({ error: "Webhook not configured." }, { status: 503 });

  const raw = await req.text();
  let ok = false;
  try {
    ok = await verifyWebhook(req.headers, raw, webhookId);
  } catch {
    ok = false;
  }
  if (!ok) return Response.json({ error: "Bad signature." }, { status: 400 });

  await ensureDb();
  const event = JSON.parse(raw) as { event_type: string; resource?: { id?: string; custom_id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
  const r = event.resource ?? {};
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
    case "PAYMENT.CAPTURE.REVERSED":
    case "PAYMENT.CAPTURE.REFUNDED":
      // Our own payment id travels as custom_id on the order.
      if (r.custom_id) await query("UPDATE gw_payment SET status = 'FAILED', error = $2 WHERE id = $1", [r.custom_id, event.event_type]);
      break;
    case "PAYMENT.CAPTURE.COMPLETED":
      if (r.custom_id) await query("UPDATE gw_payment SET status = 'COMPLETED', capture_id = $2 WHERE id = $1", [r.custom_id, r.id ?? null]);
      break;
    case "VAULT.PAYMENT-TOKEN.DELETED":
    case "VAULT.PAYMENT-TOKEN.REVOKED":
      if (r.id) await query("UPDATE gw_payment_method SET revoked = 1 WHERE vault_id = $1", [r.id]);
      break;
  }
  return Response.json({ ok: true });
}
