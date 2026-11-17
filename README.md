# PartnerMatcher

> Connect students with compatible study partners based on courses, goals, availability, and learning style.

PartnerMatcher is a full-stack web application built for NYU Software Engineering I. It matches university students with ideal study partners, helping them form meaningful learning relationships rather than random study groups.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- Bun ≥ 1.0 (package manager — project uses `bun.lock`)

### Install and run

```bash
bun install
cp .env.example .env.local
bun run dev        # http://localhost:3000
bun run build      # production build
bun run lint       # ESLint
bunx prettier --check .   # format check
```

Configure the team's Supabase URL and publishable key in `.env.local`, then open http://localhost:3000.

> **Security rules:**
>
> - Never commit `.env.local` or any `.env*` file
> - Never place `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable
> - OAuth providers and email confirmation are configured in Supabase Authentication, not by a frontend flag
> - `docs/sql/` is gitignored — it contains the full schema with sensitive structure

---

## Project Structure

```
PartnerMatcher/
├── app/                            # Next.js 16 App Router
│   ├── components/                 # Shared UI components
│   │   ├── ThemeProvider.tsx       # Dark/light theme context + toggle
│   │   ├── ThemeToggle.tsx         # Sun/moon icon button
│   │   ├── Navbar.tsx              # Floating pill navbar (landing page)
│   │   ├── PageLayout.tsx          # Shared Sidebar + main wrapper
│   │   └── ScrollAnimations.tsx    # IntersectionObserver scroll-reveal
│   ├── dashboard/                  # /dashboard route
│   │   ├── Sidebar.tsx             # Left navigation sidebar (all app pages)
│   │   ├── RightSidebar.tsx        # Dashboard-only right panel
│   │   ├── DashboardClient.tsx     # Dashboard UI
│   │   └── page.tsx                # Server component + auth guard
│   ├── partners/                   # /partners route
│   │   ├── PartnersClient.tsx      # Study partner matching UI
│   │   ├── page.tsx                # Server component + auth guard
│   │   └── profile/[goalId]/       # Partner profile preview page
│   ├── requests/                   # /requests route
│   │   ├── RequestsClient.tsx      # Connection requests UI (received/sent tabs)
│   │   └── page.tsx                # Server component + auth guard
│   ├── availability/               # /availability route
│   │   ├── AvailabilityClient.tsx  # Weekly availability slot manager
│   │   └── page.tsx
│   ├── onboarding/                 # /onboarding route (7-step wizard)
│   ├── profile/                    # /profile + /profile/courses
│   │   ├── ProfileClient.tsx       # Profile editor
│   │   ├── page.tsx
│   │   └── courses/
│   │       ├── CoursesClient.tsx   # Course management
│   │       └── page.tsx
│   ├── signin/                     # /signin route
│   ├── signup/                     # /signup route
│   ├── auth/callback/              # OAuth code exchange handler
│   ├── api/auth/register/          # Dev-only admin register route (404 in prod)
│   ├── api/v1/
│   │   ├── connections/            # US-08/11/12/13: send, list, cancel, respond
│   │   ├── favorites/              # US-17: add/remove favorite partners
│   │   ├── matches/                # US-04/05/07: ranked partner search
│   │   ├── matching-goals/         # US-01: create/update/delete matching goals
│   │   └── matching-status/        # US-16: pause/resume visibility
│   ├── globals.css                 # Tailwind v4 + CSS token system + keyframes
│   └── layout.tsx                  # Root layout + ThemeProvider
├── lib/
│   ├── supabase/                   # Browser, server, admin clients
│   │   ├── client.ts               # createBrowserClient (Client Components)
│   │   ├── server.ts               # createServerClient cookie-based (Server Components)
│   │   └── admin.ts                # Service-role client (dev only, never browser)
│   ├── auth/
│   │   └── errors.ts               # classifySignInError() — maps Supabase errors to user copy
│   ├── matching/                   # Matching engine (US-01/04/05/07/16)
│   │   ├── engine.ts               # rankCandidates(), scoring, urgency multiplier
│   │   ├── http.ts                 # POST /api/v1/matches handler
│   │   ├── information.ts          # Goal validation, field schemas
│   │   └── status.ts               # Pause/resume matching status
│   ├── connections/
│   │   └── http.ts                 # US-08/11/12/13: eligibility check, request handler
│   ├── favorites/
│   │   └── http.ts                 # US-17: favorites handler
│   ├── availability/               # US-02: slot validation + CRUD
│   └── onboarding/                 # Course save helper
├── middleware.ts                   # Session check + onboarding guard (every request)
├── tests/                          # Node.js built-in test runner (tsx --test)
│   ├── auth-callback.test.ts       # US-22: safeNext open-redirect, OAuth callback
│   ├── auth-register.test.ts       # US-22: register route, duplicate email, prod guard
│   ├── middleware-routing.test.ts  # US-22 / US-23: routing rules, all guard states
│   ├── signin-errors.test.ts       # US-22: error message classification
│   ├── availability-http.test.ts   # US-02: availability slot HTTP handler
│   ├── availability-validation.test.ts  # US-02: time / timezone / day-of-week rules
│   ├── matching.test.ts            # US-04 / US-05: matching engine logic
│   ├── matching-http.test.ts       # US-04 / US-05: match API HTTP handler
│   ├── matching-database.test.ts   # US-04 / US-05: RLS integration
│   ├── matching-information.test.ts # US-01: goal creation validation
│   ├── matching-status.test.ts     # US-16: pause/resume matching status
│   ├── onboarding-courses.test.ts  # US-23: course upsert logic
│   ├── connections.test.ts         # US-08: send connection request + eligibility
│   ├── connections-cancel.test.ts  # US-12: cancel sent connection request
│   └── connections-respond.test.ts # US-13: accept/decline received request
├── .github/workflows/
│   ├── ci.yaml                     # Format → lint → build → typecheck on every push/PR
│   └── merge-check.yaml            # Same checks after merging main (PR gate)
├── docs/                           # Project documentation
└── supabase/                       # Supabase config + migrations
```

---

## Documentation

| File                                         | Purpose                                        |
| -------------------------------------------- | ---------------------------------------------- |
| [docs/skills.md](docs/skills.md)             | Tech stack, required skills per role           |
| [docs/database.md](docs/database.md)         | Full DB schema, ERD, migration strategy        |
| [docs/architecture.md](docs/architecture.md) | System design, component map, data flow        |
| [docs/api.md](docs/api.md)                   | Supabase clients, auth operations, RLS summary |
| [docs/features.md](docs/features.md)         | Feature specs, current state, roadmap          |
| [docs/deployment.md](docs/deployment.md)     | Vercel, Docker, environment setup              |
| [docs/contributing.md](docs/contributing.md) | PR flow, commit conventions, branch rules      |
| [docs/changelog.md](docs/changelog.md)       | Version history                                |

---

## Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)      |
| Language        | TypeScript 5 (strict mode)              |
| Styling         | Tailwind CSS v4 + CSS custom properties |
| Runtime         | React 19                                |
| Auth & Database | Supabase (PostgreSQL 15 + RLS)          |
| Sessions        | `@supabase/ssr` cookie-based sessions   |
| Package manager | Bun                                     |
| Linter          | ESLint (Next.js config)                 |
| Formatter       | Prettier                                |
| Test runner     | Node.js built-in (`tsx --test`)         |
| CI              | GitHub Actions                          |
| Icons           | Inline SVG                              |
| Fonts           | Geist Sans / Geist Mono                 |

---

## Current Pages

| Route                        | Description                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `/`                          | Landing page — hero, features, how-it-works, CTA, footer                              |
| `/signin`                    | Two-column sign-in: GitHub/Google OAuth + email/password                              |
| `/signup`                    | Registration with email or OAuth; confirmation-email sent state                       |
| `/onboarding`                | 7-step wizard: university, major, year, study style, comm pref, timezone, courses     |
| `/dashboard`                 | Dynamic layout — partner suggestions, stat tiles, right sidebar (calendar/profile)    |
| `/profile`                   | Full profile editor with 4 sections + profile-completion sidebar card                 |
| `/profile/courses`           | Add/remove courses with goal and semester                                             |
| `/partners`                  | Create matching goals, search partners by course/exam/skill, send connection requests |
| `/partners/profile/[goalId]` | Partner profile preview — courses, availability, shared overlap                       |
| `/requests`                  | Received/sent connection requests with accept, decline, cancel and status badges      |
| `/availability`              | Weekly availability slot manager — add/remove time slots                              |
| `/auth/callback`             | OAuth code exchange — validates `next` param, redirects to dashboard or onboarding    |

---

## CI / CD

Two GitHub Actions workflows run on every push and pull request:

**`ci.yaml`** — runs on every branch:

1. Format check (`bunx prettier --check .`)
2. Lint (`bun run lint`)
3. Build (`bun run build`) — generates `.next/types` required for typecheck
4. Typecheck (`bunx tsc --noEmit`)

**`merge-check.yaml`** — runs on PRs targeting `main`:

- Fetches and merges `origin/main` before running the same four checks, so integration failures are caught before the PR lands

The build step must come before the typecheck step because Next.js 16 generates `LayoutProps`, `PageProps`, and other route types in `.next/types/routes.d.ts` at build time.

---

## Automated Tests

```bash
npm test   # or: bun run test
```

Tests use stubbed HTTP/auth, embedded PostgreSQL (PGlite), and a fixed clock. They require no production credentials and do not write to the team database.

| Test file                               | Stories      | What it covers                                                                                                                                                                                                                         | Tests |
| --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `tests/matching.test.ts`                | US-04, US-05 | Matching engine: topic, availability, location scoring; urgency multiplier; no-match empty result; self-exclusion; archived/private exclusion                                                                                          | 13    |
| `tests/matching-http.test.ts`           | US-04, US-05 | POST /api/v1/matches: 200 ranked results; 401 unauthenticated; 404 unknown goal; 422 invalid input; capacity overflow                                                                                                                  | 13    |
| `tests/matching-database.test.ts`       | US-04, US-05 | RLS: owner reads own private goal; peer reads only listed goals; owner-only writes; ownership cannot be reassigned                                                                                                                     | 1     |
| `tests/matching-information.test.ts`    | US-01        | Goal creation: valid submission saved; missing field returns validation error; unsupported value returns validation error                                                                                                              | 6     |
| `tests/matching-status.test.ts`         | US-16        | PATCH /api/v1/matching-status: pause toggles visibility; 401 unauthenticated; 422 invalid body                                                                                                                                         | 4     |
| `tests/availability-http.test.ts`       | US-02        | POST/DELETE availability slots: valid slot saved; missing field rejected; end ≤ start rejected; slot deleted; existing availability unchanged on error                                                                                 | 15    |
| `tests/availability-validation.test.ts` | US-02        | Time format validation; IANA timezone validation; day-of-week validation; slot cap enforcement                                                                                                                                         | 12    |
| `tests/onboarding-courses.test.ts`      | US-23        | Course upsert: course saved and linked; zero-course submit blocked; duplicate retry reuses existing row                                                                                                                                | 2     |
| `tests/auth-register.test.ts`           | US-22        | POST /api/auth/register: 201 on success with `email_confirm:true`; 400 on missing fields; 409 on duplicate email without leaking raw Supabase text; 404 production guard                                                               | 12    |
| `tests/auth-callback.test.ts`           | US-22        | OAuth callback: `safeNext` open-redirect prevention (8 cases); `processCallback` happy path; missing/failed code redirects to signin without leaking internal error detail                                                             | 17    |
| `tests/middleware-routing.test.ts`      | US-22, US-23 | Routing middleware: unauthenticated users blocked from `/dashboard` and `/onboarding`; not-yet-onboarded users redirected to `/onboarding`; onboarded users redirected away from auth and onboarding pages; prefix-matching edge cases | 20    |
| `tests/signin-errors.test.ts`           | US-22        | `classifySignInError`: generic message for wrong credentials; unconfirmed email produces confirmation prompt; raw Supabase error text never shown to user                                                                              | 9     |
| `tests/connections.test.ts`             | US-08        | `isEligibleCandidate` unit tests (10); POST /api/v1/connections: 201 with id/topic/times; 401 unauthenticated; 404 goal not found; 422 missing/invalid fields, ineligible candidate; 409 duplicate                                     | 32    |
| `tests/connections-cancel.test.ts`      | US-12        | PATCH /api/v1/connections/[id]: cancel own sent request; 401 unauthenticated; 404 not found; 403 cancel another user's request; 409 already-terminal status                                                                            | 21    |
| `tests/connections-respond.test.ts`     | US-13        | PATCH /api/v1/connections/[id] accept/decline: accept updates status to accepted; decline updates to rejected; 401 unauthenticated; 403 cannot respond to own request; 404 not found; 409 already responded                            | 14    |

**Total: 191 passing tests.** All tests cover at least one error, edge, or permission case as required by the definition of done.

---

## Database Migrations

Apply migrations once to the team Supabase project via the SQL Editor or reviewed CLI workflow. Do not replay a manually applied migration.

| Migration file                                  | Applied    | What it does                                                                                                        |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `20261101014529_course_assignment_matching.sql` | 2026-10-31 | Creates matching tables, RLS policies, atomic goal-creation RPC                                                     |
| `20261101020059_onboarding_course_insert.sql`   | 2026-10-31 | Adds authenticated INSERT permission for course catalog entries; duplicate retries reuse existing IDs               |
| `20261111000000_us08_connection_requests.sql`   | 2026-11-11 | Extends `connections` with `session_topic`, `proposed_start`, `proposed_end`; adds end-after-start check constraint |

**Candidate capacity:** supports 999 eligible goals; requests 1 000 to detect overflow, matching the default Supabase Data API row cap. Lower project caps require lowering both application limits.

No demo users or data are inserted. Register two team test accounts, complete onboarding, and create listed matching goals at `/partners`. Empty databases correctly show no matches.

---

## Auth Architecture

```
Browser                 Next.js (Vercel)              Supabase
  │                          │                             │
  ├─ POST /api/auth/register ─►  processRegister()          │
  │   (dev only; 404 in prod) │  → admin.createUser()  ────►│ email_confirm: true
  │                          │                             │
  ├─ POST /auth/v1/signup ───────────────────────────────►  │ sends confirmation email
  │                          │                             │
  ├─ GET /auth/callback?code ─►  processCallback()          │
  │                          │  → exchangeCodeForSession()─►│
  │                          │  safeNext() validates next   │
  │                          │  redirects to /onboarding    │
  │                          │                             │
  ├─ Every request ──────────►  middleware.ts               │
  │                          │  resolveRoute(user,          │
  │                          │    onboarded, pathname)      │
  │                          │  → reads profiles.onboarded_at│
