import { createClient } from "@/lib/supabase/server";
import { archiveGoal, listGoals, saveGoal } from "@/lib/matching/http";
export async function GET() {
  return listGoals(await createClient());
}
export async function POST(request: Request) {
  return saveGoal(await createClient(), request);
}
export async function DELETE(request: Request) {
  return archiveGoal(await createClient(), request);
}
