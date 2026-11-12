/**
 * US-12 — Cancel a Sent Connection Request
 *
 * AC1: pending → cancelled; request no longer presented to recipient as active.
 * AC2: accepted/rejected/blocked/already-cancelled → 409 NOT_CANCELLABLE.
 * AC3: only the original sender can cancel (other users' requests return 404).
 *
 * Also covers getSentRequests (GET /api/v1/connections/sent).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { cancelConnectionRequest, getSentRequests } from "../lib/connections/http";

// ── fixed ids ─────────────────────────────────────────────────────────────────

const requesterId = "11111111-1111-4111-8111-111111111111";
const receiverId = "22222222-2222-4222-8222-222222222222";
const connId = "55555555-5555-4555-8555-555555555555";
const otherConnId = "66666666-6666-4666-8666-666666666666";

// ── stub helper ───────────────────────────────────────────────────────────────

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

// ── cancelConnectionRequest helpers ──────────────────────────────────────────

/** Builds a stub that handles both the SELECT (fetch) and UPDATE for cancel. */
function cancelDb(
  opts: {
    fetchRow?: { id: string; status: string } | null;
    updateRow?: { id: string; status: string } | null;
    dbError?: boolean;
  } = {}
) {
  const fetchRow = opts.fetchRow !== undefined ? opts.fetchRow : { id: connId, status: "pending" };
  const updateRow =
    opts.updateRow !== undefined ? opts.updateRow : { id: connId, status: "cancelled" };

  return db((url, init) => {
    // Both SELECT and UPDATE hit /rest/v1/connections with connection id filter
    if (url.pathname === "/rest/v1/connections") {
      if (opts.dbError) {
        return new Response(JSON.stringify({ code: "PGRST301", message: "db error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (init?.method === "PATCH") {
        return updateRow;
      }
      // SELECT
      return fetchRow;
    }
    return null;
  });
}

// ── cancelConnectionRequest: input validation ─────────────────────────────────

test("US-12: invalid UUID returns 422 without DB query", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await cancelConnectionRequest(client, "not-a-uuid");
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "INVALID_INPUT");
});

test("US-12: unauthenticated request returns 401", async () => {
  const client = db(() => null, false);
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 401);
});

// ── cancelConnectionRequest: AC3 — only sender can cancel ─────────────────────

test("US-12 AC3: connection not owned by requester returns 404", async () => {
  const client = cancelDb({ fetchRow: null });
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 404);
});

test("US-12 AC3: connection belonging to another user returns 404 (RLS layer)", async () => {
  // The SELECT filters by both id and requester_id=userId, so another user's row is simply not found
  const client = cancelDb({ fetchRow: null });
  const res = await cancelConnectionRequest(client, otherConnId);
  assert.equal(res.status, 404);
});

// ── cancelConnectionRequest: AC2 — non-pending cannot be cancelled ─────────────

test("US-12 AC2: cancelling an accepted request returns 409 NOT_CANCELLABLE", async () => {
  const client = cancelDb({ fetchRow: { id: connId, status: "accepted" } });
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "NOT_CANCELLABLE");
  assert.equal(body.current_status, "accepted");
});

test("US-12 AC2: cancelling a rejected request returns 409 NOT_CANCELLABLE", async () => {
  const client = cancelDb({ fetchRow: { id: connId, status: "rejected" } });
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_CANCELLABLE");
});

test("US-12 AC2: cancelling a blocked request returns 409 NOT_CANCELLABLE", async () => {
  const client = cancelDb({ fetchRow: { id: connId, status: "blocked" } });
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_CANCELLABLE");
});

test("US-12 AC2: cancelling an already-cancelled request returns 409 NOT_CANCELLABLE", async () => {
  const client = cancelDb({ fetchRow: { id: connId, status: "cancelled" } });
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_CANCELLABLE");
});

// ── cancelConnectionRequest: AC1 — happy path ────────────────────────────────

test("US-12 AC1: pending request is cancelled — returns 200 with status=cancelled", async () => {
  const client = cancelDb();
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, connId);
  assert.equal(body.status, "cancelled");
});

