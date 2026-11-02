# PartnerMatcher

> Connect students with compatible study partners based on courses, goals, availability, and learning style.

PartnerMatcher is a full-stack web application built for NYU Software Engineering I. It matches university students with ideal study partners, helping them form meaningful learning relationships rather than random study groups.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Install and run

```bash
npm ci
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

Configure the team's Supabase URL and publishable key in `.env.local`, then open http://localhost:3000. Do not commit `.env.local` or place a service-role/provider secret in a `NEXT_PUBLIC` variable. OAuth providers and email confirmation are configured in Supabase Authentication, not by a frontend environment flag.

---

## Project Structure

```
PartnerMatcher/
├── app/                       # Next.js 16 App Router
│   ├── components/            # Shared UI components
│   │   ├── ThemeProvider.tsx
│   │   └── ScrollAnimations.tsx
│   ├── dashboard/             # /dashboard route
│   ├── onboarding/            # /onboarding route
│   ├── profile/               # /profile + /profile/courses
│   ├── signin/                # /signin route
│   ├── signup/                # /signup route
│   ├── auth/callback/         # OAuth callback handler
│   ├── api/auth/register/     # Dev-only admin register route
│   ├── globals.css            # Tailwind v4 + CSS token system
│   └── layout.tsx             # Root layout + ThemeProvider
├── lib/
│   ├── supabase/              # Browser, server, admin clients
│   ├── matching/              # Matching engine (US-04 / US-05)
│   └── onboarding/            # Course save helper
├── docs/                      # Project documentation
│   ├── skills.md
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── features.md
│   ├── deployment.md
│   ├── contributing.md
│   └── changelog.md
└── README.md
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
| Language        | TypeScript 5                            |
| Styling         | Tailwind CSS v4 + CSS custom properties |
| Runtime         | React 19                                |
| Auth & Database | Supabase (PostgreSQL 15 + RLS)          |
| Sessions        | `@supabase/ssr` cookie-based sessions   |
| Icons           | Inline SVG                              |
| Fonts           | Geist Sans / Geist Mono                 |

---

## Current Pages

| Route              | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `/signin`          | Two-column sign-in with GitHub/Google OAuth + email/password                      |
| `/signup`          | Registration with email or OAuth                                                  |
| `/onboarding`      | 7-step wizard: university, major, year, study style, comm pref, timezone, courses |
| `/dashboard`       | Profile overview, course count, suggested partners                                |
| `/profile`         | Full profile editor                                                               |
| `/profile/courses` | Add/remove courses                                                                |

---

## Matching database setup

The migration is `supabase/migrations/20261101014529_course_assignment_matching.sql`. It creates two matching tables, RLS policies and the atomic goal-creation RPC. It does not change existing team tables. Apply it once to the team's project via Supabase SQL Editor, or your normal reviewed Supabase migration workflow. Do not replay a manually applied migration. This migration was applied to the team project `oavkbygekcbotrsztfxu` on October 31, 2026 (New York time); the CLI filename uses UTC. Live transactional RPC and RLS checks passed. SQL Editor execution does not register Supabase CLI migration history; reconcile history before later CLI pushes.

**Candidate capacity:** the implementation supports 999 eligible goals and requests 1,000 to detect overflow, matching the default Supabase Data API row cap. Lower project caps require lowering both application limits.

No production demo users/data are inserted. Register two team test accounts, complete onboarding, and explicitly create listed matching goals at `/partners`. Empty databases correctly show no matches. The matching engine does not infer goals from onboarding courses.

## Onboarding course-save repair

`supabase/migrations/20261101020059_onboarding_course_insert.sql` adds authenticated INSERT permission for valid course catalog entries. Existing catalog rows cannot be overwritten by onboarding; duplicate retries reuse their IDs. Apply this migration once after the matching migration. It was applied to the team database on October 31, 2026 (New York time). The actual onboarding save was retried successfully and reached the dashboard. All 23 tests, lint and production build passed.

---

## Verify

```sh
npm test
npm run lint
npm run build
npm start
```

Tests use a fixed clock, stubbed HTTP/auth, and embedded PostgreSQL (PGlite); they require no production credentials and do not write to the team database. Production starts on port 3000 by default.

See [US-04 / US-05 design, API contracts, decisions and demo](docs/US04-US05-design.md). Deadline urgency bands are proposed and need team agreement. A story remains In progress until teammate PR review, merge, passing tests and deployed acceptance checks are complete.

---

## License

Academic project — NYU Tandon School of Engineering, Software Engineering I, 2026.
