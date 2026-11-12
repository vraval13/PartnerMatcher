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
│   │   └── ScrollAnimations.tsx   # IntersectionObserver scroll-reveal
│   ├── dashboard/                  # /dashboard route
│   ├── onboarding/                 # /onboarding route (7-step wizard)
│   ├── profile/                    # /profile + /profile/courses
│   ├── signin/                     # /signin route
│   ├── signup/                     # /signup route
│   ├── auth/callback/              # OAuth code exchange handler
│   ├── api/auth/register/          # Dev-only admin register route (404 in prod)
│   ├── api/v1/connections/         # US-08: POST — send a session connection request
│   ├── globals.css                 # Tailwind v4 + CSS token system + keyframes
│   └── layout.tsx                  # Root layout + ThemeProvider
├── lib/
│   ├── supabase/                   # Browser, server, admin clients
│   │   ├── client.ts               # createBrowserClient (Client Components)
│   │   ├── server.ts               # createServerClient cookie-based (Server Components)
│   │   └── admin.ts                # Service-role client (dev only, never browser)
│   ├── auth/
│   │   └── errors.ts               # classifySignInError() — maps Supabase errors to user copy
│   ├── matching/                   # Matching engine (US-04 / US-05)
│   ├── connections/                # US-08: connection request handler + eligibility check
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
│   ├── onboarding-courses.test.ts  # US-23: course upsert logic
│   └── connections.test.ts         # US-08: connection request eligibility + HTTP handler
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

| Route              | Description                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- |
| `/`                | Landing page — hero, features, how-it-works, CTA, footer                           |
| `/signin`          | Two-column sign-in: GitHub/Google OAuth + email/password                           |
| `/signup`          | Registration with email or OAuth; confirmation-email sent state                    |
| `/onboarding`      | 7-step wizard: university, major, year, study style, comm pref, timezone, courses  |
| `/dashboard`       | Profile overview, course count, suggested partners                                 |
| `/profile`         | Full profile editor                                                                |
| `/profile/courses` | Add/remove courses with goal and semester                                          |
| `/auth/callback`   | OAuth code exchange — validates `next` param, redirects to dashboard or onboarding |

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

| Test file                               | Stories      | What it covers                                                                                                                                                                                                                                  | Tests |
| --------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `tests/matching.test.ts`                | US-04, US-05 | Matching engine: topic, availability, location scoring; urgency multiplier; no-match empty result; self-exclusion; archived/private exclusion                                                                                                   | 13    |
| `tests/matching-http.test.ts`           | US-04, US-05 | POST /api/v1/matches: 200 ranked results; 401 unauthenticated; 404 unknown goal; 422 invalid input; capacity overflow                                                                                                                           | 13    |
| `tests/matching-database.test.ts`       | US-04, US-05 | RLS: owner reads own private goal; peer reads only listed goals; owner-only writes; ownership cannot be reassigned                                                                                                                              | 1     |
| `tests/matching-information.test.ts`    | US-01        | Goal creation: valid submission saved; missing field returns validation error; unsupported value returns validation error                                                                                                                       | 6     |
| `tests/availability-http.test.ts`       | US-02        | POST/DELETE availability slots: valid slot saved; missing field rejected; end ≤ start rejected; slot deleted; existing availability unchanged on error                                                                                          | 15    |
| `tests/availability-validation.test.ts` | US-02        | Time format validation; IANA timezone validation; day-of-week validation; slot cap enforcement                                                                                                                                                  | 12    |
| `tests/onboarding-courses.test.ts`      | US-23        | Course upsert: course saved and linked; zero-course submit blocked; duplicate retry reuses existing row                                                                                                                                         | 2     |
| `tests/auth-register.test.ts`           | US-22        | POST /api/auth/register: 201 on success with `email_confirm:true`; 400 on missing fields; 409 on duplicate email without leaking raw Supabase text; 404 production guard                                                                        | 12    |
| `tests/auth-callback.test.ts`           | US-22        | OAuth callback: `safeNext` open-redirect prevention (8 cases); `processCallback` happy path; missing/failed code redirects to signin without leaking internal error detail                                                                      | 17    |
| `tests/middleware-routing.test.ts`      | US-22, US-23 | Routing middleware: unauthenticated users blocked from `/dashboard` and `/onboarding`; not-yet-onboarded users redirected to `/onboarding`; onboarded users redirected away from auth and onboarding pages; prefix-matching edge cases          | 20    |
| `tests/signin-errors.test.ts`           | US-22        | `classifySignInError`: generic message for wrong credentials; unconfirmed email produces confirmation prompt; raw Supabase error text never shown to user                                                                                       | 9     |
| `tests/connections.test.ts`             | US-08        | `isEligibleCandidate` unit tests (10); POST /api/v1/connections: 201 with id/topic/times; 401 unauthenticated; 404 goal not found; 422 missing/invalid fields, ineligible candidate (different topic/institution/self/not found); 409 duplicate | 32    |

**Total: 152 passing tests.** All tests cover at least one error, edge, or permission case as required by the definition of done.

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

| Sprint           | Version | Key deliverables                                                                                                  |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| Sprint 1         | 0.1.0   | Dark/light theme system, landing page                                                                             |
| Sprint 2         | 0.2.0   | 3D animations, scroll-reveal, floating navbar                                                                     |
| Sprint 3         | 0.3.0   | Sign-in page, docs directory, README                                                                              |
| Sprint 4         | 0.4.0   | Sign-up, OAuth, onboarding wizard, dashboard, middleware                                                          |
| Sprint 4 (patch) | 0.5.0   | Schema hardening, SQL gitignore, docs reorganised                                                                 |
| Sprint 5         | —       | CI workflows, test suite (US-22/US-23), auth hardening, error classification, production guard, open-redirect fix |
| Sprint 6         | —       | US-08: connection request API — session proposal fields, eligibility check, duplicate guard; 32 new tests         |

---

## License

Academic project — NYU Tandon School of Engineering, Software Engineering I, 2026.
