# Changelog

All notable changes to PartnerMatcher are documented here.  
Format: `[version] — YYYY-MM-DD` · `Added` · `Changed` · `Fixed` · `Removed`

---

## [0.8.1] — 2026-11-25 (US-10 — View Sent Connection Requests)

### Added

- **`tests/connections-sent.test.ts`** — 10 new tests giving US-10 its own dedicated test file: AC1 (recipient, topic, proposed time, request date, status all present and correctly mapped per row), AC2 (own-requests-only isolation proven across two different signed-in users against a shared fixture that contains both users' rows, not just a filter-presence check), AC3 (no sent requests returns an empty array, not an error), plus result ordering (`created_at.desc`), every status rendered (not just pending), a DB-error path, and the `Cache-Control: private, no-store` header

### Changed

- **Story attribution**: `getSentRequests()` (`GET /api/v1/connections/sent`) shipped earlier as part of US-11's "sent" tab but had never been credited or tested against its own story. It is now documented and tested under US-10, and `lib/connections/http.ts`'s section comment/AC notes were corrected (previously mislabeled "US-12")
- **Test relocation**: the 9 `getSentRequests` tests previously embedded in `tests/connections-cancel.test.ts` (and mislabeled `"US-12 getSentRequests: ..."`) were removed from that file and superseded by the 10 tests in the new dedicated file — net **+1 test**, total now **225 tests**
- **`docs/features.md`** / **`README.md`**: "List sent" now attributed to US-10 (was folded into US-11); Sprint 5 renamed to credit both US-09 and US-10

---

## [0.8.0] — 2026-11-25 (US-09 — Duplicate Connection Request Prevention)

### Added

- **`goal_id` / `candidate_goal_id` columns on `connections`** — persist the requester's own matching goal and the candidate's matching goal that identifies the proposed session, so a later request can be checked against it
- **Partial unique index `idx_connections_unique_pending_session`** on `(requester_id, candidate_goal_id, proposed_start, proposed_end) WHERE status = 'pending'` — enforces at most one pending request per requester/session/time-window combination at the database level
- **Pre-insert duplicate check** in `sendConnectionRequest()` (`lib/connections/http.ts`) — returns `409 DUPLICATE_REQUEST` with the message "An identical connection request for this session is already pending." when an identical pending request already exists
- **`tests/connections-duplicate.test.ts`** — 9 new tests covering AC1–AC5, the insert-time `23505` race fallback, and that `goal_id`/`candidate_goal_id` are persisted on insert

### Changed

- **Duplicate-request detection**: replaced the blanket `UNIQUE (requester_id, receiver_id)` constraint (which permanently blocked any second request between two users, regardless of session or status) with the session-scoped partial unique index above. A different course/skill/topic/assignment/exam, a different proposed time window, a different candidate, or a prior request that was declined/cancelled no longer blocks a new request
- **Migration**: `20261125000000_us09_duplicate_connection_prevention.sql` drops the old constraint (looked up by definition rather than a hardcoded name) and adds the new columns/index
- **`PartnersClient.tsx` match-card actions**: the "Send request" button is no longer hidden while a request to that candidate is pending or after it was declined — both are valid cases for a new (different-session) request under AC3/AC5, so the UI no longer blocks them. Declined requests now show a distinct "Declined" chip instead of the generic "Request sent" chip.

---

## [0.7.0] — 2026-11-17 (Sprint 4 — UI Redesign & Design System)

### Added

- **Teal brand token system** — five new CSS custom properties in `globals.css`: `--brand`, `--brand-strong`, `--brand-fg`, `--brand-soft-bg`, `--brand-soft-border`; defined for both light (`:root`) and dark (`.dark`) modes
- **Sidebar bottom section** (`app/dashboard/Sidebar.tsx`) — three pinned items below a divider:
  - Profile row: user initials chip (teal soft-bg) + display name + "View profile" subtitle, links to `/profile`, active-highlights when on that route
  - Dark/light theme toggle: sun/moon icon button, label reads "Dark mode" / "Light mode"; calls `useTheme().toggle()`
  - Sign out button: consistent icon + label
- **Sidebar logo** — replaced placeholder "PM" square with the same rainbow-arc SVG + two-tone wordmark used on the landing page navbar; all strokes now use `var(--brand)` instead of hardcoded `#6366f1`
- **Partners page header** (`PartnersClient.tsx`) — eyebrow label "Partner matching" (teal), `h1`, description paragraph, and theme toggle button matching the other three pages' header pattern
- **Partners connect-request modal** — proper card surface (`--bg-card`) with border, themed heading, brand-colored submit button, card-outline cancel button

### Changed

- **Brand color**: every `bg-indigo-600`, `text-indigo-500`, and `#6366f1` reference across `Sidebar.tsx`, `ProfileClient.tsx`, `CoursesClient.tsx`, `PartnersClient.tsx`, `RequestsClient.tsx` replaced with the new `var(--brand)` / `var(--brand-soft-bg)` / `var(--brand-strong)` tokens
- **`globals.css`**: `--shadow-card` and `--nav-shadow` updated to teal-based rgba; `.gradient-text-animated` gradient stops changed from indigo/purple to teal/cyan; `.card-3d` hover glow and `pulse-ring` keyframe box-shadow changed from `rgba(99,102,241,…)` to `rgba(13,148,136,…)` (light) / `rgba(45,212,191,…)` (dark)
- **Sidebar layout**: changed from single scrolling `aside` to `flex flex-col`; nav section scrolls independently; bottom section is `shrink-0` (always visible)
- **Profile card banner** (`ProfileClient.tsx`): top strip changed from flat `var(--text-heading)` to `linear-gradient(135deg, var(--brand), var(--brand-strong))`
- **Profile completion bar** and percentage text: changed from `#6366f1` to `var(--brand)`
- **Save buttons** on Profile and Courses pages: changed from `var(--text-heading)` / `var(--bg-page)` to `var(--brand)` / `var(--brand-fg)`
- **Requests tab switcher**: active tab background changed from `var(--text-heading)` to `var(--brand)`; pending count badge changed from `#6366f1` to `var(--brand)` when inactive
- **PartnersClient `inputClass`**: redefined from raw `border-slate-500/40 bg-transparent` to fully-themed string using `--bg-card-inner`, `--border-card`, `--text-heading`, focus ring via `--brand-soft-bg` / `--brand`
- **Partners card sections**: all five bordered-but-transparent containers now have explicit `var(--bg-card)` or `var(--bg-card-inner)` backgrounds
- **Partners buttons**: six primary buttons → `var(--brand)` / `var(--brand-fg)`; five outline buttons → `var(--bg-card)` / `var(--border-card)` / `var(--text-sub)`
- **Partners banners**: error banners use `rgba(220,38,38,…)` pattern; info/status banner uses `var(--brand-soft-border)` / `var(--brand-soft-bg)` / `var(--brand-strong)`
- **Partners match-result cards**: score displayed as a teal soft-bg chip; name uses `--text-heading`

### Fixed

- **`CoursesClient.tsx`** — `uidCounter.current` was read inside the `useState` lazy initializer (render-phase ref access; `react-hooks/refs` lint error). Fixed by seeding UIDs from the array index during initialisation and starting the counter at `initialCourses.length`.
- **`RequestsClient.tsx`** — `window.location.hash = v` was assigned directly in the `switchView` event handler (`react-hooks/immutability` lint error). Moved into a `useEffect` keyed on `view`, with a `useRef` sentinel that skips the first mount to avoid rewriting the hash that drove the initial tab state. Added `useRef` to the React import.
- **Navbar.tsx logo**: strokes remain `#6366f1` on the public landing page (by design, the landing page has not been rebanded — only the authenticated app shell has changed).

---

## [0.6.0] — 2026-11-11 (Sprint 3 — Matching, Connections & Partner Features)

### Added

- **US-01: Matching goal creation** — `POST /api/v1/matching-goals`; validates category, subject, proficiency, timezone, availability; `lib/matching/information.ts` for field schemas and error types
- **US-02: Availability CRUD** — `POST/DELETE /api/v1/availability`; `lib/availability/` for time-format, IANA timezone, day-of-week validation and 21-slot cap; `AvailabilityClient.tsx`
- **US-04 / US-05: Course + assignment matching** — `POST /api/v1/matches`; `lib/matching/engine.ts` (`rankCandidates()`) scores topic 40%, availability 35%, location 25%; assignment mode adds due-date urgency multiplier
- **US-07: Exam preparation + practice partner matching** — exam-date fields (`exam_date`, `prep_start`, `prep_end`); `exam_prep` and `skill_practice` categories with their own weight profiles
- **US-08: Send connection request** — `POST /api/v1/connections`; `session_topic`, `proposed_start`, `proposed_end` fields; `isEligibleCandidate()` eligibility check; 409 duplicate guard
- **US-11: List connection requests** — `GET /api/v1/connections` (received); `GET /api/v1/connections/sent`; both return paginated results with status and partner metadata
- **US-12: Cancel sent request** — `PATCH /api/v1/connections/[id]` (sender path); terminal-state guard (cannot cancel accepted/rejected/blocked)
- **US-13: Accept / decline received request** — `PATCH /api/v1/connections/[id]` with `action: "accept" | "decline"`; ownership guard (receiver only)
- **US-16: Pause / resume matching** — `PATCH /api/v1/matching-status`; hides all listed goals from new searches; existing accepted connections unaffected; `lib/matching/status.ts`
- **US-17: Favorite partners** — `POST/DELETE /api/v1/favorites`; persisted per user; `lib/favorites/http.ts`; star/heart icon on match-result cards
- **US-25: Dynamic dashboard** — right sidebar (`RightSidebar.tsx`) with mini calendar, upcoming study sessions, profile summary card; left sidebar extracted to shared `Sidebar.tsx`
- **Partner profile preview** — `/partners/profile/[goalId]` page showing courses, weekly availability, compatibility score breakdown
- **`PartnersClient.tsx`** — full partner-search UI: create goal form, goal selector, Find partners search, match-result cards, connect-request modal
- **`RequestsClient.tsx`** — received/sent tab switcher, filter bar (status/sort/search), `ReceivedCard` / `SentCard` components, stat tiles, accept/decline/cancel actions
- **`ProfileClient.tsx`** — full profile editor with 4 numbered sections, profile-completion progress bar, sidebar summary card
- **`CoursesClient.tsx`** — course management with per-field validation, quota badge, dirty-state detection, cancel-with-discard
- **39 new tests**: `connections-cancel.test.ts` (21), `connections-respond.test.ts` (14), `matching-status.test.ts` (4) — total **191 tests**

### Changed

- **Dashboard**: replaced hardcoded suggested partners with dynamic match data; added right sidebar with calendar and profile card
- **`Sidebar.tsx`**: extracted from `DashboardClient.tsx` into a shared component imported by all five app pages

### Fixed

- `fix(us-16)`: restrict paused-goal status lookup — only the goal owner can read their own paused goals; peers cannot see them in search
- `fix(us-16)`: handle paused profiles returned by cached match results — UI correctly shows "Listed (paused)" state

---

## [0.5.0] — 2026-11-01 (Sprint 2 — US-22 + US-23 production hardening)

### Added

- **Docs reorganised** — SQL files moved to `docs/sql/` and gitignored; `architecture.md`, `database.md`, `deployment.md`, `features.md`, `skills.md`, `api.md`, `changelog.md`, `contributing.md` all updated to reflect Sprint 4 state

### Changed

- **`supabase_schema.sql`** → `docs/sql/supabase_schema.sql` — complete fresh-install schema covering all 11 tables, 9 enums, triggers, RLS, `profiles.email`, `profiles.onboarded_at`, partial unique index on courses
- **`fix_profile_trigger.sql`** → `docs/sql/fix_profile_trigger.sql` — 8 idempotent migration patches; Patch 0 added to ensure column additions run before any INSERT references them

### Fixed

- SQL syntax error in Patch 7: `ADD CONSTRAINT IF NOT EXISTS` is invalid PostgreSQL — replaced with `DO $$ ... $$` guards checking `pg_constraint`
- Column-order bug: `profiles.email` INSERT in Patch 1 failed because `ADD COLUMN` was in Patch 3 — moved both `ADD COLUMN` statements to a new Patch 0 at the top

---

## [0.4.0] — 2026-10-31 (Sprint 4 — US-22 + US-23 production code)

### Added

- **`frontend/lib/supabase/`** — `client.ts` (browser), `server.ts` (SSR cookie), `admin.ts` (service role, dev only)
- **Sign-up page** (`/signup`) — email + password form with name field, OAuth buttons (GitHub / Google), confirmation-email sent state, Show/Hide password toggle
- **OAuth callback handler** (`/auth/callback/route.ts`) — `exchangeCodeForSession()`, `safeNext()` open-redirect prevention, redirects to `next` param or `/dashboard`
- **Admin register route** (`/api/auth/register/route.ts`) — dev-only pre-confirmed account creation; returns 404 in production
- **Onboarding wizard** (`/onboarding/OnboardingClient.tsx`) — 7-question typeform-style flow; directional slide animation; profile + course saves; `onboarded_at` set on completion
- **`currentSemester()`** helper — computes Spring/Summer/Fall + year from current date; replaces hardcoded `"Fall 2026"`
- **`profiles.onboarded_at`** column — canonical onboarding state; replaces `university IS NOT NULL` checks in middleware and `onboarding/page.tsx`
- **`profiles.email`** column — denormalised from `auth.users`; seeded by `handle_new_user()` trigger
- **Comprehensive schema files** in `docs/sql/` — full schema and migration patches

### Changed

- **`middleware.ts`** — onboarding guard now checks `profiles.onboarded_at IS NOT NULL` instead of `profiles.university IS NOT NULL`
- **`onboarding/page.tsx`** — server-side guard updated to match middleware
- **`DashboardClient.tsx`** — removed hardcoded suggested partners (Aisha Khan, Marco Rivera, Sara Park); replaced with empty state + "Complete profile" CTA to `/onboarding`

### Fixed

- **`useSearchParams()` build error** — `SignInPage` split into `SignInForm` (uses hook) + `SignInPage` wrapper with `<Suspense>`; fixes Next.js prerender error
- **Duplicate email detection** — `signUp()` returns `identities.length === 0` for duplicate emails when confirmation is on; now surfaces user-friendly message
- **Silent course save failure** — added `savedCount` counter; shows error and blocks redirect if no courses were saved
- **Stale closure in `autoAdvance`** — captured `qIdx` into `capturedIdx` at call time to avoid stale value in 320ms `setTimeout`

### Removed

- `REQUIRE_CONFIRM` env flag and dev bypass path — all environments now use `signUp()` with email confirmation
- Hardcoded suggested partners from dashboard

---

## [0.3.0] — 2026-10-28 (Sprint 3 — Auth pages)

### Added

- **Sign-in page** (`/signin`) — two-column layout
  - Left panel: indigo gradient background, PartnerMatcher branding, feature bullets, animated orbs + particle dots, testimonial card
  - Right panel: app logo + name, "Welcome back" heading, Continue with GitHub button (with SVG icon), email/password form, Show/Hide password toggle, Forgot password link, "Create one" sign-up link
  - Fully dark/light theme aware via CSS variables
- **Navbar branding restored** — logo (arc SVG) + "PartnerMatcher" text on the left; "Get Started" pill button on the right linking to `/signin`
- **`docs/` directory** at project root with 8 documentation files:
  - `skills.md`, `agents.md`, `database.md`, `architecture.md`, `api.md`, `features.md`, `deployment.md`, `contributing.md`, `changelog.md`
- **Root `README.md`** rewritten — quick start, project structure, tech stack table, routes table, docs index

---

## [0.2.0] — 2026-10-28 (Sprint 2 — Animations + Landing polish)

### Added

- **3D animations system** — `@keyframes` for float, fadeInUp, gradientShimmer, blobDrift, pulse-ring, badgePop, shimmerLine, slideInDown (all in `globals.css`)
- **Scroll-reveal** — `[data-animate]` + `[data-animate-stagger]` attributes driven by `ScrollAnimations.tsx` (IntersectionObserver, fires once)
- **3D card hover** — `.card-3d` class: `perspective(900px) rotateX/Y + translateZ` on hover
- **Shimmer glare** — `.card-shimmer` pseudo-element sweep on hover
- **Floating pill navbar** — `fixed top-4`, floating over page content; center nav links only
- **Floating particle dots** — 6 ambient dots in hero with staggered float timing
- **Smooth scroll** — `html { scroll-behavior: smooth }`
- **Step connector arrows** — desktop connector dot between step cards
- **`ScrollAnimations.tsx`** — client component, `IntersectionObserver`, adds `.in-view` to scroll-revealed elements

### Changed

- Navbar redesigned from sticky bar → floating pill (`fixed`, rounded-2xl)
- Hero layout: added ambient animated orbs (blobDrift animations), floating dots
- Feature cards: added `.card-3d` + `.card-shimmer`
- Step cards: added step icon + connector arrow + `.card-3d-subtle`
- CTA band: added rocket emoji icon, relative positioning for inner glow
- All sections: `py-24` → `py-28` for more breathing room
- Main element: `pt-36` / `pt-44` to account for fixed navbar

### Fixed

- Favicon: copied `public/fav.png` → `app/icon.png` and deleted `app/favicon.ico`; Next.js App Router auto-registers `icon.png` as the favicon

---

## [0.1.0] — 2026-10-28 (Sprint 1 — Theme + Landing)

### Added

- **Dark/light theme system** — `ThemeProvider` (client component), `ThemeToggle` (sun/moon button), `useTheme` context hook
- **CSS custom property token system** — 30+ tokens in `:root` and `.dark`, replacing all hardcoded Tailwind dark: classes
- **`@variant dark (&:where(.dark, .dark *))` in `globals.css`** — class-based dark mode for Tailwind v4
- **Warm off-white background** (`#f7f5f0` light, `#08080f` dark)
- **Navbar** — PartnerMatcher logo + brand (left), Features / How It Works / Docs links (center), theme toggle + Get Started (right)
- **Landing page redesign**:
  - "Now in Public Beta" badge with pulsing dot
  - Animated gradient headline ("Find your perfect **study partner**")
  - Two CTA buttons: primary (dark pill) + secondary (outline pill)
  - Social proof checkmarks
  - Hero preview card with three partner-type rows
  - Features section (3 cards)
  - How It Works (3 steps)
  - CTA band
  - Footer

### Fixed

- `new Date()` during prerender → replaced with `const CURRENT_YEAR = 2026`

---

## [0.0.1] — 2026-10-28 (Initial Commit)

### Added

- Next.js 16.4.2 project scaffold (`create-next-app`)
- Tailwind v4 + Turbopack configuration
- Geist Sans / Geist Mono fonts
- Initial landing page (single-column, basic navbar)
- `.gitignore`, `README.md`

---

_This file is updated with every meaningful change. Keep entries concise — the PR description has the full story._
