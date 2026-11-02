import { createClient } from "@/lib/supabase/server";
import { deleteAvailability, updateAvailability } from "@/lib/availability/http";

type Context = { params: Promise<{ goalId: string; slotId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { goalId, slotId } = await context.params;
  return updateAvailability(await createClient(), goalId, slotId, request);
}

export async function DELETE(_request: Request, context: Context) {
  const { goalId, slotId } = await context.params;
  return deleteAvailability(await createClient(), goalId, slotId);
}