```

`safeNext()` only allows paths starting with `/` and not `//`, preventing open-redirect attacks.

---

## Sprint History

### Sprint 1 — Foundation & Theme

**Version 0.1.0 → 0.2.0**

- Dark/light theme system (`ThemeProvider`, CSS custom property tokens, `.dark` class toggle)
- Landing page — hero, feature cards, how-it-works, CTA, footer
- 3D card hover animations, scroll-reveal (`IntersectionObserver`), floating navbar
- Keyframe system: `float`, `fadeInUp`, `gradientShimmer`, `blobDrift`, `pulse-ring`, `shimmerLine`

### Sprint 2 — Auth, Onboarding & Dashboard

**Version 0.3.0 → 0.5.0**

| Story | What shipped                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------- |
| US-22 | Sign-up page, email confirmation, OAuth (GitHub/Google), callback handler, open-redirect guard |
| US-22 | Sign-in page — generic error messages, `classifySignInError()`, `<Suspense>` prerender fix     |
| US-22 | Route protection middleware (`profiles.onboarded_at` guard)                                    |
| US-23 | 7-step onboarding wizard with directional slide animation, profile + course save               |
| —     | Dashboard shell — name, avatar, stats row; empty partner state with CTA                        |
| —     | Full test suite: 152 tests covering US-22, US-23, auth hardening, CI workflows                 |

