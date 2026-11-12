import type { SupabaseClient } from "@supabase/supabase-js";
import { reply } from "./http";

async function authenticatedUserId(db: SupabaseClient) {
  const { data, error } = await db.auth.getUser();
  return !error && data.user ? data.user.id : null;
}

function unavailable() {
  return reply(
    { error: "Matching status is unavailable. Apply the US-16 migration, then retry." },
    503
  );
}

export async function getMatchingStatus(db: SupabaseClient) {
  const userId = await authenticatedUserId(db);
  if (!userId) return reply({ error: "Sign in to view matching status." }, 401);

  const { data, error } = await db
    .from("profiles")
    .select("matching_paused")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return unavailable();
  if (!data) return reply({ error: "Profile not found." }, 404);
  return reply({ paused: data.matching_paused });
}

export async function setMatchingStatus(db: SupabaseClient, request: Request) {
  const userId = await authenticatedUserId(db);
  if (!userId) return reply({ error: "Sign in to update matching status." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid JSON body.", code: "INVALID_JSON" }, 422);
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>).paused !== "boolean"
  )
    return reply(
      {
        error: "paused must be true or false.",
        code: "INVALID_MATCHING_STATUS",
        field_errors: [{ field: "paused", message: "Choose whether matching is paused." }],
      },
      422
    );

  const paused = (body as { paused: boolean }).paused;
  const { data, error } = await db
    .from("profiles")
    .update({ matching_paused: paused })
    .eq("user_id", userId)
    .select("matching_paused")
    .maybeSingle();
  if (error) return unavailable();
  if (!data) return reply({ error: "Profile not found." }, 404);
  return reply({ paused: data.matching_paused });
}
