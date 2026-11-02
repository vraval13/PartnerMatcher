import { createClient } from "@/lib/supabase/server";
import { createAvailability, listAvailability } from "@/lib/availability/http";

type Context = { params: Promise<{ goalId: string }> };

export async function GET(_request: Request, context: Context) {
  const { goalId } = await context.params;
  return listAvailability(await createClient(), goalId);
}

export async function POST(request: Request, context: Context) {
  const { goalId } = await context.params;
  return createAvailability(await createClient(), goalId, request);
}
