/**
 * US-12 — Cancel a Sent Connection Request
 *
 * AC1: pending → cancelled; request no longer presented to recipient as active.
 * AC2: accepted/rejected/blocked/already-cancelled → 409 NOT_CANCELLABLE.
 * AC3: only the original sender can cancel (other users' requests return 404).
 *
 * getSentRequests (GET /api/v1/connections/sent) is covered by its own story,
 * US-10 — see tests/connections-sent.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { cancelConnectionRequest } from "../lib/connections/http";

// ── fixed ids ─────────────────────────────────────────────────────────────────

const requesterId = "11111111-1111-4111-8111-111111111111";
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
