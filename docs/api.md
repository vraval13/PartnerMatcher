# API & Data Access Reference

PartnerMatcher has **no custom REST API server**. All data access goes through the **Supabase JS SDK** directly from Next.js — Server Components, Client Components, and Route Handlers each use the appropriate Supabase client.

There is one internal Next.js API Route:

| Route | Purpose | Available |
|---|---|---|
| `POST /api/auth/register` | Pre-confirmed account creation for dev use only | Dev only — returns 404 in production |

---

## Clients

Three Supabase clients live in `frontend/lib/supabase/`:

### `lib/supabase/client.ts` — Browser client
Used in Client Components (`"use client"`).

```ts
import { getSupabase } from "@/lib/supabase/client";
const supabase = getSupabase();
```

Uses the anon key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Safe to ship to the browser. All queries are subject to Row Level Security.

### `lib/supabase/server.ts` — SSR cookie client
Used in Server Components, Route Handlers, and `middleware.ts`.

```ts
import { createServerClient } from "@/lib/supabase/server";
const supabase = await createServerClient();
```

Reads and writes the session cookie via `@supabase/ssr`. Always use `supabase.auth.getUser()` (not `getSession()`) to verify auth server-side.

### `lib/supabase/admin.ts` — Service-role client
Used only in the dev-only `/api/auth/register` route handler. **Never imported from browser code.**

```ts
import { getAdminSupabase } from "@/lib/supabase/admin";
const adminSupabase = getAdminSupabase();
```

Uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS. The route that imports it returns 404 when `NODE_ENV === "production"`.

---

## Auth operations

All auth calls go through Supabase Auth directly from the browser client.

### Sign up (email + password)

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: name },
    emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
  },
});

// Duplicate email: Supabase returns a user with no identities instead of an error
if (data.user?.identities?.length === 0) {
  // "An account with this email already exists. Please sign in."
}
// Success: confirmation email sent — data.user is populated, session is null
```

### Sign in (email + password)

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  // Map to generic messages — never expose raw Supabase error text
  if (error.message.toLowerCase().includes("email not confirmed")) {
    // "Please confirm your email address before signing in."
  } else {
    // "Credentials are incorrect. Please try again."
  }
}
// Success: session cookie set; middleware reads onboarded_at to route user
```

### OAuth (Google / GitHub)

```ts
await supabase.auth.signInWithOAuth({
  provider: "github", // or "google"
  options: {
    redirectTo: `${origin}/auth/callback?next=/onboarding`,
  },
});
// Browser redirects to provider; provider returns to /auth/callback
```

### OAuth callback (`/auth/callback/route.ts`)

```ts
// Validates next param (same-origin only), exchanges code for session
const { error } = await supabase.auth.exchangeCodeForSession(code);
// Redirects to safeNext(next) — /onboarding for new users, /dashboard for returning
```

`safeNext()` rejects any `next` that doesn't start with `/` or starts with `//` (open-redirect prevention).

### Sign out

```ts
await supabase.auth.signOut();
// Session cookie cleared; middleware redirects to /signin
```

---

## Profile operations

### Read own profile (server-side)

```ts
// Server Component
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from("profiles")
  .select("full_name, email, onboarded_at, university, major, year_of_study, timezone, study_style, comm_pref")
  .eq("user_id", user.id)
  .single();
```

### Update profile (onboarding)

```ts
// Client Component
const { error } = await supabase
  .from("profiles")
  .update({
    university,
    major,
    year_of_study: yearNum,
    study_style: studyStyle,
    comm_pref: commPref,
    timezone,
    onboarded_at: new Date().toISOString(), // marks wizard complete
  })
  .eq("user_id", userId);
```

### Check onboarding state (middleware)

```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("onboarded_at")
  .eq("user_id", user.id)
  .single();

const isOnboarded = !!profile?.onboarded_at;
```

---

## Course operations

### Upsert a course (onboarding)

```ts
// Insert or find existing course by name + university
const { data: course, error } = await supabase
  .from("courses")
  .upsert(
    { name: courseName, code: courseCode || null, university },
    { onConflict: "name,university", ignoreDuplicates: false }
  )
  .select("id")
  .single();
```

### Enroll in a course

```ts
const { error } = await supabase.from("user_courses").upsert(
  {
    user_id: userId,
    course_id: courseId,
    goal,
    semester: currentSemester(), // e.g. "Fall 2026"
    is_active: true,
  },
  { onConflict: "user_id,course_id,goal" }
);
```

### `currentSemester()` helper

```ts
function currentSemester(): string {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m <= 5) return `Spring ${y}`;
  if (m <= 7) return `Summer ${y}`;
  return `Fall ${y}`;
}
```

---

## Row Level Security summary

All Supabase queries from the browser are filtered by RLS automatically. Key policies:

| Table | What users can do |
|---|---|
| `profiles` | Read own row + all discoverable profiles; update own row only |
| `courses` | Read all; insert and update (authenticated users, for onboarding) |
| `user_courses` | Read own + discoverable users; write own only |
| `notifications` | Read and mark-read own only; inserts via service role |
| `match_scores` | Read own pair rows; service role only for writes |

Full policy definitions are in `docs/sql/supabase_schema.sql`.

---

## Dev-only register route (`/api/auth/register`)

Creates a pre-confirmed account via the Supabase Admin API. Used to skip email confirmation in development.

**Returns 404 in production** (`NODE_ENV === "production"`).

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "dev@example.com",
  "password": "password123",
  "name": "Dev User"
}
```

Response `201`:
```json
{ "user_id": "uuid" }
```

Errors: `400` validation, `409` email taken, `404` in production.

---

## Environment variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Project URL from Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Anon/public key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never sent to the browser; only used by the dev register route |

---

*Last updated: 2026-11-01 (Sprint 4 — rewritten; no Express backend; all data access via Supabase JS SDK).*
