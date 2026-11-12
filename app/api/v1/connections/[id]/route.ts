import { createClient } from "@/lib/supabase/server";
import { cancelConnectionRequest } from "@/lib/connections/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, context: Context) {
  const { id } = await context.params;
  return cancelConnectionRequest(await createClient(), id);
}
