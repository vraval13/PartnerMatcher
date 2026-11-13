/**
 * US-08 — Send a session connection request
 *
 * AC1: Valid request → 201 with connection id; body includes recipient context,
 *      session_topic, proposed_start, proposed_end, status=pending.
 * AC2: Candidate not in results OR time window omitted → 422 with clear error.
 *
 * Tests the pure sendConnectionRequest(db, request) function. The DB is stubbed
 * at the fetch level following the same pattern as matching-http.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  sendConnectionRequest,
  isEligibleCandidate,
  getReceivedRequests,
} from "../lib/connections/http";

// ── fixed ids ────────────────────────────────────────────────────────────────

const requesterId = "11111111-1111-4111-8111-111111111111";
const receiverId = "22222222-2222-4222-8222-222222222222";
const goalId = "33333333-3333-4333-8333-333333333333";
const candGoalId = "44444444-4444-4444-8444-444444444444";
const connId = "55555555-5555-4555-8555-555555555555";

// ── goal fixtures ─────────────────────────────────────────────────────────────

const ownGoal = {
  id: goalId,
  user_id: requesterId,
  information_version: 2,
  category: "course",
  subject_or_skill_key: "react hooks",
  mode: "course",
  institution_key: "nyu",
  course_key: "cs-gy 6233",
  topic_key: "react hooks",
  assignment_id: null,
  is_listed: false,
  archived_at: null,
};

const candidateGoal = {
  id: candGoalId,
  user_id: receiverId,
  information_version: 2,
  category: "course",
  subject_or_skill_key: "react hooks",
  mode: "course",
  institution_key: "nyu",
  course_key: "cs-gy 6233",
  topic_key: "react hooks",
  assignment_id: null,
  is_listed: true,
  archived_at: null,
};

// ── valid request body ────────────────────────────────────────────────────────

const validBody = {
  goal_id: goalId,
  candidate_goal_id: candGoalId,
  session_topic: "React Hooks deep dive",
  proposed_start: "2026-11-15T14:00:00Z",
  proposed_end: "2026-11-15T16:00:00Z",
};

// ── stub helpers ──────────────────────────────────────────────────────────────

/**
 * Creates a Supabase client whose fetch is intercepted by `lookup`.
 * If `lookup` returns a Response it is forwarded directly; otherwise the
 * return value is JSON-wrapped in a 200. Unmatched URLs return null so
 * background SDK operations (auth token checks, etc.) do not throw.
 */
function db(lookup: (url: URL, init?: RequestInit) => unknown, signedIn = true) {
  const client = createClient("https://example.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const result = lookup(new URL(String(input)), init);
        if (result instanceof Response) return result;
        return new Response(JSON.stringify(result ?? null), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  Object.defineProperty(client, "auth", {
    value: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({
        data: { user: signedIn ? { id: requesterId } : null },
        error: signedIn ? null : new Error("No session"),
      }),
    },
  });
  return client;
}

/** Happy-path DB: requester's goal → own, candidate's goal → candidate, INSERT → connId. */
function happyDb(
  overrides: {
    own?: unknown;
    candidate?: unknown;
    insertResult?: unknown;
    candidatePaused?: boolean;
  } = {}
) {
  return db((url, init) => {
    // INSERT into connections — match by path to avoid catching auth POSTs
    if (init?.method === "POST" && url.pathname === "/rest/v1/connections") {
      const result = overrides.insertResult ?? { id: connId };
      return result;
    }
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("user_id")) {
      // requester's goal lookup
      return overrides.own !== undefined ? overrides.own : ownGoal;
    }
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("is_listed")) {
      // candidate's goal lookup
      return overrides.candidate !== undefined ? overrides.candidate : candidateGoal;
    }
    if (url.pathname === "/rest/v1/rpc/matching_goal_is_paused") {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.candidate_goal_id, candGoalId);
      return overrides.candidatePaused ?? false;
    }
    return null; // safe default for unexpected SDK fetches (auth checks, etc.)
  });
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── isEligibleCandidate unit tests ────────────────────────────────────────────

test("US-08: isEligibleCandidate passes when all fields match", () => {
  assert.equal(isEligibleCandidate(ownGoal, candidateGoal), true);
});