### Sprint 3 — Matching, Connections & Partner Features

**Version 0.6.0**

| Story | What shipped                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| US-01 | Matching goal creation — category (course/exam\_prep/skill\_practice), subject, proficiency, timezone, availability slots |
| US-02 | Weekly availability CRUD — slot validation (IANA timezone, time format, day-of-week), 21-slot cap, POST/DELETE API        |
| US-04 | Course study partner matching — topic scoring (40%), availability overlap (35%), location preference (25%)                |
| US-05 | Assignment-specific matching — due-date urgency multiplier (×1.0 → ×1.2), deadline-aware ranking                          |
| US-07 | Exam preparation matching and recurring skill/language practice partner matching                                          |
| US-08 | Send connection request — `session_topic`, `proposed_start`, `proposed_end`; eligibility check; 409 duplicate guard       |
| US-11 | List received and sent connection requests — `/api/v1/connections` GET + `/sent` sub-route                                |
| US-12 | Cancel sent connection request — PATCH `/api/v1/connections/[id]`; terminal-state guard                                   |
| US-13 | Accept / decline received request — PATCH with `action: accept                                                            | decline`; ownership guard |
| US-16 | Pause/resume matching visibility — PATCH `/api/v1/matching-status`; hides listed goals from new searches when paused      |
| US-17 | Favorite partners — POST/DELETE `/api/v1/favorites`; persisted per user; shown on partner cards                           |
| US-25 | Dynamic dashboard layout — right sidebar with calendar, upcoming study sessions, profile summary card                     |
| —     | Partner profile preview page (`/partners/profile/[goalId]`) — courses, availability, score breakdown                      |
| —     | Next.js security upgrade 16.4.2 → 16.4.6 (CVE advisory)                                                                   |
| —     | 39 new tests: `connections-cancel` (21), `connections-respond` (14), `matching-status` (4) — total now **191 tests**      |

