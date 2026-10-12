import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getMigrations } from "better-auth/db/migration";
import { sendEmail } from "./email";
import { authDatabase, ensureAppTables } from "./db";

/**
 * GiveWise accounts.
 * - Email + password always works.
 * - Google and "Log in with PayPal" switch on when their keys are in .env.local.
 * - Data: Postgres (Supabase) when DATABASE_URL is set, which is what Vercel needs.
 *   With no DATABASE_URL it falls back to a local SQLite file (givewise.db).
 */
const env = process.env;

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const options = {
  appName: "GiveWise",
  baseURL: env.BETTER_AUTH_URL,
  // Local runs: accept whichever port Next picked (3000, 3001, …).
  // Plus the public URL (ngrok / deploy) from BETTER_AUTH_URL, so no code edit when it changes.
  trustedOrigins: [
    ...Array.from({ length: 10 }, (_, i) => `http://localhost:${3000 + i}`),
    ...(env.BETTER_AUTH_URL ? [new URL(env.BETTER_AUTH_URL).origin] : []),
  ],
  secret: env.BETTER_AUTH_SECRET,
  database: authDatabase(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // Awaited so serverless doesn’t freeze before the email is sent.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your GiveWise password",
        text: `Hi ${user.name || "there"},\n\nUse this link to choose a new password. It works for one hour:\n${url}\n\nIf you didn’t ask for this, you can ignore this email. Nothing changes until you use the link.\n\nGiveWise`,
        html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Use this link to choose a new password. It works for one hour.</p><p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0B7A5A;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p><p style="color:#555;font-size:13px">If you didn’t ask for this, you can ignore this email. Nothing changes until you use the link.</p><p>GiveWise</p>`,
      });
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET
      ? {
          paypal: {
            clientId: env.PAYPAL_CLIENT_ID,
            clientSecret: env.PAYPAL_CLIENT_SECRET,
            environment: env.PAYPAL_ENV === "live" ? ("live" as const) : ("sandbox" as const),
            // Better Auth's PayPal provider sends no `scope`, and PayPal rejects that.
            // Put it in the authorize URL ourselves (matches Full name + Email in the PayPal app).
            authorizationEndpoint: `https://www.${env.PAYPAL_ENV === "live" ? "" : "sandbox."}paypal.com/signin/authorize?scope=${encodeURIComponent("openid profile email")}`,
          },
        }
      : {}),
  },
  account: {
    // Same email via PayPal/Google and password = one GiveWise account.
    accountLinking: { enabled: true, trustedProviders: ["google", "paypal"] },
  },
  user: {
    additionalFields: {
      // Finished Pip's setup? Drives first-login onboarding and the Settings notice.
      onboarded: { type: "boolean", defaultValue: false, input: false },
    },
  },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(options);

/** Which sign-in buttons should actually work. */
export const providers = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
};

// Create/upgrade the tables on first use, so there's no separate migrate step.
let ready: Promise<void> | null = null;
export function ensureDb() {
  ready ??= getMigrations(options)
    .then((m) => m.runMigrations())
    .then(() => ensureAppTables());
  return ready;
}

// Create tables as soon as the server starts.
ensureDb().catch((e) => console.error("[GiveWise] database setup failed:", e));
