import { query } from "@/lib/db";
import { saveConnection } from "@/lib/payments";
import { PayPalError, createPaymentToken } from "@/lib/paypal";
import { appOrigin, currentUser } from "@/lib/session";

/** PayPal sends the donor back here after they approve. We turn the approval into a saved payment token. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const to = url.searchParams.get("to") === "plan" ? "plan" : "onboarding";
  const back = (q: string) => Response.redirect(`${origin}/${to}?${q}`, 303);

  const user = await currentUser(req);
  if (!user) return Response.redirect(`${origin}/login`, 303);

  const approved = url.searchParams.get("approval_token_id");
  const [stored] = await query<{ setup_token_id: string }>("SELECT setup_token_id FROM gw_setup_token WHERE user_id = $1", [user.id]);
  // The token PayPal hands back must be the one we started for this same donor.
  if (!approved || !stored || stored.setup_token_id !== approved) return back("paypal=error&msg=" + encodeURIComponent("That PayPal approval didn’t match. Please try again."));

  try {
    const t = await createPaymentToken(approved);
    await saveConnection(user.id, t.vaultId, t.customerId, t.email);
    await query("DELETE FROM gw_setup_token WHERE user_id = $1", [user.id]);
    return back("paypal=connected");
  } catch (e) {
    const msg = e instanceof PayPalError ? e.message : "Couldn’t finish connecting PayPal.";
    console.error("[GiveWise] PayPal vault return failed:", msg);
    return back("paypal=error&msg=" + encodeURIComponent(msg.slice(0, 160)));
  }
}
