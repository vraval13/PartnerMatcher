# System Architecture

PartnerMatcher is a **Next.js + Supabase** web application. There is no separate backend server — Supabase provides the database, authentication, and row-level security. All business logic and API calls are made directly from Next.js Server Components, Route Handlers, and the middleware layer.

---

## 1. Stack

| Layer      | Technology                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| Web client | Next.js 16 (App Router) · React 19 · TypeScript 5                            |
| Styling    | Tailwind CSS v4 · CSS custom-property token system                           |
| Auth       | Supabase Auth — email + password, email confirmation, OAuth (Google, GitHub) |
| Database   | PostgreSQL on Supabase (see `database.md` for full schema)                   |
| Sessions   | Cookie-based via `@supabase/ssr`                                             |
| Hosting    | Vercel (frontend) · Supabase (DB + Auth)                                     |
| Tooling    | GitHub · TypeScript strict mode · ESLint                                     |

---

## 2. High-level overview

```
┌─────────────────────────────────────────────────────────┐
│ Browser (React 19, Tailwind v4)                         │
│  Client Components — form state, auth calls, animations │
│  Server Components  — data fetching, redirects          │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────────────────────┐
│ Next.js 16 (Vercel Edge + Node runtime)                 │
│  middleware.ts       — session check, onboarding guard  │
│  app/api/auth/       — dev-only register route          │
│  app/auth/callback/  — OAuth code exchange              │
│  Server Components   — auth.getUser(), DB reads         │
└──────┬──────────────────────────────────────────────────┘
       │ @supabase/ssr (cookie session)
┌──────▼──────────────────────────────────────────────────┐
│ Supabase                                                │
│  Auth    — sign-up, sign-in, OAuth, email confirmation  │
│  DB      — PostgreSQL + Row Level Security              │
│  Realtime (planned) — notifications                     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. App Router structure

```
frontend/
├── middleware.ts                  Session check + onboarding guard (runs on every request)
├── lib/supabase/
│   ├── client.ts                  createBrowserClient — used in Client Components
│   ├── server.ts                  createServerClient (cookie-based) — used in Server Components
│   └── admin.ts                   Service-role client — dev only, never in browser
└── app/
    ├── layout.tsx                 Root layout: fonts, ThemeProvider, metadata
    ├── globals.css                Tailwind v4 + CSS token system + all keyframes
    ├── icon.png                   Auto-registered favicon (App Router convention)
    ├── page.tsx                   Landing page (server component, public)
    │
    ├── signup/page.tsx            Registration → email confirmation flow  ✅ Sprint 4
    ├── signin/page.tsx            Sign-in form + GitHub/Google OAuth       ✅ Sprint 4
    ├── auth/callback/route.ts     OAuth code exchange → redirect           ✅ Sprint 4
    ├── api/auth/register/         Dev-only pre-confirmed user creation     ✅ Sprint 4
    │
    ├── onboarding/
    │   ├── page.tsx               Server: auth check + already-onboarded redirect  ✅ Sprint 4
    │   └── OnboardingClient.tsx   Typeform wizard: 7-step one-at-a-time flow       ✅ Sprint 4
    │
    ├── dashboard/
    │   ├── page.tsx               Server: auth check                       ✅ Sprint 2
    │   ├── DashboardClient.tsx    Dynamic dashboard with right sidebar      ✅ Sprint 3
    │   ├── Sidebar.tsx            Shared left nav — logo, nav, bottom section ✅ Sprint 4
    │   └── RightSidebar.tsx       Dashboard-only calendar + profile panel   ✅ Sprint 3
    │
    ├── partners/
    │   ├── page.tsx               Server: auth check                       ✅ Sprint 3
    │   ├── PartnersClient.tsx     Goal form, search, match cards, modal     ✅ Sprint 3
    │   └── profile/[goalId]/      Partner profile preview page              ✅ Sprint 3
    │
    ├── requests/
    │   ├── page.tsx               Server: auth check                       ✅ Sprint 3
    │   └── RequestsClient.tsx     Received/sent tabs, filter, actions       ✅ Sprint 3
    │
    ├── availability/
    │   ├── page.tsx               Server: auth check                       ✅ Sprint 3
    │   └── AvailabilityClient.tsx Weekly slot manager                      ✅ Sprint 3
    │
    ├── profile/
    │   ├── page.tsx               Server: auth check                       ✅ Sprint 3
    │   ├── ProfileClient.tsx      4-section editor + sidebar card           ✅ Sprint 3
    │   └── courses/
    │       ├── page.tsx
    │       └── CoursesClient.tsx  Course CRUD with per-field validation     ✅ Sprint 3
    │
    └── components/
        ├── Navbar.tsx             Floating pill navbar (landing page only)
        ├── PageLayout.tsx         Sidebar + main wrapper (shared)
        ├── ThemeProvider.tsx      Context + localStorage + .dark toggle (client)
        ├── ThemeToggle.tsx        Sun/moon button (client)
        └── ScrollAnimations.tsx  IntersectionObserver reveals (client)