**New API routes in Sprint 3:**

| Method      | Route                      | Story    | Description                                  |
| ----------- | -------------------------- | -------- | -------------------------------------------- |
| POST        | `/api/v1/matching-goals`   | US-01    | Create a new matching goal                   |
| PATCH       | `/api/v1/matching-goals`   | US-07    | Update exam dates on an existing goal        |
| DELETE      | `/api/v1/matching-goals`   | —        | Remove a goal from matching                  |
| POST        | `/api/v1/matches`          | US-04    | Rank candidates for a selected goal          |
| PATCH       | `/api/v1/matching-status`  | US-16    | Toggle pause/resume visibility               |
| POST        | `/api/v1/connections`      | US-08    | Send a session connection request            |
| GET         | `/api/v1/connections`      | US-11    | List received connection requests            |
| GET         | `/api/v1/connections/sent` | US-11    | List sent connection requests                |
| PATCH       | `/api/v1/connections/[id]` | US-12/13 | Cancel (sender) or accept/decline (receiver) |
| POST/DELETE | `/api/v1/favorites`        | US-17    | Add or remove a favorite partner goal        |

### Sprint 4 — UI Redesign & Design System

**Version 0.7.0**

A complete visual overhaul making all four app pages consistent, professional, and cohesive. No new user-facing features; all changes are presentational and affect `globals.css`, `Sidebar.tsx`, `PartnersClient.tsx`, `ProfileClient.tsx`, `CoursesClient.tsx`, and `RequestsClient.tsx`.

