import { LimitError, runPaymentDay } from "@/lib/payments";
import { currentUser } from "@/lib/session";

/** Demo button: run payment day right now for the signed-in donor. Always bounded by their hard limit. */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  try {
    const results = await runPaymentDay(user.id, { dedupe: false });
    return Response.json({ results });
  } catch (e) {
    if (e instanceof LimitError) return Response.json({ error: e.message }, { status: 409 });
    console.error("[GiveWise] payment day failed:", e);
    return Response.json({ error: "Payment day couldn’t run. Nothing was sent." }, { status: 500 });
  }
}
