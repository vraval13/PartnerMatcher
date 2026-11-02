# Changelog

All notable changes to PartnerMatcher are documented here.  
Format: `[version] — YYYY-MM-DD` · `Added` · `Changed` · `Fixed` · `Removed`

---

## [0.5.0] — 2026-11-01 (Sprint 4 — US-22 + US-23 production hardening)

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

*This file is updated with every meaningful change. Keep entries concise — the PR description has the full story.*
