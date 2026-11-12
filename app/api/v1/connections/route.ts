import { createClient } from "@/lib/supabase/server";
import { sendConnectionRequest, getReceivedRequests } from "@/lib/connections/http";

export async function GET() {
  return getReceivedRequests(await createClient());
}

export async function POST(request: Request) {
  return sendConnectionRequest(await createClient(), request);
}