#### Brand identity: indigo → teal

Replaced every hardcoded indigo reference (`bg-indigo-600`, `text-indigo-500`, `#6366f1`) with a new teal token system defined in `globals.css`:

| Token                 | Light mode             | Dark mode              | Usage                                  |
| --------------------- | ---------------------- | ---------------------- | -------------------------------------- |
| `--brand`             | `#0d9488`              | `#2dd4bf`              | Primary brand color — buttons, accents |
| `--brand-strong`      | `#0f766e`              | `#5eead4`              | Hover / emphasis                       |
| `--brand-fg`          | `#ffffff`              | `#04201d`              | Text on brand-colored surfaces         |
| `--brand-soft-bg`     | `rgba(13,148,136,.1)`  | `rgba(45,212,191,.12)` | Soft background chips / badges         |
| `--brand-soft-border` | `rgba(13,148,136,.32)` | `rgba(45,212,191,.3)`  | Soft border on info banners            |

Updated accordingly: `--shadow-card`, `--nav-shadow`, `.gradient-text-animated` gradient stops, `.card-3d` hover glow, `pulse-ring` keyframe box-shadow.

#### Sidebar redesign

`app/dashboard/Sidebar.tsx` — shared by all five app pages:

- **Logo**: replaced the placeholder "PM" square chip with the same rainbow-arc SVG + "Partner**Matcher**" two-tone wordmark used on the landing page navbar — strokes now use `var(--brand)`.
- **Layout**: switched from a single scrolling `aside` to `flex flex-col` so the navigation scrolls independently of the pinned bottom section.
- **Bottom section** (new, pinned): three items stacked below a divider —
  1. **Profile row** — user initials chip (teal soft-bg) + display name + "View profile" subtitle, links to `/profile`, highlights when active.
  2. **Dark/Light theme toggle** — sun/moon icon, label flips between "Dark mode" and "Light mode"; calls `useTheme().toggle()`.
  3. **Sign out** — consistent icon + label button.
