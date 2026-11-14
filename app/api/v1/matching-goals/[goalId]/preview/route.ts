import { createClient } from "@/lib/supabase/server";
import { previewPartner } from "@/lib/matching/http";

export async function GET(request: Request, context: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await context.params;
  const searchGoalId = new URL(request.url).searchParams.get("search_goal_id") ?? "";
  return previewPartner(await createClient(), searchGoalId, goalId);
}
