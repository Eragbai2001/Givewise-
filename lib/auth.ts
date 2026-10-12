import "server-only";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getMigrations } from "better-auth/db/migration";

/**
 * GiveWise accounts.
 * - Email + password always works.
 * - Google and "Log in with PayPal" switch on when their keys are in .env.local.
 * - Data: Postgres (Supabase) when DATABASE_URL is set, which is what Vercel needs.
 *   With no DATABASE_URL it falls back to a local SQLite file (givewise.db).
 */
const env = process.env;

function makeDatabase() {
  const url = env.DATABASE_URL;
  if (!url) {
    // Node’s built-in SQLite (Node 22.13+): nothing to compile or install.
    return new DatabaseSync(env.DATABASE_FILE ?? "givewise.db");
  }
  // Use Supabase's pooled connection string (port 6543) so serverless functions don't exhaust connections.
  const clean = url.replace(/[?&]sslmode=[^&]*/g, "");
  const local = /localhost|127\.0\.0\.1/.test(clean);
  return new Pool({
    connectionString: clean,
    max: 3,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
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
  database: makeDatabase(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
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
  ready ??= getMigrations(options).then((m) => m.runMigrations());
  return ready;
}

// Create tables as soon as the server starts.
ensureDb().catch((e) => console.error("[GiveWise] database setup failed:", e));