test("US-08 AC2: isEligibleCandidate rejects null candidate (not in results)", () => {
  assert.equal(isEligibleCandidate(ownGoal, null), false);
});

test("US-08 AC2: isEligibleCandidate rejects unlisted candidate", () => {
  assert.equal(isEligibleCandidate(ownGoal, { ...candidateGoal, is_listed: false }), false);
});

test("US-08 AC2: isEligibleCandidate rejects archived candidate", () => {
  assert.equal(
    isEligibleCandidate(ownGoal, { ...candidateGoal, archived_at: "2026-10-01T00:00:00Z" }),
    false
  );
});

test("US-08 AC2: isEligibleCandidate rejects self (same user_id)", () => {
  assert.equal(isEligibleCandidate(ownGoal, { ...candidateGoal, user_id: requesterId }), false);
});

test("US-08 AC2: isEligibleCandidate rejects mismatched mode", () => {
  assert.equal(isEligibleCandidate(ownGoal, { ...candidateGoal, mode: "assignment" }), false);
});

test("US-08 AC2: isEligibleCandidate rejects different institution", () => {
  assert.equal(
    isEligibleCandidate(ownGoal, { ...candidateGoal, institution_key: "columbia" }),
    false
  );
});

test("US-08 AC2: isEligibleCandidate rejects different course", () => {
  assert.equal(isEligibleCandidate(ownGoal, { ...candidateGoal, course_key: "cs101" }), false);
});

test("US-08 AC2: isEligibleCandidate rejects different topic", () => {
  assert.equal(isEligibleCandidate(ownGoal, { ...candidateGoal, topic_key: "vue.js" }), false);
});

test("US-08 AC2: isEligibleCandidate uses assignment_id equality for assignment mode", () => {
  const assignOwn = { ...ownGoal, mode: "assignment", assignment_id: "HW-01", topic_key: "" };
  const assignCand = {
    ...candidateGoal,
    mode: "assignment",
    assignment_id: "HW-01",
    topic_key: "",
  };
  assert.equal(isEligibleCandidate(assignOwn, assignCand), true);
  assert.equal(isEligibleCandidate(assignOwn, { ...assignCand, assignment_id: "HW-02" }), false);
});
test("US-06/US-08: an exact exam-subject match remains eligible for a connection request", () => {
  const examOwn = {
    ...ownGoal,
    category: "exam_prep",
    subject_or_skill_key: "calculus final",
    mode: null,
    institution_key: null,
    course_key: null,
    topic_key: null,
  };
  const examCandidate = {
    ...candidateGoal,
    category: "exam_prep",
    subject_or_skill_key: "calculus final",
    mode: null,
    institution_key: null,
    course_key: null,
    topic_key: null,
  };
  assert.equal(isEligibleCandidate(examOwn, examCandidate), true);
  assert.equal(
    isEligibleCandidate(examOwn, { ...examCandidate, subject_or_skill_key: "physics final" }),
    false
  );
});
test("US-07/US-08: an exact skill or language match remains eligible for a request", () => {
  const practiceOwn = {
    ...ownGoal,
    category: "skill_practice",
    subject_or_skill_key: "japanese conversation",
    mode: null,
    institution_key: null,
    course_key: null,
    topic_key: null,
  };
  const practiceCandidate = {
    ...candidateGoal,
    category: "skill_practice",
    subject_or_skill_key: "japanese conversation",
    mode: null,
    institution_key: null,
    course_key: null,
    topic_key: null,
  };
  assert.equal(isEligibleCandidate(practiceOwn, practiceCandidate), true);
  assert.equal(
    isEligibleCandidate(practiceOwn, {
      ...practiceCandidate,
      subject_or_skill_key: "spanish conversation",
    }),
    false
  );
});

// ── HTTP handler tests ────────────────────────────────────────────────────────

test("US-08 AC1: 201 with connection id on successful request", async () => {
  const res = await sendConnectionRequest(happyDb(), request(validBody));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.id, connId);
});

test("US-08 AC1: response includes status=pending", async () => {
  const res = await sendConnectionRequest(happyDb(), request(validBody));
  assert.equal((await res.json()).status, "pending");
});

