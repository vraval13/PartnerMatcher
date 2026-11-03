/**
 * US-22 AC5 — Logout protects every protected page until re-login
 * US-23 AC1 — After registration/OAuth, user is sent to /onboarding
 * US-23 AC6 — Already-onboarded user is redirected from /onboarding to /dashboard
 *
 * Tests the pure `resolveRoute(user, onboarded, pathname)` function extracted
 * from middleware.ts. Each test maps to a specific routing rule and AC.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRoute } from "../middleware";

// ── Unauthenticated user (US-22 AC5) ────────────────────────────────────────

test("US-22 AC5: unauthenticated user visiting /dashboard is redirected to /signin", () => {
  assert.equal(resolveRoute(false, false, "/dashboard"), "/signin");
});

test("US-22 AC5: unauthenticated user visiting /dashboard/profile is redirected to /signin", () => {
  assert.equal(resolveRoute(false, false, "/dashboard/profile"), "/signin");
});

test("US-22 AC5: unauthenticated user visiting /onboarding is redirected to /signin", () => {
  assert.equal(resolveRoute(false, false, "/onboarding"), "/signin");
});

test("US-22 AC5: unauthenticated user visiting /signin is allowed through (no redirect)", () => {
  assert.equal(resolveRoute(false, false, "/signin"), null);
});

test("US-22 AC5: unauthenticated user visiting /signup is allowed through (no redirect)", () => {
  assert.equal(resolveRoute(false, false, "/signup"), null);
});

test("US-22 AC5: unauthenticated user visiting / (landing page) is allowed through", () => {
  assert.equal(resolveRoute(false, false, "/"), null);
});

// ── Authenticated + not yet onboarded (US-23 AC1) ───────────────────────────

test("US-23 AC1: authenticated but not onboarded visiting /dashboard is sent to /onboarding", () => {
  assert.equal(resolveRoute(true, false, "/dashboard"), "/onboarding");
});

test("US-23 AC1: authenticated but not onboarded visiting /signin is sent to /onboarding", () => {
  assert.equal(resolveRoute(true, false, "/signin"), "/onboarding");
});

test("US-23 AC1: authenticated but not onboarded visiting /signup is sent to /onboarding", () => {
  assert.equal(resolveRoute(true, false, "/signup"), "/onboarding");
});

test("US-23 AC1: authenticated but not onboarded is allowed to stay on /onboarding (no loop)", () => {
  assert.equal(resolveRoute(true, false, "/onboarding"), null);
});

test("US-23 AC1: authenticated but not onboarded visiting /profile is allowed through", () => {
  // /profile is not in the protected set — middleware does not block it
  assert.equal(resolveRoute(true, false, "/profile"), null);
});

// ── Authenticated + onboarded (US-22 AC5 continued, US-23 AC6) ──────────────

test("US-23 AC6: onboarded user visiting /onboarding is redirected to /dashboard", () => {
  assert.equal(resolveRoute(true, true, "/onboarding"), "/dashboard");
});

test("US-22 AC5 / US-23 AC6: onboarded user visiting /signin is redirected to /dashboard", () => {
  assert.equal(resolveRoute(true, true, "/signin"), "/dashboard");
});

test("US-22 AC5 / US-23 AC6: onboarded user visiting /signup is redirected to /dashboard", () => {
  assert.equal(resolveRoute(true, true, "/signup"), "/dashboard");
});

test("US-22 AC5: onboarded user visiting /dashboard is allowed through", () => {
  assert.equal(resolveRoute(true, true, "/dashboard"), null);
});

test("US-22 AC5: onboarded user visiting /profile is allowed through", () => {
  assert.equal(resolveRoute(true, true, "/profile"), null);
});

test("US-22 AC5: onboarded user visiting /profile/courses is allowed through", () => {
  assert.equal(resolveRoute(true, true, "/profile/courses"), null);
});

test("US-22 AC5: onboarded user visiting / (landing page) is allowed through", () => {
  assert.equal(resolveRoute(true, true, "/"), null);
});

// ── Edge cases ───────────────────────────────────────────────────────────────

test("resolveRoute: /dashboard/settings is treated as /dashboard prefix (protected)", () => {
  assert.equal(resolveRoute(false, false, "/dashboard/settings"), "/signin");
});

test("resolveRoute: /onboarding/step/2 is treated as /onboarding prefix", () => {
  assert.equal(resolveRoute(true, true, "/onboarding/step/2"), "/dashboard");
});
