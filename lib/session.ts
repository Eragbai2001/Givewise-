import "server-only";
import { auth, ensureDb, publicOrigins } from "./auth";

/** The signed-in user for an API route, or null. Also makes sure the tables exist. */
export async function currentUser(req: Request) {
  await ensureDb();
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

/**
 * Public origin of the app for PayPal return links. Stays on the address the donor is using
 * (givewithpip.com or the Vercel backup), so they come back to the same login cookie.
 */
export function appOrigin(req?: Request) {
  if (req) {
    const here = new URL(req.url).origin;
    if (publicOrigins().includes(here)) return here;
  }
  const base = process.env.BETTER_AUTH_URL;
  if (base) return new URL(base).origin;
  return req ? new URL(req.url).origin : "http://localhost:3000";
}
