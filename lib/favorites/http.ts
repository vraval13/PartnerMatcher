import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reply(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function getUserId(db: SupabaseClient) {
  const { data, error } = await db.auth.getUser();
  return !error && data.user ? data.user.id : null;
}

export async function listFavorites(db: SupabaseClient) {
  try {
    const userId = await getUserId(db);
    if (!userId) return reply({ error: "Sign in to view favorites." }, 401);

    const { data, error } = await db
      .from("favorite_partners")
      .select("favorite_user_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ids = (data ?? []).map((item) => item.favorite_user_id);
    const goalsByUser: Record<string, { id: string; display_name: string }[]> = {};

    if (ids.length > 0) {
      const { data: goals, error: goalsError } = await db
        .from("matching_goals")
        .select("id,user_id,display_name")
        .in("user_id", ids)
        .eq("is_listed", true)
        .is("archived_at", null);

      if (goalsError) throw goalsError;

      (goals ?? []).forEach((goal) => {
        if (!goalsByUser[goal.user_id]) goalsByUser[goal.user_id] = [];
        goalsByUser[goal.user_id].push({
          id: goal.id,
          display_name: goal.display_name,
        });
      });
    }

    return reply({
      favorites: (data ?? []).map((item) => {
        const goals = goalsByUser[item.favorite_user_id] ?? [];
        return {
          display_name: goals[0]?.display_name ?? "A student",
          candidate_goal_ids: goals.map((goal) => goal.id),
          created_at: item.created_at,
        };
      }),
    });
  } catch {
    return reply({ error: "Unable to load favorites. Please try again." }, 503);
  }
}

export async function addFavorite(db: SupabaseClient, request: Request) {
  try {
    const userId = await getUserId(db);
    if (!userId) return reply({ error: "Sign in to save favorites." }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply({ error: "Invalid JSON body." }, 422);
    }

    const candidateGoalId =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).candidate_goal_id
        : null;

    if (typeof candidateGoalId !== "string" || !UUID.test(candidateGoalId)) {
      return reply({ error: "A valid candidate_goal_id is required." }, 422);
    }

    const { data: candidate, error: candidateError } = await db
      .from("matching_goals")
      .select("id,user_id,is_listed,archived_at")
      .eq("id", candidateGoalId)
      .eq("is_listed", true)
      .is("archived_at", null)
      .maybeSingle();

    if (candidateError) throw candidateError;

    if (!candidate || candidate.user_id === userId) {
      return reply({ error: "This student is not available to favorite." }, 404);
    }

    const { error: insertError } = await db.from("favorite_partners").insert({
      user_id: userId,
      favorite_user_id: candidate.user_id,
    });

    if (insertError?.code === "23505") {
      return reply({
        message: "This student is already in your favorites.",
        already_saved: true,
      });
    }

    if (insertError) throw insertError;

    return reply({ message: "Student added to favorites.", already_saved: false }, 201);
  } catch {
    return reply({ error: "Unable to save favorite. Please try again." }, 503);
  }
}

export async function removeFavorite(db: SupabaseClient, request: Request) {
  try {
    const userId = await getUserId(db);
    if (!userId) return reply({ error: "Sign in to manage favorites." }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply({ error: "Invalid JSON body." }, 422);
    }

    const candidateGoalId =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).candidate_goal_id
        : null;

    if (typeof candidateGoalId !== "string" || !UUID.test(candidateGoalId)) {
      return reply({ error: "A valid candidate_goal_id is required." }, 422);
    }

    const { data: candidate, error: candidateError } = await db
      .from("matching_goals")
      .select("user_id")
      .eq("id", candidateGoalId)
      .maybeSingle();

    if (candidateError) throw candidateError;
    if (!candidate || candidate.user_id === userId) {
      return reply({ error: "Favorite not found." }, 404);
    }

    const { data, error } = await db
      .from("favorite_partners")
      .delete()
      .eq("user_id", userId)
      .eq("favorite_user_id", candidate.user_id)
      .select("favorite_user_id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return reply({ error: "Favorite not found." }, 404);

    return reply({ message: "Student removed from favorites." });
  } catch {
    return reply({ error: "Unable to remove favorite. Please try again." }, 503);
  }
}