test("US-08 AC1: response includes session_topic, proposed_start, proposed_end", async () => {
  const res = await sendConnectionRequest(happyDb(), request(validBody));
  const body = await res.json();
  assert.equal(body.session_topic, validBody.session_topic);
  assert.equal(body.proposed_start, new Date(validBody.proposed_start).toISOString());
  assert.equal(body.proposed_end, new Date(validBody.proposed_end).toISOString());
});

test("US-08 AC1: INSERT contains correct requester_id, receiver_id, session_topic, times", async () => {
  let captured: Record<string, unknown> = {};
  const client = db((url, init) => {
    if (init?.method === "POST") {
      captured = JSON.parse(String(init.body));
      return { id: connId };
    }
    if (url.searchParams.has("user_id")) return ownGoal;
    if (url.searchParams.has("is_listed")) return candidateGoal;
    throw new Error("unexpected");
  });
  await sendConnectionRequest(client, request(validBody));
  assert.equal(captured.requester_id, requesterId);
  assert.equal(captured.receiver_id, receiverId);
  assert.equal(captured.session_topic, validBody.session_topic);
  assert.ok(captured.proposed_start, "proposed_start must be in INSERT");
  assert.ok(captured.proposed_end, "proposed_end must be in INSERT");
  assert.equal(captured.status, "pending");
});

test("US-08 AC1: response Cache-Control is private, no-store", async () => {
  const res = await sendConnectionRequest(happyDb(), request(validBody));
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

test("US-08: unauthenticated request returns 401 before any DB query", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  }, false);
  const res = await sendConnectionRequest(client, request(validBody));
  assert.equal(res.status, 401);
});

test("US-08: requester's goal not found returns 404", async () => {
  const client = db((url, init) => {
    if (init?.method === "POST") throw new Error("Must not insert");
    if (url.searchParams.has("user_id")) return null; // goal not found
    if (url.searchParams.has("is_listed")) throw new Error("Must not query candidate");
    throw new Error("unexpected");
  });
  const res = await sendConnectionRequest(client, request(validBody));
  assert.equal(res.status, 404);
});

// ── AC2: time window validation ───────────────────────────────────────────────

test("US-08 AC2: missing session_topic returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(client, request({ ...validBody, session_topic: "" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.field_errors[0].field, "session_topic");
});

test("US-08 AC2: missing proposed_start returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(client, request({ ...validBody, proposed_start: "" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.field_errors[0].field, "proposed_start");
});

test("US-08 AC2: missing proposed_end returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(client, request({ ...validBody, proposed_end: "" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.field_errors[0].field, "proposed_end");
});

test("US-08 AC2: proposed_end equal to proposed_start returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(
    client,
    request({ ...validBody, proposed_end: validBody.proposed_start })
  );
  assert.equal(res.status, 422);
  assert.match((await res.json()).code, /INVALID_TIME_WINDOW/);
});

test("US-08 AC2: proposed_end before proposed_start returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(
    client,
    request({ ...validBody, proposed_end: "2026-11-15T13:00:00Z" })
  );
  assert.equal(res.status, 422);
  assert.match((await res.json()).code, /INVALID_TIME_WINDOW/);
});

test("US-08 AC2: non-ISO proposed_start returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(
    client,
    request({ ...validBody, proposed_start: "not-a-date" })
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).field_errors[0].field, "proposed_start");
});

// ── AC2: candidate eligibility ────────────────────────────────────────────────

test("US-08 AC2: candidate not listed returns 422 — not in current results", async () => {
  const res = await sendConnectionRequest(
    happyDb({ candidate: { ...candidateGoal, is_listed: false } }),
    request(validBody)
  );
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, "CANDIDATE_NOT_IN_RESULTS");
  assert.equal(body.field_errors[0].field, "candidate_goal_id");
});

test("US-08 AC2: candidate not found (not listed/archived) returns 422 — not in results", async () => {
  const res = await sendConnectionRequest(happyDb({ candidate: null }), request(validBody));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "CANDIDATE_NOT_IN_RESULTS");
});

