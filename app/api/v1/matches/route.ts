import { createClient } from "@/lib/supabase/server";
import { findMatches } from "@/lib/matching/http";
export async function POST(request: Request) {
  return findMatches(await createClient(), request);
}
