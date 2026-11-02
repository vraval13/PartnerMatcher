# Feature Specifications & Roadmap

Status legend: ✅ Done · 🚧 In progress · 📋 Planned · 💡 Idea

---

## Phase 0 — Foundation ✅

### ✅ Landing Page (`/`)

- Floating pill navbar: logo, brand, center nav links, theme toggle, Get Started CTA
- Hero: animated gradient headline, beta badge, CTA buttons, social proof
- Feature cards (3): Course Study, Exam Prep, Skills & Languages — with 3D hover
- How It Works: 3-step process with connector arrows
- CTA band, footer
- Smooth scroll, scroll-reveal animations (IntersectionObserver)
- Floating particle dots, ambient orbs

### ✅ Dark / Light Theme

- ThemeProvider reads system preference and localStorage on mount
- `.dark` class toggled on `<html>`; CSS custom property tokens cascade to every component
- 0.3 s `transition-colors` on structural elements; sun/moon toggle in navbar

---

## Phase 1 — Auth & Onboarding ✅ (Sprint 4)

### ✅ Sign-Up Page (`/signup`) — US-22

- Name, email, password (min 8 chars with Show/Hide toggle)
- Continue with GitHub / Continue with Google (OAuth)
- `supabase.auth.signUp()` → confirmation email sent
- Duplicate email detection via `identities.length === 0` check
- Email-sent confirmation screen with "wrong email? go back" option
- Password validated client-side and server-side before Supabase call

### ✅ Sign-In Page (`/signin`) — US-22

- Email + password form; Continue with GitHub / Continue with Google
- Generic error message ("Credentials are incorrect") — no raw Supabase text
- Separate message for unconfirmed accounts
- Reads `?error=auth_callback_failed` from OAuth failures
- Wrapped in `<Suspense>` for Next.js prerender compatibility

### ✅ Email Confirmation Flow — US-22

- `emailRedirectTo: /auth/callback?next=/onboarding`
- `/auth/callback` validates `next` param (same-origin only), exchanges code, redirects
- No dev bypass in production — `/api/auth/register` returns 404 when `NODE_ENV === "production"`

### ✅ OAuth (Google + GitHub) — US-22

- Available on both `/signup` and `/signin`
- Callback: `/auth/callback?next=/onboarding` for new users; middleware routes returning users to `/dashboard`
- `handle_new_user()` DB trigger seeds `email`, `full_name`, `avatar_url` from OAuth metadata

### ✅ Route Protection & Middleware — US-22

- Unauthenticated → `/signin`
- Authenticated + not onboarded → `/onboarding`
- Authenticated + onboarded → blocked from `/signin`, `/signup`, `/onboarding`
- Guard uses `profiles.onboarded_at` (indexed, single DB read per navigation)

### ✅ Onboarding Wizard (`/onboarding`) — US-23

7-question typeform-style one-at-a-time flow:

1. University (text, Enter/OK)
2. Major (text, Enter/OK)
3. Year of study (selection, auto-advance 320 ms)
4. Study style (selection + description, auto-advance 320 ms)
5. Communication preference (selection, auto-advance 320 ms)
6. Timezone (dropdown, Continue button → saves profile to DB)
7. Courses: 1–5 entries, each with name, optional code, goal (study/exam_prep/project/tutoring/general)

- Directional slide animation (right = forward, left = back), triggered by `key` re-mount
- Back button on questions 2–7; step counter (`X / 7`); fixed progress bar
- Profile saved with `onboarded_at = NOW()` after timezone step
- Courses upserted with dynamic semester (`currentSemester()`)
- User-friendly error messages on save failure; retry without data loss (AC7)
- Already-onboarded users redirected immediately on mount

### ✅ Dashboard (`/dashboard`) — US-22

- Server component: verifies auth, passes user to client
- Displays name, email, initials avatar
- Stats row (placeholder values)
- "Suggested partners" empty state with CTA → `/onboarding`
- Sign-out button

---

## Phase 2 — Discovery & Matching 📋

### 📋 Profile Editor (`/profile/edit`)

- Edit bio, avatar, university, major, year
- Update study style, comm pref, timezone
- Add / remove courses with goal + proficiency
- Add / remove skills with level + seeking-partner toggle
- Availability calendar (weekly grid, timezone-aware)

### 📋 Real Match Feed (`/dashboard`)

- Replace empty state with ranked partner cards from `match_scores`
- Score badge, shared courses, availability overlap hours
- Filter by course, goal, min score
- Pagination / infinite scroll

### 📋 User Profile View (`/users/:id`)

- Public profile: name, avatar, university, major, year, bio, courses, skills, average rating
- "Request to study" CTA
- Available slots shown in viewer's local timezone

### 📋 Matching Algorithm

- Weighted score: courses (40%), availability (25%), skills (20%), study style (10%), comm pref (5%)
- Scores pre-computed and stored in `match_scores` table
- Recomputed when a user updates profile, availability, or courses

### 📋 Connection Request Flow

- Send request with optional message
- Receiver gets in-app notification
- Accept / Decline / Block
- Accepted → both users appear in each other's partner list

---

## Phase 3 — Collaboration 📋

### 📋 Study Session Scheduling

- Date/time picker (timezone-aware, shows partner availability)
- Online (meeting URL) or in-person (location text)
- Notes field
- Email reminder 1 hour before

### 📋 Post-Session Feedback

- Prompted after `status → completed`
- 1–5 star rating + optional comment
- Ratings aggregate to profile average

---

## Phase 4 — Engagement 📋

### 📋 Notifications

- In-app bell with unread count
- Types: connection_request, connection_accepted, session_reminder, new_match

### 📋 Forgot Password Flow

- Supabase built-in reset email flow
- `/reset-password?token=...` page

### 📋 Search (`/search`)

- Free-text across courses, skills, university
- Same filter set as dashboard

---

## Phase 5 — Advanced Ideas 💡

- **Group Study Rooms** — 3–6 students, invite code or match
- **AI Study Session Assistant** — pre-session topic suggestions, post-session summary
- **Course Integration** — import from NYU Albert / Canvas via OAuth
- **Real-time Presence** — "online now" indicator via Supabase Realtime
- **Mobile App** — React Native with shared types

---

## Non-goals

- No tutoring marketplace (no payments, no paid tutors)
- No general social network (no public posts, no followers)
- No built-in video calling (link out to Zoom / Meet)
- No conversation message storage

---

_Last updated: 2026-11-01 (Sprint 4 complete — US-22 + US-23 shipped)._
