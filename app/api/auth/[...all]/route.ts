import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureDb } from "@/lib/auth";

const h = toNextJsHandler(auth);

export async function GET(req: Request) {
  await ensureDb();
  return h.GET(req);
}
export async function POST(req: Request) {
  await ensureDb();
  return h.POST(req);
}
