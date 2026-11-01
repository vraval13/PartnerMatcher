# PartnerMatcher

Next.js application with Supabase authentication and course/assignment partner matching (US-04 / US-05).

## Install and run

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure the team's Supabase URL and publishable key in `.env.local`, then open http://localhost:3000. Do not commit `.env.local` or place a service-role/provider secret in a NEXT_PUBLIC variable. OAuth providers and email confirmation are configured in Supabase Authentication, not by a frontend environment flag.

## Matching database setup

The migration is `supabase/migrations/20261101014529_course_assignment_matching.sql`. It creates two matching tables, RLS policies and the atomic goal-creation RPC. It does not change existing team tables. Apply it once to the team's project via Supabase SQL Editor, or your normal reviewed Supabase migration workflow. Do not replay a manually applied migration. This migration was applied to the team project `oavkbygekcbotrsztfxu` on October 31, 2026 (New York time); the CLI filename uses UTC. Live transactional RPC and RLS checks passed. SQL Editor execution does not register Supabase CLI migration history; reconcile history before later CLI pushes.

**Candidate capacity:** the implementation supports 999 eligible goals and requests 1,000 to detect overflow, matching the default Supabase Data API row cap. Lower project caps require lowering both application limits.

No production demo users/data are inserted. Register two team test accounts, complete onboarding, and explicitly create listed matching goals at `/partners`. Empty databases correctly show no matches. The matching engine does not infer goals from onboarding courses.

## Verify

```sh
npm test
npm run lint
npm run build
npm start
```

Tests use a fixed clock, stubbed HTTP/auth, and embedded PostgreSQL (PGlite); they require no production credentials and do not write to the team database. Production starts on port 3000 by default. Localhost reproduction is sufficient for the sprint; AWS is optional.

See [US-04 / US-05 design, API contracts, decisions and demo](docs/US04-US05-design.md). Deadline urgency bands are proposed and need team agreement. A story remains In progress until teammate PR review, merge, passing tests and deployed acceptance checks are complete.

## Onboarding course-save repair

`supabase/migrations/20261101020059_onboarding_course_insert.sql` adds authenticated INSERT permission for valid course catalog entries. Existing catalog rows cannot be overwritten by onboarding; duplicate retries reuse their IDs. Apply this migration once after the matching migration. It was applied to the team database on October 31, 2026 (New York time). The actual onboarding save was retried successfully and reached the dashboard. All 23 tests, lint and production build passed.
