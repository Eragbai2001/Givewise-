import "server-only";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";

/**
 * One database handle for the whole server (Better Auth and our own tables).
 * Postgres (Supabase) when DATABASE_URL is set, otherwise a local SQLite file.
 * Our own SQL uses $1, $2… placeholders; they're rewritten for SQLite.
 */
type Handle = { kind: "pg"; pool: Pool } | { kind: "sqlite"; db: DatabaseSync };
const g = globalThis as unknown as { __gwDb?: Handle };

function open(): Handle {
  const url = process.env.DATABASE_URL;
  if (!url) return { kind: "sqlite", db: new DatabaseSync(process.env.DATABASE_FILE ?? "givewise.db") };
  // Supabase's pooled string (port 6543) so serverless functions don't exhaust connections.
  const clean = url.replace(/[?&]sslmode=[^&]*/g, "");
  const local = /localhost|127\.0\.0\.1/.test(clean);
  return { kind: "pg", pool: new Pool({ connectionString: clean, max: 3, ssl: local ? undefined : { rejectUnauthorized: false } }) };
}

const handle = (g.__gwDb ??= open());

/** What Better Auth should be given as `database`. */
export const authDatabase = () => (handle.kind === "pg" ? handle.pool : handle.db);

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (handle.kind === "pg") return (await handle.pool.query(sql, params)).rows as T[];
  const lite = sql.replace(/\$(\d+)/g, "?$1");
  return handle.db.prepare(lite).all(...(params as never[])) as T[];
}

let tables: Promise<void> | null = null;
/** Create GiveWise's own tables on first use. Money is always stored as integer cents. */
export function ensureAppTables() {
  tables ??= (async () => {
    const ddl = [
      `CREATE TABLE IF NOT EXISTS gw_payment_method (
         id TEXT PRIMARY KEY, user_id TEXT NOT NULL, vault_id TEXT NOT NULL, customer_id TEXT,
         paypal_email TEXT, revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS gw_setup_token (
         user_id TEXT PRIMARY KEY, setup_token_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS gw_plan_item (
         id TEXT PRIMARY KEY, user_id TEXT NOT NULL, charity_id TEXT NOT NULL, charity_name TEXT NOT NULL,
         amount_cents INTEGER NOT NULL, payee_email TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
         UNIQUE (user_id, charity_id))`,
      `CREATE TABLE IF NOT EXISTS gw_setting (
         user_id TEXT PRIMARY KEY, hard_limit_cents INTEGER NOT NULL, one_off_limit_cents INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS gw_payment (
         id TEXT PRIMARY KEY, user_id TEXT NOT NULL, charity_id TEXT NOT NULL, charity_name TEXT NOT NULL,
         amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', kind TEXT NOT NULL,
         month TEXT NOT NULL, status TEXT NOT NULL, order_id TEXT, capture_id TEXT, error TEXT, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS gw_pip_cache (
         key TEXT PRIMARY KEY, result TEXT NOT NULL, created_at TEXT NOT NULL)`,
    ];
    for (const s of ddl) await query(s);
  })();
  return tables;
}
