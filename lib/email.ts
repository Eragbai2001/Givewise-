import "server-only";

/**
 * Sends one email through Resend's REST API (no extra package).
 * Needs RESEND_API_KEY. Until a domain is verified in Resend, set EMAIL_FROM to the
 * default sender below and Resend only delivers to the account owner's own address.
 */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[GiveWise] RESEND_API_KEY is not set, so no email was sent to", to);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "GiveWise <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[GiveWise] Resend refused the email:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}
