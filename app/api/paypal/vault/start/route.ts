import { query } from "@/lib/db";
import { PayPalError, createSetupToken } from "@/lib/paypal";
import { appOrigin, currentUser } from "@/lib/session";

/** Start "save PayPal without paying". Nothing is charged. Returns the PayPal page to send the donor to. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { to?: string; newTab?: boolean };
  const to = body.to === "plan" ? "plan" : "onboarding";
  const origin = appOrigin(req);
  // In a new tab, PayPal's tab ends on /paypal/done, which hands the result back to the GiveWise tab.
  const tab = body.newTab ? "&tab=1" : "";
  const cancelUrl = body.newTab ? `${origin}/paypal/done?paypal=cancelled&to=${to}` : `${origin}/${to}?paypal=cancelled`;

  try {
    const t = await createSetupToken({
      returnUrl: `${origin}/api/paypal/vault/return?to=${to}${tab}`,
      cancelUrl,
      requestId: crypto.randomUUID(),
    });
    await query(
      `INSERT INTO gw_setup_token (user_id, setup_token_id, created_at) VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET setup_token_id = EXCLUDED.setup_token_id, created_at = EXCLUDED.created_at`,
      [user.id, t.id, new Date().toISOString()],
    );
    return Response.json({ url: t.approveUrl });
  } catch (e) {
    if (e instanceof PayPalError) {
      console.error("[GiveWise] PayPal vault start failed:", e.status, e.code, e.message);
      return Response.json({ error: e.message, code: e.code }, { status: 502 });
    }
    throw e;
  }
}
