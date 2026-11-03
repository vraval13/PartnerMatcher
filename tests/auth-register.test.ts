/**
 * US-22 — Register a Student Account
 * Tests for /api/auth/register (dev-only pre-confirmation endpoint).
 *
 * AC1: Creates an account with email_confirm:true so the user can sign in
 *      immediately in development without clicking a confirmation link.
 * AC2: Rejects duplicate email with 409 and an intelligible message.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { processRegister, POST } from "../app/api/auth/register/route";

const userId = "11111111-1111-4111-8111-111111111111";

function makeAdmin(opts: {
  userId?: string;
  error?: { message: string };
  captureCall?: (params: object) => void;
}) {
  return {
    createUser: async (params: object) => {
      opts.captureCall?.(params);
      if (opts.error) return { data: null, error: opts.error };
      return { data: { user: { id: opts.userId ?? userId } }, error: null };
    },
  };
}

// ── AC1: successful registration ─────────────────────────────────────────────

test("US-22 AC1: returns 201 with userId on successful registration", async () => {
  const res = await processRegister(makeAdmin({}), {
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.userId, userId);
});

test("US-22 AC1: creates user with email_confirm:true so no confirmation email is sent", async () => {
  let captured: Record<string, unknown> = {};
  await processRegister(
    makeAdmin({ captureCall: (p) => (captured = p as Record<string, unknown>) }),
    { name: "Bob", email: "bob@nyu.edu", password: "securepass" }
  );
  assert.equal(captured.email_confirm, true, "email_confirm must be true");
  assert.equal(
    (captured.user_metadata as { full_name: string }).full_name,
    "Bob",
    "full_name must be stored in metadata"
  );
});

test("US-22 AC1: forwards the supplied name, email and password to the admin API", async () => {
  let captured: Record<string, unknown> = {};
  await processRegister(
    makeAdmin({ captureCall: (p) => (captured = p as Record<string, unknown>) }),
    { name: "Carol", email: "carol@example.com", password: "mypassword" }
  );
  assert.equal(captured.email, "carol@example.com");
  assert.equal(captured.password, "mypassword");
});

// ── AC1: validation — missing fields ────────────────────────────────────────

test("US-22 AC1: returns 400 when email is missing", async () => {
  const res = await processRegister(makeAdmin({}), { name: "Dave", password: "pw" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /missing/i);
});

test("US-22 AC1: returns 400 when name is missing", async () => {
  const res = await processRegister(makeAdmin({}), { email: "e@e.com", password: "pw" });
  assert.equal(res.status, 400);
});

test("US-22 AC1: returns 400 when password is missing", async () => {
  const res = await processRegister(makeAdmin({}), { name: "Eve", email: "e@e.com" });
  assert.equal(res.status, 400);
});

test("US-22 AC1: returns 400 when all fields are missing", async () => {
  const res = await processRegister(makeAdmin({}), {});
  assert.equal(res.status, 400);
});

// ── AC2: duplicate email ─────────────────────────────────────────────────────

test('US-22 AC2: returns 409 when Supabase says "already registered"', async () => {
  const res = await processRegister(makeAdmin({ error: { message: "User already registered" } }), {
    name: "Frank",
    email: "frank@example.com",
    password: "pass1234",
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.match(body.error, /already exists/i);
});

test('US-22 AC2: returns 409 when Supabase says "already exists"', async () => {
  const res = await processRegister(
    makeAdmin({ error: { message: "A user with this email already exists" } }),
    { name: "Grace", email: "grace@example.com", password: "pass1234" }
  );
  assert.equal(res.status, 409);
});

test("US-22 AC2: does NOT expose raw Supabase error text for duplicate email", async () => {
  const res = await processRegister(
    makeAdmin({ error: { message: "User already registered — internal detail" } }),
    { name: "Henry", email: "h@example.com", password: "pass" }
  );
  const body = await res.json();
  assert.doesNotMatch(body.error, /internal detail/i);
});

test("US-22 AC2: non-duplicate Supabase error returns 400 (not 409)", async () => {
  const res = await processRegister(makeAdmin({ error: { message: "Password too weak" } }), {
    name: "Ivy",
    email: "i@example.com",
    password: "pw",
  });
  assert.equal(res.status, 400);
});

// ── Production guard ─────────────────────────────────────────────────────────

test("US-22 AC1: production guard — POST returns 404 in production", async () => {
  const original = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Test", email: "t@t.com", password: "pw" }),
      })
    );
    assert.equal(res.status, 404);
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = original;
  }
});
