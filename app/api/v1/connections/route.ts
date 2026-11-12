import { createClient } from "@/lib/supabase/server";
import { sendConnectionRequest } from "@/lib/connections/http";

export async function POST(request: Request) {
  return sendConnectionRequest(await createClient(), request);
}
