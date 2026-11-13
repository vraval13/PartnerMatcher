/**
 * US-08 — Send a session connection request.
 * US-11 — View received connection requests.
 *
 * Pure functions that accept an injected SupabaseClient so they can be
 * unit-tested without a Next.js environment. The route handler in
 * app/api/v1/connections/route.ts wraps both.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ── constants ────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Subset of matching_goals columns needed for eligibility checking. */
const GOAL_FIELDS =
  "id,user_id,information_version,category,subject_or_skill_key,mode,institution_key,course_key,topic_key,assignment_id,is_listed,archived_at";

// ── types ────────────────────────────────────────────────────────────────────

type GoalRow = {
  id: string;
  user_id: string;
  information_version: number;
  category: string | null;
  subject_or_skill_key: string | null;
  mode: string | null;
  institution_key: string | null;
  course_key: string | null;
  topic_key: string | null;
  assignment_id: string | null;
  is_listed: boolean;
  archived_at: string | null;
};

// DB migration required before deploying: ALTER TYPE connection_status_enum ADD VALUE 'cancelled';
export type ConnectionStatus = "pending" | "accepted" | "rejected" | "blocked" | "cancelled";

export type ReceivedRequest = {
  id: string;
  requester_id: string;
  requester_display_name: string | null;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  message: string | null;
  status: ConnectionStatus;
  created_at: string;
};

export type SentRequest = {
  id: string;
  receiver_id: string;
  receiver_display_name: string | null;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  message: string | null;
  status: ConnectionStatus;
  created_at: string;
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
    throw new ConnectionRequestError(`A valid ${field} is required.`, "INVALID_INPUT", 422, [
      { field, message: `A valid ${field} is required.` },
    ]);
  }
  return value;
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConnectionRequestError(`${field} is required.`, "MISSING_FIELD", 422, [
      { field, message: `${field} is required.` },
    ]);
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
    throw new ConnectionRequestError(`${field} is required.`, "MISSING_FIELD", 422, [
      { field, message: `${field} is required.` },
    ]);
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

async function isPausedMatchingGoal(db: SupabaseClient, candidateGoalId: string) {
  const { data, error } = await db.rpc("matching_goal_is_paused", {
    candidate_goal_id: candidateGoalId,
  });
  if (error) throw error;
  return data === true;
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
  if (
    own.information_version === 2 &&
    (own.category === "exam_prep" || own.category === "skill_practice")
  ) {
    return (
      candidate.information_version === 2 &&
      candidate.category === own.category &&
      Boolean(own.subject_or_skill_key) &&
      candidate.subject_or_skill_key === own.subject_or_skill_key
    );
  }
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
      typeof v.message === "string" && v.message.trim() ? v.message.slice(0, 500).trim() : null;

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
      if (!candidateGoal && (await isPausedMatchingGoal(db, candidateGoalId))) {
        return reply(
          {
            error:
              "This student's matching profile is currently unavailable. A new connection request cannot be sent.",
            code: "MATCHING_PAUSED",
            field_errors: [
              {
                field: "candidate_goal_id",
                message: "This student is currently unavailable for new connection requests.",
              },
            ],
          },
          409
        );
      }
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
    return reply({ error: "Connection storage is unavailable. Please try again later." }, 503);
  }
}

// ── US-11: get received requests ─────────────────────────────────────────────

/**
 * Returns all connection requests addressed to the authenticated user,
 * newest first, enriched with the requester's display name where available.
 * AC2: the query filters by receiver_id = userId — other students' requests
 *      are never returned regardless of RLS.
 */
export async function getReceivedRequests(db: SupabaseClient): Promise<Response> {
  try {
    const userId = await getAuthUserId(db);
    if (!userId) {
      return reply({ error: "Sign in to view connection requests." }, 401);
    }

    // AC2: only requests addressed to this user
    const { data: rows, error: connErr } = await db
      .from("connections")
      .select("id,requester_id,session_topic,proposed_start,proposed_end,message,status,created_at")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (connErr) throw connErr;

    // Batch-fetch a display name for each unique requester (best-effort: first
    // non-archived goal per user). Missing display names return null — the UI
    // falls back to "A student".
    const requesterIds = [...new Set((rows ?? []).map((r) => r.requester_id))];
    const displayNames: Record<string, string> = {};
    if (requesterIds.length > 0) {
      const { data: goals } = await db
        .from("matching_goals")
        .select("user_id,display_name")
        .in("user_id", requesterIds)
        .is("archived_at", null);
      (goals ?? []).forEach((g) => {
        if (g.user_id && !displayNames[g.user_id]) {
          displayNames[g.user_id] = g.display_name;
        }
      });
    }

    const requests: ReceivedRequest[] = (rows ?? []).map((r) => ({
      id: r.id,
      requester_id: r.requester_id,
      requester_display_name: displayNames[r.requester_id] ?? null,
      session_topic: r.session_topic,
      proposed_start: r.proposed_start,
      proposed_end: r.proposed_end,
      message: r.message,
      status: r.status as ConnectionStatus,
      created_at: r.created_at,
    }));

    return reply({ requests }, 200);
  } catch {
    return reply({ error: "Unable to load connection requests. Please try again later." }, 503);
  }
}

// ── US-12: get sent requests ──────────────────────────────────────────────────

