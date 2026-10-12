import { headers } from "next/headers";
import { auth, ensureDb, providers } from "@/lib/auth";

type U = { id: string; name: string; email: string; image?: string | null; onboarded?: boolean };

/** Current user (or null) plus which social sign-ins are configured. */
export async function GET() {
  await ensureDb();
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as U | undefined;
  return Response.json({
    user: u ? { id: u.id, name: u.name, email: u.email, image: u.image ?? null, onboarded: Boolean(u.onboarded) } : null,
    providers,
  });
}

/** Mark onboarding finished for the signed-in user. */
export async function POST() {
  await ensureDb();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const ctx = await auth.$context;
  await ctx.internalAdapter.updateUser(session.user.id, { onboarded: true });
  return Response.json({ ok: true });
}
