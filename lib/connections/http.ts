/**
 * US-08 — Send a session connection request.
 *
 * Pure functions that accept an injected SupabaseClient so they can be
 * unit-tested without a Next.js environment. The route handler in
 * app/api/v1/connections/route.ts is a thin wrapper around sendConnectionRequest.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ── constants ────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Subset of matching_goals columns needed for eligibility checking. */
const GOAL_FIELDS =
  "id,user_id,mode,institution_key,course_key,topic_key,assignment_id,is_listed,archived_at";

// ── types ────────────────────────────────────────────────────────────────────

type GoalRow = {
  id: string;
  user_id: string;
  mode: string;
  institution_key: string;
  course_key: string;
  topic_key: string;
  assignment_id: string | null;
  is_listed: boolean;
  archived_at: string | null;
};

export type ConnectionRequestBody = {
  goal_id: string;
  candidate_goal_id: string;
  session_topic: string;
  proposed_start: string;
  proposed_end: string;
  message?: string;
};

// ── errors ───────────────────────────────────────────────────────────────────

export class ConnectionRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly field_errors: { field: string; message: string }[] = []
  ) {
    super(message);
    this.name = "ConnectionRequestError";
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function reply(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function requireUUID(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new ConnectionRequestError(
      `A valid ${field} is required.`,
      "INVALID_INPUT",
      422,
      [{ field, message: `A valid ${field} is required.` }]
    );
  }
  return value;
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConnectionRequestError(
      `${field} is required.`,
      "MISSING_FIELD",
      422,
      [{ field, message: `${field} is required.` }]
    );
  }
  if (value.trim().length > max) {
    throw new ConnectionRequestError(
      `${field} must be ${max} characters or fewer.`,
      "FIELD_TOO_LONG",
      422,
      [{ field, message: `${field} must be ${max} characters or fewer.` }]
    );
  }
  return value.trim();
}

function requireISODatetime(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConnectionRequestError(
      `${field} is required.`,
      "MISSING_FIELD",
      422,
      [{ field, message: `${field} is required.` }]
    );
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ConnectionRequestError(
      `${field} must be a valid ISO date-time (e.g. 2026-11-15T14:00:00Z).`,
      "INVALID_DATETIME",
      422,
      [{ field, message: `${field} must be a valid ISO date-time.` }]
    );
  }
  return d.toISOString();
}

async function getAuthUserId(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.auth.getUser();
  return !error && data.user ? data.user.id : null;
}

// ── eligibility ──────────────────────────────────────────────────────────────

/**
 * Returns true when the candidate goal would appear in the requester's match
 * results. Mirrors the filters applied by findMatches / rankCandidates.
 */
export function isEligibleCandidate(own: GoalRow, candidate: GoalRow | null): boolean {
  if (!candidate) return false;
  if (!candidate.is_listed || candidate.archived_at) return false;
  if (candidate.user_id === own.user_id) return false;
  if (candidate.mode !== own.mode) return false;
  if (candidate.institution_key !== own.institution_key) return false;
  if (candidate.course_key !== own.course_key) return false;
  if (own.mode === "assignment") {
    return candidate.assignment_id === own.assignment_id;
  }
  return candidate.topic_key === own.topic_key;
}

// ── main handler ─────────────────────────────────────────────────────────────

export async function sendConnectionRequest(
  db: SupabaseClient,
  request: Request
): Promise<Response> {
  try {
    const userId = await getAuthUserId(db);
    if (!userId) {
      return reply({ error: "Sign in to send a connection request." }, 401);
    }

    // Parse body
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return reply({ error: "Invalid JSON body.", code: "INVALID_JSON" }, 422);
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return reply({ error: "A request object is required.", code: "INVALID_BODY" }, 422);
    }
    const v = raw as Record<string, unknown>;

    // Validate identifiers
    const goalId = requireUUID(v.goal_id, "goal_id");
    const candidateGoalId = requireUUID(v.candidate_goal_id, "candidate_goal_id");

    // Validate session proposal fields (AC2: time window required)
    const sessionTopic = requireString(v.session_topic, "session_topic", 200);
    const proposedStart = requireISODatetime(v.proposed_start, "proposed_start");
    const proposedEnd = requireISODatetime(v.proposed_end, "proposed_end");

    if (new Date(proposedEnd) <= new Date(proposedStart)) {
      throw new ConnectionRequestError(
        "proposed_end must be strictly after proposed_start.",
        "INVALID_TIME_WINDOW",
        422,
        [{ field: "proposed_end", message: "proposed_end must be strictly after proposed_start." }]
      );
    }

    const message =
      typeof v.message === "string" && v.message.trim()
        ? v.message.slice(0, 500).trim()
        : null;

    // Load requester's own goal — 404 if not found, foreign, or archived
    const { data: ownGoal, error: ownErr } = await db
      .from("matching_goals")
      .select(GOAL_FIELDS)
      .eq("id", goalId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle();
    if (ownErr) throw ownErr;
    if (!ownGoal) {
      return reply({ error: "Goal not found." }, 404);
    }

    // Load candidate's goal (must be listed and not archived for the RLS read to succeed)
    const { data: candidateGoal, error: candErr } = await db
      .from("matching_goals")
      .select(GOAL_FIELDS)
      .eq("id", candidateGoalId)
      .eq("is_listed", true)
      .is("archived_at", null)
      .maybeSingle();
    if (candErr) throw candErr;

    // AC2: candidate must pass the same eligibility filters as the matching engine
    if (!isEligibleCandidate(ownGoal as GoalRow, candidateGoal as GoalRow | null)) {
      return reply(
        {
          error: "Candidate is not in your current results for this goal.",
          code: "CANDIDATE_NOT_IN_RESULTS",
          field_errors: [
            {
              field: "candidate_goal_id",
              message: "Candidate is not in your current results for this goal.",
            },
          ],
        },
        422
      );
    }

    // Insert the connection request
    const { data: connection, error: insertErr } = await db
      .from("connections")
      .insert({
        requester_id: userId,
        receiver_id: (candidateGoal as GoalRow).user_id,
        status: "pending",
        session_topic: sessionTopic,
        proposed_start: proposedStart,
        proposed_end: proposedEnd,
        message,
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      // Unique constraint (requester_id, receiver_id) → one request per pair
      if (insertErr.code === "23505") {
        return reply(
          {
            error: "A connection request to this partner already exists.",
            code: "DUPLICATE_REQUEST",
          },
          409
        );
      }
      throw insertErr;
    }

    // AC1: response explicitly confirms recipient context, topic, and time window
    return reply(
      {
        id: (connection as { id: string }).id,
        status: "pending",
        session_topic: sessionTopic,
        proposed_start: proposedStart,
        proposed_end: proposedEnd,
      },
      201
    );
  } catch (error) {
    if (error instanceof ConnectionRequestError) {
      return reply(
        { error: error.message, code: error.code, field_errors: error.field_errors },
        error.status
      );
    }
    // Never expose DB internals
    return reply(
      { error: "Connection storage is unavailable. Please try again later." },
      503
    );
  }
}