```

---

## 4. Routing & access control

| Route                        | Auth required | Onboarded required | Behaviour if condition fails                          |
| ---------------------------- | ------------- | ------------------ | ----------------------------------------------------- |
| `/`                          | No            | No                 | —                                                     |
| `/signup`                    | No            | No                 | Onboarded users → `/dashboard`                        |
| `/signin`                    | No            | No                 | Onboarded users → `/dashboard`                        |
| `/onboarding`                | Yes           | No                 | No user → `/signin`; already onboarded → `/dashboard` |
| `/dashboard`                 | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |
| `/partners`                  | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |
| `/partners/profile/[goalId]` | Yes           | Yes                | No user → `/signin`                                   |
| `/requests`                  | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |
| `/profile`                   | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |
| `/profile/courses`           | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |
| `/availability`              | Yes           | Yes                | No user → `/signin`; not onboarded → `/onboarding`    |

Guard implementation: `middleware.ts` reads `profiles.onboarded_at` on every request to `/dashboard`, `/onboarding`, `/signin`, `/signup`. This is a single indexed DB read per navigation.

---

## 5. Auth flows

### Email + password registration

```
/signup form → supabase.auth.signUp() → confirmation email sent
→ user clicks link → /auth/callback?code=...&next=/onboarding
→ exchangeCodeForSession() → redirect /onboarding
→ wizard completes → profiles.onboarded_at set → redirect /dashboard
```

### OAuth (Google / GitHub)

```
/signup or /signin → signInWithOAuth({ redirectTo: /auth/callback?next=/onboarding })
→ provider → /auth/callback?code=...&next=/onboarding
→ exchangeCodeForSession() → middleware checks onboarded_at
→ not onboarded → /onboarding  |  already onboarded → /dashboard
```

### Sign-in

```
/signin form → supabase.auth.signInWithPassword()
→ middleware reads onboarded_at → /dashboard (onboarded) or /onboarding (new)
```

---

## 6. Onboarding wizard (US-23)

A 7-question typeform-style one-at-a-time flow in `OnboardingClient.tsx`:

| #   | Question                 | Type      | Behaviour                                                        |
| --- | ------------------------ | --------- | ---------------------------------------------------------------- |
| 1   | University               | Text      | Enter or OK to advance                                           |
| 2   | Major                    | Text      | Enter or OK to advance                                           |
| 3   | Year of study            | Selection | Auto-advance after 320 ms                                        |
| 4   | Study style              | Selection | Auto-advance after 320 ms                                        |
| 5   | Communication preference | Selection | Auto-advance after 320 ms                                        |
| 6   | Timezone                 | Dropdown  | Continue button; saves profile to DB on advance                  |
| 7   | Courses (1–5)            | Form      | Finish button; saves courses + user_courses; sets `onboarded_at` |

Animation: CSS keyframe slide-in from right (forward) / left (back), triggered by `key` prop re-mount. Direction state (`1 | -1`) switches the class.

---

## 7. CSS token system

All colours are CSS custom properties so dark mode works without Tailwind's `dark:` variant.

```
globals.css
  :root { ... }      ~35 light tokens
  .dark { ... }      same names, dark values
  @keyframes { ... } all animations in one place
  .slide-in-right / .slide-in-left   onboarding animation
  .btn-glow / .card-3d / [data-animate]   utility classes
```

`ThemeProvider` toggles `.dark` on `<html>` and every `var(--token)` follows.

### Brand token set (Sprint 4)

Five tokens replace every hardcoded indigo reference in the authenticated app shell:

| Token                 | Light                  | Dark                   | Usage                               |
| --------------------- | ---------------------- | ---------------------- | ----------------------------------- |
| `--brand`             | `#0d9488`              | `#2dd4bf`              | Buttons, accents, active indicators |
| `--brand-strong`      | `#0f766e`              | `#5eead4`              | Hover / emphasis state              |
| `--brand-fg`          | `#ffffff`              | `#04201d`              | Text on brand-colored surfaces      |
| `--brand-soft-bg`     | `rgba(13,148,136,.1)`  | `rgba(45,212,191,.12)` | Chip / badge backgrounds            |
| `--brand-soft-border` | `rgba(13,148,136,.32)` | `rgba(45,212,191,.3)`  | Info banner borders                 |

### Sidebar layout (Sprint 4)

`app/dashboard/Sidebar.tsx` is shared by all five authenticated pages:

```
<aside class="flex flex-col h-screen">
  ├── <div class="flex-1 overflow-y-auto">   ← Logo + nav (scrolls if needed)
  │     Logo (rainbow arc SVG + wordmark)
  │     <nav> … nav items …
  └── <div class="shrink-0 border-t">        ← Always visible bottom section
        Profile row  (initials chip + name + "View profile")
        Theme toggle (sun / moon icon)
        Sign out
```

---

## 8. Security

| Concern                   | Mitigation                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Cross-user data access    | Row Level Security on all tables; `auth.uid()` in every policy                                        |
| Service-role key exposure | `admin.ts` used only in server-side route handler; blocked in production                              |
| Open redirect             | `/auth/callback` validates `next` param is a same-origin path (`/path`, not `//evil.com`)             |
| Raw error messages        | `signin/page.tsx` returns generic "Credentials are incorrect" — no Supabase error text                |
| Duplicate email detection | `signUp()` `identities.length === 0` check surfaces user-friendly message                             |
| Password policy           | 8-character minimum validated client-side and server-side before Supabase call                        |
| SQL injection             | Parameterised queries via Supabase JS SDK                                                             |
| XSS                       | React escapes by default; no `dangerouslySetInnerHTML`                                                |
| Secrets                   | `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser                                                 |
| Session                   | Cookie session via `@supabase/ssr`; `getUser()` verifies token server-side on every protected request |

---

## 9. Deployment

| Environment | Frontend         | Database / Auth             |
| ----------- | ---------------- | --------------------------- |
| Development | `localhost:3000` | Supabase dev project        |
| Production  | Vercel           | Supabase production project |

Details and environment variables: `deployment.md`.

---

_Last updated: 2026-11-17 (Sprint 4 — UI redesign, teal brand system, Sidebar bottom section complete)._