test("US-16 AC3: an old result for a paused profile explains unavailability and blocks request", async () => {
  let insertAttempted = false;
  const client = db((url, init) => {
    if (init?.method === "POST" && url.pathname === "/rest/v1/connections") {
      insertAttempted = true;
      return { id: connId };
    }
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("user_id")) {
      return ownGoal;
    }
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("is_listed")) {
      return null;
    }
    if (url.pathname === "/rest/v1/rpc/matching_goal_is_paused") return true;
    return null;
  });

  const response = await sendConnectionRequest(client, request(validBody));
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, "MATCHING_PAUSED");
  assert.match(body.error, /currently unavailable/i);
  assert.equal(insertAttempted, false);
});

test("US-08 AC2: candidate with different topic returns 422 — not in results", async () => {
  const res = await sendConnectionRequest(
    happyDb({ candidate: { ...candidateGoal, topic_key: "vue.js" } }),
    request(validBody)
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "CANDIDATE_NOT_IN_RESULTS");
});

test("US-08 AC2: candidate from different institution returns 422 — not in results", async () => {
  const res = await sendConnectionRequest(
    happyDb({ candidate: { ...candidateGoal, institution_key: "columbia" } }),
    request(validBody)
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "CANDIDATE_NOT_IN_RESULTS");
});

test("US-08 AC2: self-request (candidate goal owned by requester) returns 422", async () => {
  const res = await sendConnectionRequest(
    happyDb({ candidate: { ...candidateGoal, user_id: requesterId } }),
    request(validBody)
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "CANDIDATE_NOT_IN_RESULTS");
});

// ── duplicate / conflict ──────────────────────────────────────────────────────

test("US-08: duplicate request returns 409 when connection already exists", async () => {
  const client = db((url, init) => {
    if (init?.method === "POST" && url.pathname === "/rest/v1/connections") {
      // PostgREST returns 409 with a JSON body containing the Postgres error code.
      // We return a non-2xx Response so postgrest-js parses it via processResponse.
      return new Response(
        JSON.stringify({
          code: "23505",
          message: "duplicate key value",
          details: null,
          hint: null,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("user_id"))
      return ownGoal;
    if (url.pathname === "/rest/v1/matching_goals" && url.searchParams.has("is_listed"))
      return candidateGoal;
    return null;
  });
  const res = await sendConnectionRequest(client, request(validBody));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "DUPLICATE_REQUEST");
});

// ── input validation ──────────────────────────────────────────────────────────

test("US-08: invalid UUID for goal_id returns 422 without DB query", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(client, request({ ...validBody, goal_id: "not-a-uuid" }));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).field_errors[0].field, "goal_id");
});

test("US-08: session_topic over 200 chars returns 422 without DB query", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(
    client,
    request({ ...validBody, session_topic: "a".repeat(201) })
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).field_errors[0].field, "session_topic");
});

test("US-08: malformed JSON body returns 422", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await sendConnectionRequest(
    client,
    new Request("http://localhost/api/v1/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    })
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "INVALID_JSON");
});

// ── US-11: getReceivedRequests ────────────────────────────────────────────────

/** Received-request fixture */
const receivedRow = {
  id: connId,
  requester_id: requesterId,
  session_topic: "React Hooks deep dive",
  proposed_start: "2026-11-15T14:00:00.000Z",
  proposed_end: "2026-11-15T16:00:00.000Z",
  message: "Hey, want to study together?",
  status: "pending",
  created_at: "2026-11-11T10:00:00.000Z",
};

