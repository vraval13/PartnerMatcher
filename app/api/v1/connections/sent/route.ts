import { createClient } from "@/lib/supabase/server";
import { getSentRequests } from "@/lib/connections/http";

export async function GET() {
  return getSentRequests(await createClient());
}
