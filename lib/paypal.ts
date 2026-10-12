import "server-only";

/**
 * PayPal REST client: Vault (save PayPal without charging) + Orders v2.
 * Nothing here ever sees a card or bank number. Payments go from the donor's PayPal to the charity.
 */
const LIVE = process.env.PAYPAL_ENV === "live";
const BASE = LIVE ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

let cached: { token: string; exp: number } | null = null;
async function accessToken() {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new PayPalError(500, "NOT_CONFIGURED", "PayPal keys are missing.");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PayPalError(res.status, "AUTH_FAILED", data.error_description ?? "PayPal rejected the app keys.");
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function call<T>(path: string, init: { method?: string; body?: unknown; requestId?: string } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = data.details?.[0]?.description ?? data.message ?? res.statusText;
    throw new PayPalError(res.status, data.name ?? "PAYPAL_ERROR", String(issue), data.details);
  }
  return data as T;
}

type Link = { rel: string; href: string };

/** Step 1 of "save without paying": returns the PayPal page the donor approves on. */
export async function createSetupToken(opts: { returnUrl: string; cancelUrl: string; requestId: string }) {
  const r = await call<{ id: string; links?: Link[] }>("/v3/vault/setup-tokens", {
    requestId: opts.requestId,
    body: {
      payment_source: {
        paypal: {
          usage_type: "MERCHANT",
          usage_pattern: "RECURRING_POSTPAID",
          experience_context: {
            brand_name: "GiveWise",
            return_url: opts.returnUrl,
            cancel_url: opts.cancelUrl,
            vault_instruction: "ON_CREATE_PAYMENT_TOKENS",
          },
        },
      },
    },
  });
  const approve = r.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!approve) throw new PayPalError(502, "NO_APPROVE_LINK", "PayPal didn’t return an approval link.");
  return { id: r.id, approveUrl: approve };
}

/** Step 2: after approval, turn the setup token into a reusable payment token. */
export async function createPaymentToken(setupTokenId: string) {
  const r = await call<{
    id: string;
    customer?: { id?: string };
    payment_source?: { paypal?: { email_address?: string } };
  }>("/v3/vault/payment-tokens", { body: { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } } });
  return { vaultId: r.id, customerId: r.customer?.id ?? null, email: r.payment_source?.paypal?.email_address ?? null };
}

/** One donation to one charity using the saved payment token. Safe to retry with the same requestId. */
export async function chargeVault(opts: {
  vaultId: string;
  amountCents: number;
  description: string;
  customId: string;
  payeeEmail?: string | null;
  requestId: string;
}) {
  const r = await call<{
    id: string;
    status: string;
    purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
  }>("/v2/checkout/orders", {
    requestId: opts.requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: opts.customId,
          description: opts.description.slice(0, 127),
          amount: { currency_code: "USD", value: (opts.amountCents / 100).toFixed(2) },
          ...(opts.payeeEmail ? { payee: { email_address: opts.payeeEmail } } : {}),
        },
      ],
      payment_source: {
        paypal: {
          vault_id: opts.vaultId,
          stored_credential: { payment_initiator: "MERCHANT", usage: "SUBSEQUENT", usage_pattern: "RECURRING_POSTPAID" },
        },
      },
    },
  });
  const cap = r.purchase_units?.[0]?.payments?.captures?.[0];
  return { orderId: r.id, status: r.status, captureId: cap?.id ?? null, captureStatus: cap?.status ?? null };
}

/** Webhook authenticity check (PayPal verifies its own signature for us). */
export async function verifyWebhook(headers: Headers, rawBody: string, webhookId: string) {
  const r = await call<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    },
  });
  return r.verification_status === "SUCCESS";
}