/** Build a db stub for getReceivedRequests. */
function receivedDb(
  overrides: {
    connections?: unknown;
    goals?: unknown;
    error?: boolean;
  } = {}
) {
  return db((url) => {
    // connections GET (receiver_id filter)
    if (url.pathname === "/rest/v1/connections" && url.searchParams.has("receiver_id")) {
      if (overrides.error) {
        return new Response(JSON.stringify({ code: "PGRST301", message: "db error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return overrides.connections !== undefined ? overrides.connections : [receivedRow];
    }
    // matching_goals display-name lookup (user_id=in.)
    if (
      url.pathname === "/rest/v1/matching_goals" &&
      url.searchParams.get("user_id")?.startsWith("in.")
    ) {
      return overrides.goals !== undefined
        ? overrides.goals
        : [{ user_id: requesterId, display_name: "Alex Chen" }];
    }
    return null;
  });
}

test("US-11: unauthenticated request returns 401", async () => {
  const client = db(() => null, false);
  const res = await getReceivedRequests(client);
  assert.equal(res.status, 401);
});

test("US-11 AC1: returns 200 with requests array", async () => {
  const res = await getReceivedRequests(receivedDb());
  assert.equal(res.status, 200);
  const { requests } = await res.json();
  assert.ok(Array.isArray(requests));
  assert.equal(requests.length, 1);
});

test("US-11 AC1: request includes session_topic, proposed_start, proposed_end, status, created_at", async () => {
  const res = await getReceivedRequests(receivedDb());
  const { requests } = await res.json();
  const r = requests[0];
  assert.equal(r.session_topic, receivedRow.session_topic);
  assert.equal(r.proposed_start, receivedRow.proposed_start);
  assert.equal(r.proposed_end, receivedRow.proposed_end);
  assert.equal(r.status, "pending");
  assert.equal(r.created_at, receivedRow.created_at);
});

test("US-11 AC1: request includes requester display name from matching_goals", async () => {
  const res = await getReceivedRequests(receivedDb());
  const { requests } = await res.json();
  assert.equal(requests[0].requester_display_name, "Alex Chen");
});

test("US-11 AC1: requester_display_name is null when no matching goal found", async () => {
  const res = await getReceivedRequests(receivedDb({ goals: [] }));
  const { requests } = await res.json();
  assert.equal(requests[0].requester_display_name, null);
});

test("US-11 AC1: request includes message", async () => {
  const res = await getReceivedRequests(receivedDb());
  const { requests } = await res.json();
  assert.equal(requests[0].message, receivedRow.message);
});

test("US-11 AC2: returns empty array when no requests addressed to user", async () => {
  const res = await getReceivedRequests(receivedDb({ connections: [], goals: [] }));
  assert.equal(res.status, 200);
  const { requests } = await res.json();
  assert.equal(requests.length, 0);
});

test("US-11 AC3: accepted request appears with status=accepted (not suppressed)", async () => {
  const accepted = {
    ...receivedRow,
    id: "aa111111-1111-4111-8111-111111111111",
    status: "accepted",
  };
  const res = await getReceivedRequests(receivedDb({ connections: [accepted] }));
  const { requests } = await res.json();
  assert.equal(requests[0].status, "accepted");
});

test("US-11 AC3: rejected request appears with status=rejected", async () => {
  const rejected = {
    ...receivedRow,
    id: "bb222222-2222-4222-8222-222222222222",
    status: "rejected",
  };
  const res = await getReceivedRequests(receivedDb({ connections: [rejected] }));
  const { requests } = await res.json();
  assert.equal(requests[0].status, "rejected");
});

test("US-11 AC3: blocked request appears with status=blocked", async () => {
  const blocked = { ...receivedRow, id: "cc333333-3333-4333-8333-333333333333", status: "blocked" };
  const res = await getReceivedRequests(receivedDb({ connections: [blocked] }));
  const { requests } = await res.json();
  assert.equal(requests[0].status, "blocked");
});

test("US-11 AC3: multiple statuses all returned together", async () => {
  const rows = [
    { ...receivedRow, id: "dd111111-1111-4111-8111-111111111111", status: "pending" },
    { ...receivedRow, id: "dd222222-2222-4222-8222-222222222222", status: "accepted" },
    { ...receivedRow, id: "dd333333-3333-4333-8333-333333333333", status: "rejected" },
  ];
  const res = await getReceivedRequests(receivedDb({ connections: rows }));
  const { requests } = await res.json();
  assert.equal(requests.length, 3);
  const statuses = requests.map((r: { status: string }) => r.status).sort();
  assert.deepEqual(statuses, ["accepted", "pending", "rejected"]);
});

test("US-11: DB error returns 503", async () => {
  const res = await getReceivedRequests(receivedDb({ error: true }));
  assert.equal(res.status, 503);
});

test("US-11: response Cache-Control is private, no-store", async () => {
  const res = await getReceivedRequests(receivedDb());
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});
