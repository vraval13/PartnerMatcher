import { createClient } from "@/lib/supabase/server";
import { cancelConnectionRequest, respondToConnectionRequest } from "@/lib/connections/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Context) {
  const { id } = await context.params;
  const db = await createClient();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).action
      : undefined;

  if (action === "accept" || action === "decline") {
    return respondToConnectionRequest(db, id, action);
  }
  return cancelConnectionRequest(db, id);
}
