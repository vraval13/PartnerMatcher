/**
 * US-22 AC3 — Correct credentials → session + redirect (error-free path)
 * US-22 AC4 — Wrong credentials → one generic message that does not reveal which field was wrong
 *
 * Tests the classifySignInError() helper that maps Supabase error messages to
 * user-facing strings. The sign-in page (app/signin/page.tsx) delegates to
 * this function so there is a single source of truth for all error copy.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySignInError } from "../lib/auth/errors";

// ── AC4: wrong credentials — generic message ─────────────────────────────────

test("US-22 AC4: wrong password produces the generic credentials message", () => {
  const msg = classifySignInError("Invalid login credentials");
  assert.equal(msg, "Credentials are incorrect. Please try again.");
});

test("US-22 AC4: wrong email produces the same generic credentials message", () => {
  // Supabase returns the same error for wrong email and wrong password (AC4 requirement)
  const msg = classifySignInError("Invalid login credentials");
  assert.equal(msg, "Credentials are incorrect. Please try again.");
});

test("US-22 AC4: generic message does not say which field (email vs password) was wrong", () => {
  const msg = classifySignInError("Invalid login credentials");
  assert.doesNotMatch(msg, /email/i);
  assert.doesNotMatch(msg, /password/i);
});

test("US-22 AC4: unknown Supabase error falls back to the generic credentials message", () => {
  const msg = classifySignInError("Some unexpected error from the server");
  assert.equal(msg, "Credentials are incorrect. Please try again.");
});

test("US-22 AC4: raw Supabase error text is never shown to the user", () => {
  const rawError = "Internal pg error: authentication service unreachable";
  const msg = classifySignInError(rawError);
  // The message shown to the user must not contain raw internal detail
  assert.doesNotMatch(msg, /pg error/i);
  assert.doesNotMatch(msg, /authentication service/i);
});

// ── AC3 / AC1: unconfirmed email ─────────────────────────────────────────────

test("US-22 AC1/AC3: unconfirmed email produces the confirmation prompt", () => {
  const msg = classifySignInError("Email not confirmed");
  assert.match(msg, /confirm/i);
  assert.match(msg, /inbox/i);
});

test("US-22 AC1/AC3: message is case-insensitive — lower case variant also matches", () => {
  const msg = classifySignInError("email not confirmed");
  assert.match(msg, /confirm/i);
});

test("US-22 AC1/AC3: confirmation prompt does not say 'credentials are incorrect'", () => {
  const msg = classifySignInError("Email not confirmed");
  assert.doesNotMatch(msg, /credentials are incorrect/i);
});

test("US-22 AC1/AC3: confirmation message mentions checking the inbox", () => {
  const msg = classifySignInError("Email Not Confirmed");
  assert.match(msg, /inbox/i);
});
