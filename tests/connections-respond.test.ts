/**
 * US-13 — Respond to a Connection Request
 *
 * AC1: accept → status "accepted"; decline → status "rejected".
 * AC2: only pending requests can be responded to (others → 409 NOT_RESPONDABLE).
 * AC3: only the receiver can respond (others → 404).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { respondToConnectionRequest } from "../lib/connections/http";

// ── fixed ids ─────────────────────────────────────────────────────────────────

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
        data: { user: signedIn ? { id: receiverId } : null },
        error: signedIn ? null : new Error("No session"),
      }),
    },
  });
  return client;
}

/** Builds a stub that handles both SELECT and UPDATE for respond. */
function respondDb(
  opts: {
    fetchRow?: { id: string; status: string } | null;
    updateRow?: { id: string; status: string } | null;
    dbError?: boolean;
  } = {}
) {
  const fetchRow = opts.fetchRow !== undefined ? opts.fetchRow : { id: connId, status: "pending" };
  const updateRow =
    opts.updateRow !== undefined ? opts.updateRow : { id: connId, status: "accepted" };

  return db((url, init) => {
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

// ── input validation ──────────────────────────────────────────────────────────

test("US-13: invalid UUID returns 422 without DB query", async () => {
  const client = db(() => {
    throw new Error("Must not query DB");
  });
  const res = await respondToConnectionRequest(client, "not-a-uuid", "accept");
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "INVALID_INPUT");
});

test("US-13: unauthenticated request returns 401", async () => {
  const client = db(() => null, false);
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 401);
});

// ── AC3 — only receiver can respond ──────────────────────────────────────────

test("US-13 AC3: request not owned by receiver returns 404", async () => {
  const client = respondDb({ fetchRow: null });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 404);
});

test("US-13 AC3: another user's request returns 404 (receiver_id filter)", async () => {
  const client = respondDb({ fetchRow: null });
  const res = await respondToConnectionRequest(client, otherConnId, "decline");
  assert.equal(res.status, 404);
});

// ── AC2 — only pending can be responded to ────────────────────────────────────

test("US-13 AC2: responding to accepted request returns 409 NOT_RESPONDABLE", async () => {
  const client = respondDb({ fetchRow: { id: connId, status: "accepted" } });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "NOT_RESPONDABLE");
  assert.equal(body.current_status, "accepted");
});

test("US-13 AC2: responding to rejected request returns 409 NOT_RESPONDABLE", async () => {
  const client = respondDb({ fetchRow: { id: connId, status: "rejected" } });
  const res = await respondToConnectionRequest(client, connId, "decline");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_RESPONDABLE");
});

test("US-13 AC2: responding to cancelled request returns 409 NOT_RESPONDABLE", async () => {
  const client = respondDb({ fetchRow: { id: connId, status: "cancelled" } });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_RESPONDABLE");
});

test("US-13 AC2: responding to blocked request returns 409 NOT_RESPONDABLE", async () => {
  const client = respondDb({ fetchRow: { id: connId, status: "blocked" } });
  const res = await respondToConnectionRequest(client, connId, "decline");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "NOT_RESPONDABLE");
});

// ── AC1 — happy path ──────────────────────────────────────────────────────────

test("US-13 AC1: accept sets status to accepted — returns 200", async () => {
  const client = respondDb({ updateRow: { id: connId, status: "accepted" } });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, connId);
  assert.equal(body.status, "accepted");
});

test("US-13 AC1: decline sets status to rejected — returns 200", async () => {
  const client = respondDb({ updateRow: { id: connId, status: "rejected" } });
  const res = await respondToConnectionRequest(client, connId, "decline");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, connId);
  assert.equal(body.status, "rejected");
});

test("US-13 AC1: race condition — UPDATE finds 0 rows → 409 STATUS_CHANGED", async () => {
  const client = respondDb({ updateRow: null });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "STATUS_CHANGED");
});

// ── error handling ────────────────────────────────────────────────────────────

test("US-13: DB error returns 503", async () => {
  const client = respondDb({ dbError: true });
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.status, 503);
});

test("US-13: response Cache-Control is private, no-store", async () => {
  const client = respondDb();
  const res = await respondToConnectionRequest(client, connId, "accept");
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

// ── route dispatch ────────────────────────────────────────────────────────────

test("US-13: decline action returns rejected status", async () => {
  const client = respondDb({ updateRow: { id: connId, status: "rejected" } });
  const res = await respondToConnectionRequest(client, connId, "decline");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "rejected");
});
