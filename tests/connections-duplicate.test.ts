/**
 * US-09 — Prevent duplicate connection requests
 *
 * AC1: identical pending request (same candidate + same session + same
 *      proposed time window) → 409 DUPLICATE_REQUEST, no new row created.
 * AC2: no existing pending request for that session/candidate → 201.
 * AC3: same candidate but a different course/skill/topic, OR a different
 *      proposed time window → treated as a different session → 201.
 * AC4: same proposed session (topic + time window) sent to a different
 *      candidate → allowed → 201.
 * AC5: a prior request for the same session/candidate was declined or
 *      cancelled (not pending) → does not block a new request → 201.
 *
 * Tests the pure sendConnectionRequest(db, request) function with a small
 * query-aware stub, following the stub pattern established in
 * connections.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { sendConnectionRequest } from "../lib/connections/http";

// ── fixed ids ────────────────────────────────────────────────────────────────

const requesterId = "11111111-1111-4111-8111-111111111111";
const receiverId = "22222222-2222-4222-8222-222222222222";
const receiverId2 = "99999999-9999-4999-8999-999999999999";

const goalId = "33333333-3333-4333-8333-333333333333"; // own goal: React hooks
const goalId2 = "77777777-7777-4777-8777-777777777777"; // own goal: Big Data

const candGoalId = "44444444-4444-4444-8444-444444444444"; // receiver's React hooks goal
const candGoalId2 = "88888888-8888-4888-8888-888888888888"; // same receiver, Big Data goal
const candGoalId3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // different receiver, React hooks goal

const connId = "55555555-5555-4555-8555-555555555555";

const T1_START = "2026-12-01T18:00:00.000Z";
const T1_END = "2026-12-01T20:00:00.000Z";
const T2_START = "2026-12-02T18:00:00.000Z";
const T2_END = "2026-12-02T20:00:00.000Z";

// ── goal fixtures ──────────────────────────────────────────────────────────

function courseGoal(overrides: Record<string, unknown>) {
  return {
    information_version: 2,
    category: "course",
    subject_or_skill_key: null,
    exam_date: null,
    mode: "course",
    institution_key: "nyu",
    assignment_id: null,
    is_listed: true,
    archived_at: null,
    ...overrides,
  };
}

const ownGoal = courseGoal({
  id: goalId,
  user_id: requesterId,
  course_key: "cs-gy 6233",
  topic_key: "react hooks",
  is_listed: false,
});
const ownGoal2 = courseGoal({
  id: goalId2,
  user_id: requesterId,
  course_key: "cs-gy 6513",
  topic_key: "big data",
  is_listed: false,
});
const candidateGoal = courseGoal({
  id: candGoalId,
  user_id: receiverId,
  course_key: "cs-gy 6233",
  topic_key: "react hooks",
});
const candidateGoal2 = courseGoal({
  id: candGoalId2,
  user_id: receiverId, // same candidate (receiver) as candidateGoal
  course_key: "cs-gy 6513",
  topic_key: "big data",
});
const candidateGoal3 = courseGoal({
  id: candGoalId3,
  user_id: receiverId2, // different candidate, same course/topic as candidateGoal
  course_key: "cs-gy 6233",
  topic_key: "react hooks",
});

const ownGoals: Record<string, unknown>[] = [ownGoal, ownGoal2];
const candidateGoals: Record<string, unknown>[] = [candidateGoal, candidateGoal2, candidateGoal3];

// ── existing-connection fixture (a row the "database" already holds) ───────

type ExistingConnection = {
  requester_id: string;
  candidate_goal_id: string;
  proposed_start: string;
  proposed_end: string;
  status: string;
};

// ── stub helpers ─────────────────────────────────────────────────────────────

function eqFilter(url: URL, field: string): string | null {
  const raw = url.searchParams.get(field);
  if (raw == null) return null;
  return raw.startsWith("eq.") ? raw.slice(3) : raw;
}

/**
 * Query-aware stub: resolves the requester's own goal and the candidate's
 * goal by `id`, answers the US-09 duplicate-pending lookup against a small
 * in-memory row set (honoring every .eq() filter chained in http.ts, so the
 * test actually exercises that filtering logic), and records the INSERT
 * payload.
 */