export async function getSentRequests(db: SupabaseClient): Promise<Response> {
  try {
    const userId = await getAuthUserId(db);
    if (!userId) return reply({ error: "Sign in to view sent requests." }, 401);

    const { data: rows, error: connErr } = await db
      .from("connections")
      .select("id,receiver_id,session_topic,proposed_start,proposed_end,message,status,created_at")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });
    if (connErr) throw connErr;

    const receiverIds = [...new Set((rows ?? []).map((r) => r.receiver_id))];
    const displayNames: Record<string, string> = {};
    if (receiverIds.length > 0) {
      const { data: goals } = await db
        .from("matching_goals")
        .select("user_id,display_name")
        .in("user_id", receiverIds)
        .is("archived_at", null);
      (goals ?? []).forEach((g) => {
        if (g.user_id && !displayNames[g.user_id]) displayNames[g.user_id] = g.display_name;
      });
    }

    const requests: SentRequest[] = (rows ?? []).map((r) => ({
      id: r.id,
      receiver_id: r.receiver_id,
      receiver_display_name: displayNames[r.receiver_id] ?? null,
      session_topic: r.session_topic,
      proposed_start: r.proposed_start,
      proposed_end: r.proposed_end,
      message: r.message,
      status: r.status as ConnectionStatus,
      created_at: r.created_at,
    }));

    return reply({ requests }, 200);
  } catch {
    return reply({ error: "Unable to load sent requests. Please try again later." }, 503);
  }
}

// ── US-13: respond to a received request ─────────────────────────────────────

/**
 * Accepts or declines a pending connection request on behalf of the receiver.
 * AC1: accept → "accepted"; decline → "rejected".
 * AC2: only pending requests can be responded to (others → 409 NOT_RESPONDABLE).
 * AC3: only the receiver may respond (.eq("receiver_id", userId) → 404 for anyone else).
 */
export async function respondToConnectionRequest(
  db: SupabaseClient,
  connectionId: string,
  action: "accept" | "decline"
): Promise<Response> {
  try {
    if (!UUID.test(connectionId)) {
      return reply({ error: "A valid connection ID is required.", code: "INVALID_INPUT" }, 422);
    }

    const userId = await getAuthUserId(db);
    if (!userId) return reply({ error: "Sign in to respond to a connection request." }, 401);

    // AC3: .eq("receiver_id", userId) means only the recipient can respond
    const { data: conn, error: fetchErr } = await db
      .from("connections")
      .select("id,status")
      .eq("id", connectionId)
      .eq("receiver_id", userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!conn) return reply({ error: "Connection request not found." }, 404);

    // AC2: only pending requests can be responded to
    if (conn.status !== "pending") {
      return reply(
        {
          error: `This request has already been ${conn.status} and cannot be responded to.`,
          code: "NOT_RESPONDABLE",
          current_status: conn.status,
        },
        409
      );
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // Race guard: UPDATE filtered by status=pending
    const { data: updated, error: updateErr } = await db
      .from("connections")
      .update({ status: newStatus })
      .eq("id", connectionId)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();
    if (updateErr) throw updateErr;

    if (!updated) {
      return reply(
        {
          error: "The request status changed before your response could be processed.",
          code: "STATUS_CHANGED",
        },
        409
      );
    }

    return reply({ id: connectionId, status: newStatus }, 200);
  } catch (error) {
    if (error instanceof ConnectionRequestError) {
      return reply({ error: error.message, code: error.code }, error.status);
    }
    return reply({ error: "Unable to process the response. Please try again later." }, 503);
  }
}

// ── US-12: cancel a sent request ─────────────────────────────────────────────

export async function cancelConnectionRequest(
  db: SupabaseClient,
  connectionId: string
): Promise<Response> {
  try {
    if (!UUID.test(connectionId)) {
      return reply({ error: "A valid connection ID is required.", code: "INVALID_INPUT" }, 422);
    }

    const userId = await getAuthUserId(db);
    if (!userId) return reply({ error: "Sign in to cancel a connection request." }, 401);

    // AC3: .eq("requester_id", userId) means other users' requests return 404
    const { data: conn, error: fetchErr } = await db
      .from("connections")
      .select("id,status")
      .eq("id", connectionId)
      .eq("requester_id", userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!conn) return reply({ error: "Connection request not found." }, 404);

    // AC2: only pending requests can be cancelled
    if (conn.status !== "pending") {
      return reply(
        {
          error: `This request has already been ${conn.status} and cannot be cancelled.`,
          code: "NOT_CANCELLABLE",
          current_status: conn.status,
        },
        409
      );
    }

    // Guard with status=pending in UPDATE to handle the concurrent-accept race.
    // If the row was accepted between the SELECT and UPDATE, maybeSingle() returns null.
    const { data: updated, error: updateErr } = await db
      .from("connections")
      .update({ status: "cancelled" })
      .eq("id", connectionId)
      .eq("requester_id", userId)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();
    if (updateErr) throw updateErr;

    if (!updated) {
      return reply(
        {
          error: "The request status changed before the cancellation could be processed.",
          code: "STATUS_CHANGED",
        },
        409
      );
    }

    return reply({ id: connectionId, status: "cancelled" }, 200);
  } catch (error) {
    if (error instanceof ConnectionRequestError) {
      return reply({ error: error.message, code: error.code }, error.status);
    }
    return reply({ error: "Unable to cancel the request. Please try again later." }, 503);
  }
}