- Added `useTheme` import; removed the old standalone sign-out button.

#### PartnersClient.tsx — full themed rebuild

This page previously used no CSS-variable theming (plain borders, transparent backgrounds, raw indigo buttons) — the most visually inconsistent page in the app. Changes:

- **Page header** — added eyebrow label `Partner matching` (teal), `h1` heading, description paragraph, and a dark/light theme-toggle button to match every other page's header pattern.
- **`inputClass`** — redefined from raw `border-slate-500/40 bg-transparent` to a fully-themed string using `--bg-card-inner`, `--border-card`, `--text-heading`, and `--brand` focus ring.
- **Card backgrounds** — every bordered section now has `backgroundColor: "var(--bg-card)"` or `"var(--bg-card-inner)"`: the visibility section, create-goal form, nested course-type box, weekly availability slot boxes, and match-result `<article>` cards.
- **Buttons** — all six `bg-indigo-600` primary buttons swapped to `var(--brand)` / `var(--brand-fg)`; five plain-outline secondary buttons given `var(--bg-card)` / `var(--border-card)` / `var(--text-sub)`.
- **Banners** — error banners restyled to `rgba(220,38,38,…)` inline-style pattern; info/status banner restyled to `var(--brand-soft-border)` / `var(--brand-soft-bg)`.
- **Match-result cards** — score now shown as a teal soft-bg chip; name uses `--text-heading`; "View profile" and "Add to favorites" buttons use card-outline style.
- **Connect-request modal** — surface changed from `--bg-page` to `--bg-card` with a border; heading uses `--text-heading`; primary/cancel buttons match the app-wide pattern.

#### ProfileClient.tsx

- All `#6366f1` eyebrow labels (01 / Personal, 02 / Education, 03 / Preferences, 04 / Learning, "Your account", "Update courses") → `var(--brand)`.
- Profile card top banner strip → `linear-gradient(135deg, var(--brand), var(--brand-strong))`.
- Profile-completion percentage text and progress-bar fill → `var(--brand)`.
- Save button → `var(--brand)` / `var(--brand-fg)` (was near-black `var(--text-heading)`).

#### CoursesClient.tsx

- Eyebrow label "Academic information" → `var(--brand)`.
- Quota badge `{n}/5 courses` → `var(--brand-soft-bg)` / `var(--brand-strong)` (was raw `rgba(99,102,241,0.1)` / `#6366f1`).
- "+ Add another course" dashed button text → `var(--brand)`.
- "Save courses" button → `var(--brand)` / `var(--brand-fg)`.
- **Bug fix**: `uidCounter.current` was read during the `useState` lazy initializer (a render-phase ref read, React lint error). Fixed by pre-seeding UIDs from the array index during initialisation and starting the counter at `initialCourses.length`.

#### RequestsClient.tsx

- Tab-switcher active state background → `var(--brand)` / `var(--brand-fg)` (was `var(--text-heading)` / `var(--bg-page)`).
- Pending-count badge → `var(--brand)` / `var(--brand-fg)` when inactive (was `#6366f1` / `#fff`).
- **Bug fix**: `window.location.hash = v` was assigned inside a `switchView` event handler — a React immutability lint error. Moved to a `useEffect` keyed on `view`, skipping the initial mount via a `useRef` sentinel so it does not rewrite the hash that drove the initial tab state. Added `useRef` to the React import.

---

## License

Academic project — NYU Tandon School of Engineering, Software Engineering I, 2026.