function buildDb(opts: { existing?: ExistingConnection[]; insertError?: unknown } = {}) {
  const existing = opts.existing ?? [];
  let insertCaptured: Record<string, unknown> | null = null;

  const client = createClient("https://example.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";

        if (url.pathname === "/rest/v1/matching_goals") {
          const id = eqFilter(url, "id");
          if (url.searchParams.has("user_id")) {
            const match = ownGoals.find((g) => g.id === id) ?? null;
            return json(match);
          }
          if (url.searchParams.has("is_listed")) {
            const match = candidateGoals.find((g) => g.id === id) ?? null;
            return json(match);
          }
        }

        if (url.pathname === "/rest/v1/connections") {
          if (method === "POST") {
            insertCaptured = JSON.parse(String(init?.body));
            if (opts.insertError) {
              return new Response(JSON.stringify(opts.insertError), {
                status: 409,
                headers: { "Content-Type": "application/json" },
              });
            }
            return json({ id: connId });
          }
          // US-09 duplicate-pending lookup: honor every chained .eq() filter.
          const match = existing.find(
            (row) =>
              row.requester_id === eqFilter(url, "requester_id") &&
              row.candidate_goal_id === eqFilter(url, "candidate_goal_id") &&
              row.proposed_start === eqFilter(url, "proposed_start") &&
              row.proposed_end === eqFilter(url, "proposed_end") &&
              row.status === eqFilter(url, "status")
          );
          return json(match ? { id: "existing-connection-id" } : null);
        }

        return json(null);
      },
    },
  });
  Object.defineProperty(client, "auth", {
    value: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: { id: requesterId } }, error: null }),
    },
  });
  return { client, getInsertCaptured: () => insertCaptured };
}

function json(value: unknown) {
  return new Response(JSON.stringify(value ?? null), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function bodyFor(ownId: string, candId: string, start: string, end: string) {
  return {
    goal_id: ownId,
    candidate_goal_id: candId,
    session_topic: "Study session",
    proposed_start: start,
    proposed_end: end,
  };
}

// ── AC1: identical pending request is blocked ────────────────────────────────

test("US-09 AC1: identical pending request to the same candidate + session returns 409", async () => {
  const { client, getInsertCaptured } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "pending",
      },
    ],
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T1_START, T1_END))
  );
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "DUPLICATE_REQUEST");
  assert.match(body.error, /already pending/i);
  assert.equal(getInsertCaptured(), null, "must not insert a second row");
});

// ── AC2: first request for a session is allowed ──────────────────────────────

test("US-09 AC2: no existing pending request for this session → 201", async () => {
  const { client } = buildDb({ existing: [] });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T1_START, T1_END))
  );
  assert.equal(res.status, 201);
  assert.equal((await res.json()).status, "pending");
});

// ── AC3: a different session to the same candidate is allowed ────────────────

test("US-09 AC3: same candidate, different course/skill goal → treated as a different session, 201", async () => {
  const { client } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "pending",
      },
    ],
  });
  // Same candidate (receiverId), but their Big Data goal instead of React hooks.
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId2, candGoalId2, T1_START, T1_END))
  );
  assert.equal(res.status, 201);
});

test("US-09 AC3: same candidate + session, different proposed time window → allowed, 201", async () => {
  const { client } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "pending",
      },
    ],
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T2_START, T2_END))
  );
  assert.equal(res.status, 201);
});

// ── AC4: the same proposed session to a different candidate is allowed ──────

test("US-09 AC4: same proposed session, different candidate → allowed, 201", async () => {
  const { client } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "pending",
      },
    ],
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId3, T1_START, T1_END))
  );
  assert.equal(res.status, 201);
});

// ── AC5: a declined or cancelled prior request does not block a new one ─────

test("US-09 AC5: prior rejected request for the same session/candidate does not block a new request, 201", async () => {
  const { client } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "rejected",
      },
    ],
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T1_START, T1_END))
  );
  assert.equal(res.status, 201);
});

test("US-09 AC5: prior cancelled request for the same session/candidate does not block a new request, 201", async () => {
  const { client } = buildDb({
    existing: [
      {
        requester_id: requesterId,
        candidate_goal_id: candGoalId,
        proposed_start: T1_START,
        proposed_end: T1_END,
        status: "cancelled",
      },
    ],
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T1_START, T1_END))
  );
  assert.equal(res.status, 201);
});

// ── persistence: session identity is stored so future requests can be checked ─

test("US-09: INSERT persists goal_id and candidate_goal_id for later duplicate checks", async () => {
  const { client, getInsertCaptured } = buildDb({ existing: [] });
  await sendConnectionRequest(client, request(bodyFor(goalId, candGoalId, T1_START, T1_END)));
  const captured = getInsertCaptured();
  assert.equal(captured?.goal_id, goalId);
  assert.equal(captured?.candidate_goal_id, candGoalId);
});

// ── race guard: concurrent identical submissions fall back to the DB constraint ─

test("US-09: a 23505 unique-violation on INSERT (race past the pre-check) still returns 409 DUPLICATE_REQUEST", async () => {
  const { client } = buildDb({
    existing: [],
    insertError: { code: "23505", message: "duplicate key value", details: null, hint: null },
  });
  const res = await sendConnectionRequest(
    client,
    request(bodyFor(goalId, candGoalId, T1_START, T1_END))
  );
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "DUPLICATE_REQUEST");
  assert.match(body.error, /already pending/i);
});
