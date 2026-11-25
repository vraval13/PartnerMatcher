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

## Phase 2 — Discovery & Matching ✅ (Sprint 3)

### ✅ Matching Goals (`/partners`) — US-01

- Create a matching goal: category (Course study / Exam preparation / Skill or language practice), subject or skill, proficiency level, timezone, location preference, weekly availability slots (up to 21)
- Course study goals: add institution, course code, topic; assignment mode adds assignment ID and due date
- Exam preparation goals: add exam date, preparation start/end dates
- Goals can be listed (visible to compatible students) or private
- Pause / resume matching visibility (US-16) — existing requests unaffected when paused
- Remove a goal at any time

### ✅ Partner Matching (`/partners`) — US-04/05/07

- `POST /api/v1/matches` ranks compatible candidates from the user's selected goal
- Scoring weights:
  - Course study / exam prep: topic 40%, availability 35%, location 25%
  - Skill / language practice: skill 25%, availability 50%, location 25%
- Urgency multiplier for exam prep and assignment mode: ≤2 days ×1.2; ≤7 days ×1.1; otherwise ×1.0
- Results show score breakdown, overlapping time slots (browser-local), partner name and goal detail
- Exam preparation (US-07) and recurring practice partner matching (US-07) both live under this flow

### ✅ Availability Management (`/availability`) — US-02

- Add and remove weekly availability slots
- Each slot: day of week, start time, end time, IANA timezone
- Validation: time format (`HH:MM`), valid IANA timezone, end must be after start, max 21 slots
- `POST/DELETE /api/v1/availability`

### ✅ Connection Requests (`/requests`) — US-08/09/10/11/12/13

- **Send** (US-08): propose a session with topic, start datetime, end datetime, optional message; eligibility check ensures candidate is compatible and not already connected
- **Prevent duplicate requests** (US-09): a second identical request for the same candidate, same session (course/skill/topic/assignment/exam), and same proposed time window is rejected with a 409 `DUPLICATE_REQUEST` while a prior pending request for it exists; a different session, a different candidate, or a prior request that was declined/cancelled is still allowed. The "Send request" button on `/partners` reflects this: it stays available (as "Send another request") while a request is pending or after it was declined, so a different session is always reachable, not only after cancelling
- **List sent** (US-10): "Sent" tab shows every request the student created — recipient, proposed topic, proposed time, request date, and current status — scoped so a student only ever sees their own sent requests (enforced in the query and again by the `connections_select` RLS policy); an empty list shows "No sent requests yet" rather than an error
- **List received** (US-11): "Received" tab shows incoming requests with status badge, partner name, proposed session details
- **Cancel sent** (US-12): sender can cancel a pending request; terminal states (accepted/rejected/blocked) are locked
- **Accept / Decline** (US-13): receiver can accept or decline; status updates immediately in UI
- Filter bar: filter by status (all / pending / accepted / rejected / cancelled), sort by date, free-text search across name and topic
- Stat tiles: counts for pending, accepted, declined, cancelled

### ✅ Favorite Partners (`/partners`) — US-17

- Star/heart button on each match-result card
- `POST/DELETE /api/v1/favorites`; persisted in database
- Favorites survive a page reload; shown across sessions

### ✅ Partner Profile Preview — US-07

- `/partners/profile/[goalId]`: view a matched partner's public profile
- Shows courses, weekly availability, compatibility score breakdown
- Linked from match-result cards via "View profile" button

### ✅ Dynamic Dashboard (`/dashboard`) — US-25

- Left sidebar (`Sidebar.tsx`) shared by all five app pages
- Right sidebar (`RightSidebar.tsx`): mini calendar, upcoming study sessions, profile summary card
- Dashboard content: match feed, stat tiles, suggested partner cards

### ✅ Profile Editor (`/profile`)

- 4 numbered sections: 01 / Personal, 02 / Education, 03 / Preferences, 04 / Learning
- Sidebar card: avatar initials, academic summary, enrolled-course count, profile-completion progress bar
- Save changes updates both `auth.users` metadata (name) and `profiles` table (university, major, year, study style, comm pref, timezone)

### ✅ Course Management (`/profile/courses`)

- Add up to 5 courses; each has name, code, study goal, semester
- Per-field validation with inline error messages
- Dirty-state detection: "Save courses" is only active when unsaved changes exist
- Removes de-linked courses from `user_courses` on save

---

## Phase 2b — UI Design System ✅ (Sprint 4)

### ✅ Teal Brand System

- Replaced all indigo references (`bg-indigo-600`, `text-indigo-500`, `#6366f1`) app-wide with five CSS custom-property tokens: `--brand`, `--brand-strong`, `--brand-fg`, `--brand-soft-bg`, `--brand-soft-border`
- Light and dark variants defined in `globals.css`; zero Tailwind hardcodes remain in the authenticated app shell
- Updated: `--shadow-card`, `--nav-shadow`, `.gradient-text-animated`, `.card-3d` hover glow, `pulse-ring` keyframe

### ✅ Shared Sidebar Redesign (`app/dashboard/Sidebar.tsx`)

- **Logo**: rainbow-arc SVG + "Partner**Matcher**" two-tone wordmark; strokes use `var(--brand)`
- **Layout**: `flex flex-col`; nav section scrolls independently; bottom section always visible
- **Bottom section**: Profile row (initials + name + "View profile" link) · Dark/Light theme toggle · Sign out

### ✅ Consistent Page Headers

All four app pages (Partners, Profile, Courses, Requests) now share the same header pattern:

- Teal eyebrow label (section context)
- Bold `h1` heading
- Subtitle / description paragraph
- Dark/light theme toggle button (top-right)

### ✅ Partners Page Retheme (`app/partners/PartnersClient.tsx`)

Previously had no CSS-variable theming; rebuilt from scratch:

- Fully-themed `inputClass` with focus ring and card-inner background
- Proper card backgrounds on all five bordered sections
- Brand-colored primary buttons; card-outline secondary buttons
- Inline-style banners for error and info states
- Match-result score chip (teal soft-bg); themed connect-request modal

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

_Last updated: 2026-11-17 (Sprint 4 complete — UI redesign & teal brand system shipped)._
