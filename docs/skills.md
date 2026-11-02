# Skills & Technology Stack

Every technology used in PartnerMatcher, why it was chosen, and the skill level expected of contributors.

---

## Stack at a glance

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4 | ✅ in use |
| Theme | CSS custom-property token system, Geist Sans/Mono | ✅ in use |
| Auth | Supabase Auth — email + password, email confirmation, OAuth (Google, GitHub) | ✅ in use (Sprint 4) |
| Database | PostgreSQL on Supabase — 11 tables, RLS, triggers | ✅ in use (Sprint 4) |
| Sessions | Cookie-based via `@supabase/ssr` | ✅ in use (Sprint 4) |
| Hosting | Vercel (frontend) · Supabase (DB + Auth) | ✅ configured |
| CI / VCS | GitHub, GitHub Actions | ✅ configured |
| Matching algorithm | Rule-based engine in TypeScript | 📋 Phase 2 |
| Testing | Vitest (unit), Playwright (E2E) | 📋 Phase 2 |

> There is no separate Express / Node.js backend server. The app calls Supabase directly from Next.js Server Components, Route Handlers, and Client Components via the Supabase JS SDK.

---

## Frontend

### Next.js 16 (App Router)
**Role:** web client, route protection, auth callbacks. **Why:** server components, built-in routing and middleware, static generation, first-class TypeScript.

Patterns used:
- `app/` with `layout.tsx` / `page.tsx`; Server Components by default
- `"use client"` only where form state, hooks, or browser APIs are needed
- `middleware.ts` — session check and onboarding guard on every request
- `app/auth/callback/route.ts` — OAuth code exchange + open-redirect prevention
- `app/api/auth/register/route.ts` — dev-only pre-confirmed account creation (returns 404 in production)
- `useSearchParams()` always inside `<Suspense>` to satisfy Next.js prerender requirement

**Contributor level:** Intermediate. Know server vs client components, `<Suspense>` boundaries, when `useEffect` is safe, and how middleware works.

### React 19
**Role:** UI model. Hooks for form state (`useState`, `useRef`), `useEffect` with cleanup, context for theme.  
**Level:** Intermediate. Hooks, context, hydration boundaries, `key`-prop re-mounting for animations.

### TypeScript 5
`"strict": true`, `"moduleResolution": "bundler"`, path alias `@/*`.  
**Level:** Intermediate. Type props, events, refs and generics. Never `any`.

### Tailwind CSS v4
CSS-first config (`@import "tailwindcss"`, `@variant dark (&:where(.dark, .dark *))`). No `tailwind.config.js`. Colours come from CSS variables consumed through arbitrary values (`bg-[var(--bg-card)]`).

### CSS custom properties (design tokens)
Tokens live on `:root` and `.dark`, named `--bg-*`, `--border-*`, `--text-*`, `--btn-primary-bg`, `--shadow-*`. Adding a component means adding its tokens to **both** blocks.

---

## Auth & Database

### Supabase Auth
**Role:** owns sign-up, sign-in, OAuth, email confirmation, and session tokens. No bcrypt, no custom JWT signing, no refresh-token table.

Key points for contributors:
- `supabase.auth.signUp()` with `emailRedirectTo` triggers confirmation email
- Duplicate email: `identities.length === 0` — not an error object
- OAuth: `signInWithOAuth()` → provider → `/auth/callback?code=...` → `exchangeCodeForSession()`
- Cookie sessions: `@supabase/ssr` stores the session in an HttpOnly cookie; `getUser()` verifies server-side on every protected request

### Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`)
Three clients in `lib/supabase/`:
- `client.ts` — `createBrowserClient`, uses the anon key, safe in the browser
- `server.ts` — `createServerClient` with cookie adapter, used in Server Components and Route Handlers
- `admin.ts` — service-role client, used only in the dev-only register route, **never reaches the browser**

**Level:** Intermediate. Know the confirmation flow, session cookies, RLS, and when to use each client.

### PostgreSQL (Supabase)
11 tables with RLS, 9 enums, `set_updated_at()` trigger on every table. Full schema in `docs/sql/supabase_schema.sql`.

Key concepts: partial unique indexes (`WHERE code IS NOT NULL`), `auth.uid()` in RLS policies, `SECURITY DEFINER SET search_path = public` on trigger functions, `ON CONFLICT (user_id) DO NOTHING` for idempotent profile creation.

**Level:** Intermediate to advanced for RLS policy authoring and migration patches.

---

## Onboarding Wizard

`app/onboarding/OnboardingClient.tsx` — 7-question typeform-style one-at-a-time flow.

Key patterns:
- Directional slide animation: CSS keyframes + `key` prop re-mount switches direction (`1 | -1`)
- Auto-advance: `setTimeout(() => navigate(capturedIdx + 1, 1), 320)` — capture `qIdx` into `capturedIdx` to avoid stale closure
- Auto-focus: `setTimeout(() => ref.current?.focus(), 80)` on question mount
- Course saves: `upsert` with `onConflict` + `savedCount` counter; blocks redirect if zero saved
- `currentSemester()` — computes `"Fall 2026"` / `"Spring 2027"` from `new Date()` at call time

---

## Dev Tooling

| Tool | Config | Purpose |
|---|---|---|
| ESLint | `eslint.config.mjs` | Linting (`eslint-config-next`) |
| TypeScript | `tsconfig.json` | Type checking |
| Turbopack | `next.config.ts` | Dev bundler |
| Git / GitHub | `.gitignore`, branch protection | Version control, pull-request review |
| GitHub Actions | `.github/workflows/ci.yml` | Lint, type-check, build |
| Supabase CLI | — | Migrations and seed data (future) |

---

## No longer in scope

| Removed | Reason |
|---|---|
| Express / Node.js backend server | Replaced by Supabase — no custom API layer needed |
| Custom JWT signing / bcrypt | Supabase Auth handles authentication entirely |
| Refresh-token table | Supabase manages session tokens |
| Redis | No score cache or rate limiting in scope |
| Cloudflare R2 | No file/avatar storage in current scope |
| Python/FastAPI, Go/Fiber, Fastify | Stack settled on Next.js + Supabase |
| Drizzle / SQLAlchemy | Plain Supabase JS SDK used for all DB access |
| Neon / Railway / Render | Replaced by Supabase + Vercel |

---

## Skill Matrix for Contributors

| Role | Must know | Nice to know |
|---|---|---|
| **Frontend** | React 19, TypeScript, Next.js App Router and middleware, Tailwind v4, CSS variables, Supabase client auth | Playwright |
| **Database** | PostgreSQL constraints, RLS policies, `auth.uid()`, Supabase migrations | Partial indexes, enum migrations |
| **Matching / QA** | Deterministic algorithms, Given/When/Then tests, Vitest | Property-based testing |
| **Full-stack** | All of the above | CI/CD |
| **DevOps** | GitHub Actions, Vercel, Supabase project setup | Supabase CLI migrations |

---

*Last updated: 2026-11-01 (Sprint 4 — Supabase auth + DB in use; Express backend removed).*
