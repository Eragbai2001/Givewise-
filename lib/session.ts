import "server-only";
import { auth, ensureDb } from "./auth";

/** The signed-in user for an API route, or null. Also makes sure the tables exist. */
export async function currentUser(req: Request) {
  await ensureDb();
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

/** Public origin of the app, e.g. https://givewise-seven.vercel.app */
export function appOrigin(req?: Request) {
  const base = process.env.BETTER_AUTH_URL;
  if (base) return new URL(base).origin;
  return req ? new URL(req.url).origin : "http://localhost:3000";
}
