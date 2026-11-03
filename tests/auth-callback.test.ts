/**
 * US-22 AC6 — OAuth Callback
 * Covers the /auth/callback route:
 *   - safeNext: open-redirect prevention (only relative paths allowed)
 *   - processCallback: valid code exchanges the session and redirects to `next`
 *   - processCallback: bad/missing code redirects to /signin?error=auth_callback_failed
 *   - processCallback: provider failure returns to /signin with error and no session
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, processCallback } from "../app/auth/callback/route";

const origin = "https://partnermatcher.vercel.app";
function url(path: string) {
  return new URL(`${origin}${path}`);
}

// ── safeNext — open-redirect prevention ─────────────────────────────────────

test("US-22 AC6: safeNext(null) defaults to /dashboard", () => {
  assert.equal(safeNext(null), "/dashboard");
});

test("US-22 AC6: safeNext('') defaults to /dashboard", () => {
  assert.equal(safeNext(""), "/dashboard");
});

test("US-22 AC6: safeNext('/onboarding') allows the relative path", () => {
  assert.equal(safeNext("/onboarding"), "/onboarding");
});

test("US-22 AC6: safeNext('/dashboard/profile') allows nested relative path", () => {
  assert.equal(safeNext("/dashboard/profile"), "/dashboard/profile");
});

test("US-22 AC6: safeNext('//evil.com') rejects protocol-relative URL → /dashboard", () => {
  assert.equal(safeNext("//evil.com"), "/dashboard");
});

test("US-22 AC6: safeNext('https://evil.com') rejects external URL → /dashboard", () => {
  assert.equal(safeNext("https://evil.com"), "/dashboard");
});

test("US-22 AC6: safeNext('http://evil.com/path') rejects absolute URL → /dashboard", () => {
  assert.equal(safeNext("http://evil.com/path"), "/dashboard");
});

test("US-22 AC6: safeNext with URL-encoded slash '/%2Fevil' still accepted (relative)", () => {
  // Encoded slashes don't start with // and don't bypass the check
  assert.equal(safeNext("/%2Fevil"), "/%2Fevil");
});

// ── processCallback — happy path ─────────────────────────────────────────────

test("US-22 AC6: valid code with no next param redirects to /dashboard", async () => {
  const { redirect } = await processCallback(url("/auth/callback?code=valid-code"), async () => ({
    error: null,
  }));
  assert.equal(redirect, `${origin}/dashboard`);
});

test("US-22 AC6: valid code with next=/onboarding redirects to /onboarding", async () => {
  const { redirect } = await processCallback(
    url("/auth/callback?code=valid-code&next=/onboarding"),
    async () => ({ error: null })
  );
  assert.equal(redirect, `${origin}/onboarding`);
});

test("US-22 AC6: valid code calls the exchange function exactly once", async () => {
  let calls = 0;
  await processCallback(url("/auth/callback?code=abc"), async () => {
    calls++;
    return { error: null };
  });
  assert.equal(calls, 1);
});

test("US-22 AC6: valid code passes the code to the exchange function", async () => {
  let received = "";
  await processCallback(url("/auth/callback?code=MY-CODE-XYZ"), async (code) => {
    received = code;
    return { error: null };
  });
  assert.equal(received, "MY-CODE-XYZ");
});

// ── processCallback — failure paths ──────────────────────────────────────────

test("US-22 AC6: missing code redirects to /signin?error=auth_callback_failed", async () => {
  const { redirect } = await processCallback(
    url("/auth/callback"),
    async () => ({ error: null }) // exchange not called
  );
  assert.equal(redirect, `${origin}/signin?error=auth_callback_failed`);
});

test("US-22 AC6: provider error redirects to /signin?error=auth_callback_failed", async () => {
  const { redirect } = await processCallback(url("/auth/callback?code=bad-code"), async () => ({
    error: { message: "OAuth provider rejected the token" },
  }));
  assert.equal(redirect, `${origin}/signin?error=auth_callback_failed`);
});

test("US-22 AC6: provider error does not leak internal message in the redirect URL", async () => {
  const { redirect } = await processCallback(url("/auth/callback?code=bad"), async () => ({
    error: { message: "internal token detail" },
  }));
  assert.doesNotMatch(redirect, /internal token detail/);
});

test("US-22 AC6: open-redirect in next param is stripped even with valid code", async () => {
  const { redirect } = await processCallback(
    url("/auth/callback?code=ok&next=//evil.com"),
    async () => ({ error: null })
  );
  assert.equal(redirect, `${origin}/dashboard`);
});

test("US-22 AC6: exchange is NOT called when no code is present", async () => {
  let called = false;
  await processCallback(url("/auth/callback?next=/dashboard"), async () => {
    called = true;
    return { error: null };
  });
  assert.equal(called, false);
});
