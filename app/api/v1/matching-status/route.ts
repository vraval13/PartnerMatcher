import { createClient } from "@/lib/supabase/server";
import { getMatchingStatus, setMatchingStatus } from "@/lib/matching/status";

export async function GET() {
  return getMatchingStatus(await createClient());
}

export async function PATCH(request: Request) {
  return setMatchingStatus(await createClient(), request);
}
