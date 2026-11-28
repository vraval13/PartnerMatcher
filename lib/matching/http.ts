import type { SupabaseClient } from "@supabase/supabase-js";
import {
  rankCandidates,
  normalized,
  validatePrepWindow,
  TimezoneValidationError,
  validateGoal,
  ValidationError,
  type Goal,
  type Slot,
} from "./engine";
import { MatchingInformationError } from "./information";

export type DBGoal = Omit<Goal, "availability"> & { matching_availability: Slot[] };
export const matchingGoalSelection =
  "id,user_id,information_version,category,subject_or_skill,proficiency_level,exam_date,prep_start,prep_end,mode,display_name,institution,course_code,topic,assignment_id,due_date,timezone,location_preference,location,is_listed,archived_at,matching_availability(weekday,start_time,end_time,timezone)";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function goal(row: DBGoal): Goal {
  const { matching_availability, ...fields } = row;
  return {
    ...fields,
    information_version: fields.information_version ?? 1,
    category: fields.category ?? null,
    subject_or_skill: fields.subject_or_skill ?? null,
    proficiency_level: fields.proficiency_level ?? null,
    availability: matching_availability.map((s) => ({
      ...s,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    })),
  };
}
export function reply(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
function failure(error: unknown): Response {
  if (error instanceof MatchingInformationError)
    return reply({ error: error.message, code: error.code, field_errors: error.field_errors }, 422);
  if (error instanceof TimezoneValidationError)
    return reply({ error: error.message, code: error.code, field_errors: error.field_errors }, 422);
  if (error instanceof ValidationError || error instanceof SyntaxError)
    return reply(
      {
        error: error instanceof SyntaxError ? "Invalid JSON body." : error.message,
        code: error instanceof SyntaxError ? "INVALID_JSON" : "INVALID_GOAL",
        field_errors: [],
      },
      422
    );
  // Do not expose database details or account identifiers to clients.
  return reply(
    {
      error:
        "Matching storage is unavailable. Ask your team administrator to apply the matching database migrations, then retry.",
    },
    503
  );
}
async function userId(db: SupabaseClient) {
  const { data, error } = await db.auth.getUser();
  return !error && data.user ? data.user.id : null;
}
export async function listGoals(db: SupabaseClient) {
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to manage matching goals." }, 401);
    const { data, error } = await db
      .from("matching_goals")
      .select(matchingGoalSelection)
      .eq("user_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return reply({ goals: (data as DBGoal[]).map(goal) });
  } catch (error) {
    return failure(error);
  }
}
export async function saveGoal(db: SupabaseClient, request: Request, now = new Date()) {
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to save a matching goal." }, 401);
    const body: unknown = await request.json();
    const input = validateGoal(
      body && typeof body === "object" && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), information_version: 2 }
        : body,
      now
    );
    const { data, error } = await db.rpc("create_matching_goal", {
      payload: input,
    });
    if (error) throw error;
    return reply({ id: data }, 201);
  } catch (error) {
    return failure(error);
  }
}
export async function archiveGoal(db: SupabaseClient, request: Request) {
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to remove a goal." }, 401);
    const body = await request.json();
    if (!uuid.test(body?.goal_id ?? "")) throw new ValidationError("A valid goal_id is required.");
    const { data, error } = await db
      .from("matching_goals")
      .update({ archived_at: new Date().toISOString(), is_listed: false })
      .eq("id", body.goal_id)
      .eq("user_id", id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data ? reply({ id: data.id, archived: true }) : reply({ error: "Goal not found." }, 404);
  } catch (error) {
    return failure(error);
  }
}
export async function findMatches(db: SupabaseClient, request: Request, now = new Date()) {
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to find partners." }, 401);
    const body = await request.json();
    if (!uuid.test(body?.goal_id ?? "")) throw new ValidationError("A valid goal_id is required.");
    // Explicit ownership filter even though listed candidate goals are readable under RLS.
    const own = await db
      .from("matching_goals")
      .select(matchingGoalSelection)
      .eq("id", body.goal_id)
      .eq("user_id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (own.error) throw own.error;
    if (!own.data) return reply({ error: "Goal not found." }, 404);
    const query = goal(own.data as DBGoal);
    validateGoal(query, now);
    const candidates = db
      .from("matching_goals")
      .select(matchingGoalSelection)
      .eq("is_listed", true)
      .is("archived_at", null)
      .neq("user_id", id);
    const exam = query.category === "exam_prep";
    const practice = query.category === "skill_practice";
    let fetch;
    if (exam) {
      fetch = candidates
        .eq("information_version", 2)
        .eq("category", "exam_prep")
        .eq("exam_date", query.exam_date!)
        .eq("subject_or_skill_key", normalized(query.subject_or_skill));
    } else if (practice) {
      fetch = candidates
        .eq("information_version", 2)
        .eq("category", "skill_practice")
        .eq("subject_or_skill_key", normalized(query.subject_or_skill));
    } else {
      fetch = candidates
        .eq("mode", query.mode)
        .eq("institution_key", normalized(query.institution))
        .eq("course_key", normalized(query.course_code));
      fetch =
        query.mode === "assignment"
          ? fetch.eq("assignment_id", query.assignment_id!)
          : fetch.eq("topic_key", normalized(query.topic));
    }
    // Fetch one over the supported cap; never silently rank an incomplete candidate set.
    const { data, error } = await fetch.order("id").limit(1000);
    if (error) throw error;
    if (data.length > 999)
      return reply(
        {
          error:
            "Too many eligible goals. Please contact the team to increase the matching capacity.",
        },
        422
      );
    const matches = rankCandidates(query, (data as DBGoal[]).map(goal), now);
    return reply({
      matches,
      message: matches.length
        ? `${matches.length} suitable match(es) found.`
        : "No suitable match was found.",
      as_of: now.toISOString(),
      search_horizon_days: exam ? null : 14,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function updateExamDates(db: SupabaseClient, request: Request) {
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to update your goal." }, 401);
    const body = await request.json();
    if (!body || !uuid.test(body.goal_id ?? ""))
      throw new ValidationError("A valid goal_id is required.");
    const dates = validatePrepWindow(body);
    const { data, error } = await db
      .from("matching_goals")
      .update(dates)
      .eq("id", body.goal_id)
      .eq("user_id", id)
      .eq("category", "exam_prep")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data ? reply({ id: data.id }) : reply({ error: "Exam goal not found." }, 404);
  } catch (error) {
    return failure(error);
  }
}

export async function previewPartner(
  db: SupabaseClient,
  searchGoalId: string,
  candidateGoalId: string,
  now = new Date()
) {
  const unavailable = () =>
    reply(
      { error: "This profile is no longer available for matching.", code: "PROFILE_UNAVAILABLE" },
      404
    );
  try {
    const id = await userId(db);
    if (!id) return reply({ error: "Sign in to view partner profiles." }, 401);
    if (!uuid.test(searchGoalId) || !uuid.test(candidateGoalId)) return unavailable();
    const own = await db
      .from("matching_goals")
      .select(matchingGoalSelection)
      .eq("id", searchGoalId)
      .eq("user_id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (own.error) throw own.error;
    if (!own.data) return unavailable();
    const other = await db
      .from("matching_goals")
      .select(matchingGoalSelection)
      .eq("id", candidateGoalId)
      .eq("is_listed", true)
      .is("archived_at", null)
      .maybeSingle();
    if (other.error) throw other.error;
    if (!other.data) return unavailable();
    const candidate = goal(other.data as DBGoal);
    const [match] = rankCandidates(goal(own.data as DBGoal), [candidate], now);
    if (!match) return unavailable();     const { data: paused, error: pauseError } = await db.rpc("matching_goal_is_paused", {       search_goal_id: searchGoalId,       candidate_goal_id: candidateGoalId,     });     if (pauseError) throw pauseError;     if (paused) return unavailable();
    return reply({
      profile: {
        display_name: candidate.display_name,
        subject_or_skill: candidate.subject_or_skill ?? candidate.topic,
        category: candidate.category ?? "course",
        learning_goal: candidate.assignment_id ?? candidate.topic ?? candidate.subject_or_skill,
        proficiency_level: candidate.proficiency_level,
        course_code: candidate.course_code,
        exam_date: candidate.exam_date ?? null,
        overlapping_slots: match.overlapping_slots,
      },
    });
  } catch (error) {
    return error instanceof ValidationError || error instanceof MatchingInformationError
      ? unavailable()
      : failure(error);
  }
}
