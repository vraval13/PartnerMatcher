/**
 * US-10 — View Sent Connection Requests
 *
 * AC1: each sent request shows the recipient, proposed topic, proposed time,
 *      request date, and current status.
 * AC2: a signed-in student sees only the requests they created — never
 *      another student's sent requests.
 * AC3: no sent requests yet renders a clear empty state, not an error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { getSentRequests } from "../lib/connections/http";

// ── fixed ids ─────────────────────────────────────────────────────────────────

const userA = "11111111-1111-4111-8111-111111111111"; // the student under test
const userB = "33333333-3333-4333-8333-333333333333"; // a different student
const receiver1 = "22222222-2222-4222-8222-222222222222";
const receiver2 = "44444444-4444-4444-8444-444444444444";

// ── stub helper ───────────────────────────────────────────────────────────────

function db(lookup: (url: URL, init?: RequestInit) => unknown, signedInAs: string | null = userA) {
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
        data: { user: signedInAs ? { id: signedInAs } : null },
        error: signedInAs ? null : new Error("No session"),
      }),
    },
  });
  return client;
}

// The full fake "connections" table — rows belonging to two different
// requesters, so a scoping bug (AC2) that leaked another user's rows would
// be caught by the isolation tests below rather than hidden by a fixture
// that only ever contains one user's data.
const allConnections = [
  {
    id: "conn-a1",
    requester_id: userA,
    receiver_id: receiver1,
    session_topic: "React Hooks deep dive",
    proposed_start: "2026-11-15T14:00:00.000Z",
    proposed_end: "2026-11-15T16:00:00.000Z",
    message: "Hey, want to study together?",
    status: "pending",
    created_at: "2026-11-11T10:00:00.000Z",
  },
  {
    id: "conn-a2",
    requester_id: userA,
    receiver_id: receiver2,
    session_topic: "Midterm review",
    proposed_start: "2026-11-20T09:00:00.000Z",
    proposed_end: "2026-11-20T10:30:00.000Z",
    message: null,
    status: "accepted",
    created_at: "2026-11-12T08:00:00.000Z",
  },
  {
    id: "conn-b1",
    requester_id: userB,
    receiver_id: receiver1,
    session_topic: "Should never appear for userA",
    proposed_start: "2026-11-16T14:00:00.000Z",
    proposed_end: "2026-11-16T16:00:00.000Z",
    message: null,
    status: "pending",
    created_at: "2026-11-13T10:00:00.000Z",
  },
];

const goalRows = [
  { user_id: receiver1, display_name: "Sam Park" },
  { user_id: receiver2, display_name: "Priya Shah" },
];

function sentDb(
  opts: {
    connections?: unknown;
    goals?: unknown;
    error?: boolean;
    signedInAs?: string | null;
  } = {}
) {
  return db(
    (url) => {
      if (url.pathname === "/rest/v1/connections") {
        if (opts.error) {
          return new Response(JSON.stringify({ code: "PGRST301", message: "db error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (opts.connections !== undefined) return opts.connections;
        // Mirror Postgres' own filtering here: a bug that dropped the
        // .eq("requester_id", userId) clause in the handler would surface
        // as every row (not just the signed-in user's) coming back.
        const requesterParam = url.searchParams.get("requester_id")?.replace("eq.", "");
        return allConnections.filter((c) => c.requester_id === requesterParam);
      }
      if (url.pathname === "/rest/v1/matching_goals") {
        return opts.goals !== undefined ? opts.goals : goalRows;
      }
      return null;
    },
    opts.signedInAs !== undefined ? opts.signedInAs : userA
  );
}

test("US-10: unauthenticated request returns 401", async () => {
  const res = await getSentRequests(sentDb({ signedInAs: null }));
  assert.equal(res.status, 401);
});

// ── AC1: recipient, topic, proposed time, request date, status ──────────────

test("US-10 AC1: each request includes recipient, topic, proposed time, date, and status", async () => {
  const res = await getSentRequests(sentDb());
  assert.equal(res.status, 200);
  const { requests } = await res.json();
  assert.equal(requests.length, 2);

  const r1 = requests.find((r: { id: string }) => r.id === "conn-a1");
  assert.equal(r1.receiver_display_name, "Sam Park");
  assert.equal(r1.session_topic, "React Hooks deep dive");
  assert.equal(r1.proposed_start, "2026-11-15T14:00:00.000Z");
  assert.equal(r1.proposed_end, "2026-11-15T16:00:00.000Z");
  assert.equal(r1.created_at, "2026-11-11T10:00:00.000Z");
  assert.equal(r1.status, "pending");

  const r2 = requests.find((r: { id: string }) => r.id === "conn-a2");
  assert.equal(r2.receiver_display_name, "Priya Shah");
  assert.equal(r2.status, "accepted");
});

test("US-10 AC1: recipient display name is null when no matching goal exists", async () => {
  const res = await getSentRequests(sentDb({ goals: [] }));
  const { requests } = await res.json();
  assert.ok(
    requests.every((r: { receiver_display_name: unknown }) => r.receiver_display_name === null)
  );
});

test("US-10 AC1: requests of every status are shown, not filtered to pending only", async () => {
  const cancelled = { ...allConnections[0], id: "conn-a3", status: "cancelled" };
  const res = await getSentRequests(sentDb({ connections: [cancelled] }));
  const { requests } = await res.json();
  assert.equal(requests[0].status, "cancelled");
});

test("US-10 AC1: requests are queried newest-first so the most recent request date leads", async () => {
  const captured: { url: URL | null } = { url: null };
  const client = db((url) => {
    if (url.pathname === "/rest/v1/connections") {
      captured.url = url;
      return [];
    }
    return null;
  });
  await getSentRequests(client);
  assert.equal(captured.url?.searchParams.get("order"), "created_at.desc");
});

// ── AC2: own requests only ───────────────────────────────────────────────────

test("US-10 AC2: a student sees only the requests they sent, never another student's", async () => {
  const res = await getSentRequests(sentDb({ signedInAs: userA }));
  const { requests } = await res.json();
  assert.equal(requests.length, 2);
  assert.ok(requests.every((r: { id: string }) => r.id !== "conn-b1"));
  assert.ok(
    !requests.some(
      (r: { session_topic: string | null }) => r.session_topic === "Should never appear for userA"
    )
  );
});

test("US-10 AC2: a different signed-in student sees only their own sent requests", async () => {
  const res = await getSentRequests(sentDb({ signedInAs: userB }));
  const { requests } = await res.json();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].id, "conn-b1");
});

// ── AC3: empty state, not an error ──────────────────────────────────────────

test("US-10 AC3: no sent requests yet returns an empty array, not an error", async () => {
  const res = await getSentRequests(sentDb({ connections: [], goals: [] }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.error, undefined);
  assert.deepEqual(body.requests, []);
});

// ── cross-cutting ────────────────────────────────────────────────────────────

test("US-10: a database error returns 503 without leaking the raw error", async () => {
  const res = await getSentRequests(sentDb({ error: true }));
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.ok(!/PGRST301|db error/.test(JSON.stringify(body)));
});

test("US-10: response is marked private, no-store (personal data must not be cached)", async () => {
  const res = await getSentRequests(sentDb());
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});