test("US-12 AC1: race condition — UPDATE finds 0 rows (accepted between select & update) → 409 STATUS_CHANGED", async () => {
  const client = cancelDb({ updateRow: null }); // fetchRow=pending but UPDATE returns null
  const res = await cancelConnectionRequest(client, connId);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "STATUS_CHANGED");
});

test("US-12: response Cache-Control is private, no-store", async () => {
  const res = await cancelConnectionRequest(cancelDb(), connId);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

test("US-12: DB error returns 503", async () => {
  const res = await cancelConnectionRequest(cancelDb({ dbError: true }), connId);
  assert.equal(res.status, 503);
});

// ── getSentRequests ───────────────────────────────────────────────────────────

const sentRow = {
  id: connId,
  receiver_id: receiverId,
  session_topic: "React Hooks deep dive",
  proposed_start: "2026-11-15T14:00:00.000Z",
  proposed_end: "2026-11-15T16:00:00.000Z",
  message: "Hey, want to study together?",
  status: "pending",
  created_at: "2026-11-11T10:00:00.000Z",
};

function sentDb(overrides: { connections?: unknown; goals?: unknown; error?: boolean } = {}) {
  return db((url) => {
    if (url.pathname === "/rest/v1/connections" && url.searchParams.has("requester_id")) {
      if (overrides.error) {
        return new Response(JSON.stringify({ code: "PGRST301", message: "db error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return overrides.connections !== undefined ? overrides.connections : [sentRow];
    }
    if (
      url.pathname === "/rest/v1/matching_goals" &&
      url.searchParams.get("user_id")?.startsWith("in.")
    ) {
      return overrides.goals !== undefined
        ? overrides.goals
        : [{ user_id: receiverId, display_name: "Sam Park" }];
    }
    return null;
  });
}

test("US-12 getSentRequests: unauthenticated returns 401", async () => {
  const client = db(() => null, false);
  const res = await getSentRequests(client);
  assert.equal(res.status, 401);
});

test("US-12 getSentRequests: returns 200 with sent requests array", async () => {
  const res = await getSentRequests(sentDb());
  assert.equal(res.status, 200);
  const { requests } = await res.json();
  assert.ok(Array.isArray(requests));
  assert.equal(requests.length, 1);
});

test("US-12 getSentRequests: request includes session_topic, times, status, created_at", async () => {
  const res = await getSentRequests(sentDb());
  const { requests } = await res.json();
  const r = requests[0];
  assert.equal(r.session_topic, sentRow.session_topic);
  assert.equal(r.proposed_start, sentRow.proposed_start);
  assert.equal(r.proposed_end, sentRow.proposed_end);
  assert.equal(r.status, "pending");
  assert.equal(r.created_at, sentRow.created_at);
});

test("US-12 getSentRequests: receiver display name fetched from matching_goals", async () => {
  const res = await getSentRequests(sentDb());
  const { requests } = await res.json();
  assert.equal(requests[0].receiver_display_name, "Sam Park");
});

test("US-12 getSentRequests: receiver_display_name is null when no goal found", async () => {
  const res = await getSentRequests(sentDb({ goals: [] }));
  const { requests } = await res.json();
  assert.equal(requests[0].receiver_display_name, null);
});

test("US-12 getSentRequests: empty array when no sent requests", async () => {
  const res = await getSentRequests(sentDb({ connections: [], goals: [] }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).requests.length, 0);
});

test("US-12 getSentRequests: cancelled request appears (not filtered out)", async () => {
  const cancelled = { ...sentRow, status: "cancelled" };
  const res = await getSentRequests(sentDb({ connections: [cancelled] }));
  const { requests } = await res.json();
  assert.equal(requests[0].status, "cancelled");
});

test("US-12 getSentRequests: DB error returns 503", async () => {
  const res = await getSentRequests(sentDb({ error: true }));
  assert.equal(res.status, 503);
});

test("US-12 getSentRequests: Cache-Control is private, no-store", async () => {
  const res = await getSentRequests(sentDb());
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});
