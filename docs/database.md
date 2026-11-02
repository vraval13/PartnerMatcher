# Database Design

PartnerMatcher uses **PostgreSQL on Supabase**. Authentication is handled entirely by Supabase Auth (`auth.users`) — there is no custom `users` table or custom JWT system.

Full runnable SQL is in `docs/sql/supabase_schema.sql` (gitignored — run once on a fresh Supabase project).  
Migration patches for an existing deployment are in `docs/sql/fix_profile_trigger.sql`.

---

## Entity overview

```
auth.users ──── profiles          (1:1, trigger-created on sign-up)
auth.users ──── user_courses      (1:many)
auth.users ──── user_skills       (1:many)
auth.users ──── availability      (1:many)
auth.users ──── connections       (many:many via connections table)
courses    ──── user_courses      (1:many)
skills     ──── user_skills       (1:many)
connections──── study_sessions    (1:many)
study_sessions── session_feedback (1:many)
auth.users ──── notifications     (1:many)
auth.users ──── match_scores      (many:many, user_a_id < user_b_id enforced)
```

---

## Tables

### `profiles`
One row per `auth.users` row. Auto-created by the `on_auth_user_created` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK → auth.users | Cascade delete |
| `email` | TEXT UNIQUE | Denormalised from auth.users for easy querying |
| `full_name` | TEXT | Seeded from OAuth metadata or email prefix |
| `avatar_url` | TEXT | |
| `bio` | TEXT | Max 500 chars |
| `university` | TEXT | Set during onboarding |
| `major` | TEXT | Set during onboarding |
| `year_of_study` | SMALLINT | 1–8 (1=1st yr … 6=Graduate, 7=PhD, 8=Other) |
| `timezone` | TEXT | Default `America/New_York` |
| `study_style` | study_style_enum | visual / auditory / reading / kinesthetic / mixed |
| `comm_pref` | comm_pref_enum | video / chat / in_person / mixed |
| `is_discoverable` | BOOLEAN | Default TRUE |
| `onboarded_at` | TIMESTAMPTZ | NULL = not yet onboarded; set when wizard completes |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

**Onboarding check:** middleware and `onboarding/page.tsx` check `onboarded_at IS NOT NULL` to determine whether a user has completed onboarding. This replaced the older `university IS NOT NULL` check.

---

### `courses`
Shared course catalogue. Users upsert into this during onboarding.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | TEXT | Optional (e.g. "CS-GY 6233"); NULL allowed |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `university` | TEXT | |
| `department` | TEXT | |
| `created_by` | UUID FK → auth.users | SET NULL on delete |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Unique constraint:** partial index on `lower(code), lower(university) WHERE code IS NOT NULL AND university IS NOT NULL`. When `code` is NULL, uniqueness is not enforced (NULLs are not equal in PostgreSQL unique constraints).

---

### `user_courses`
Enrolments — one row per user × course × goal combination.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `course_id` | UUID FK → courses | |
| `goal` | course_goal_enum | study / exam_prep / project / tutoring / general |
| `proficiency` | proficiency_enum | beginner / intermediate / advanced |
| `semester` | TEXT | e.g. "Fall 2026"; computed from date on save |
| `is_active` | BOOLEAN | Default TRUE |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Unique on `(user_id, course_id, goal)`.

---

### `skills`
Seeded, admin-managed catalogue. Users cannot add free-form skills.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE | e.g. "Python" |
| `category` | skill_category_enum | language / programming / framework / mathematics / soft_skill / other |
| `emoji` | TEXT | |

---

### `user_skills`
Skills a user has, with level and whether they want a study partner for it.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `skill_id` | UUID FK → skills | |
| `level` | skill_level_enum | learning / comfortable / proficient / expert |
| `is_seeking_partner` | BOOLEAN | Default FALSE |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Unique on `(user_id, skill_id)`.

---

### `availability`
Weekly recurring windows. Stored in UTC; `profiles.timezone` used for display.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `day_of_week` | SMALLINT | 0=Sunday … 6=Saturday |
| `start_time` | TIME | |
| `end_time` | TIME | CHECK start_time < end_time |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `connections`
Partner connection requests and their lifecycle.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `requester_id` | UUID FK → auth.users | |
| `receiver_id` | UUID FK → auth.users | CHECK requester ≠ receiver |
| `status` | connection_status_enum | pending / accepted / rejected / blocked |
| `message` | TEXT | Max 500 chars |
| `course_id` | UUID FK → courses | SET NULL on delete; context course |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Unique on `(requester_id, receiver_id)`. Only the requester can create; only the receiver can accept/reject; both can update.

---

### `study_sessions`
Planned or completed sessions between connected partners.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT | |
| `connection_id` | UUID FK → connections | Cascade delete |
| `course_id` | UUID FK → courses | SET NULL on delete |
| `scheduled_at` | TIMESTAMPTZ | |
| `duration_minutes` | INTEGER | 1–480 |
| `location` | TEXT | NULL for online |
| `meeting_url` | TEXT | Zoom / Meet link |
| `notes` | TEXT | |
| `status` | session_status_enum | scheduled / completed / cancelled / no_show |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Can only be created for a connection with `status = 'accepted'`.

---

### `session_feedback`
Post-session ratings. Each participant rates the other once.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `session_id` | UUID FK → study_sessions | |
| `reviewer_id` | UUID FK → auth.users | CHECK reviewer ≠ reviewee |
| `reviewee_id` | UUID FK → auth.users | |
| `rating` | SMALLINT | 1–5 |
| `comment` | TEXT | Max 1000 chars |
| `created_at` | TIMESTAMPTZ | |

Unique on `(session_id, reviewer_id)`.

---

### `notifications`
In-app notification feed per user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `type` | notification_type_enum | connection_request / connection_accepted / connection_rejected / session_reminder / session_cancelled / new_match / system |
| `title` | TEXT NOT NULL | |
| `body` | TEXT | |
| `metadata` | JSONB | e.g. `{ "connection_id": "...", "from_name": "Alex" }` |
| `is_read` | BOOLEAN | Default FALSE |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Inserts are service-role only (the app never writes notifications from the browser).

---

### `match_scores`
Pre-computed pairwise compatibility. `user_a_id < user_b_id` eliminates duplicate pairs.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_a_id` | UUID FK → auth.users | |
| `user_b_id` | UUID FK → auth.users | CHECK a < b |
| `score` | DECIMAL(5,4) | 0.0000 – 1.0000 |
| `factors` | JSONB | `{ "course": 0.80, "availability": 0.65, "skill": 0.40, "style": 0.20 }` |
| `computed_at` | TIMESTAMPTZ | |

Unique on `(user_a_id, user_b_id)`.

---

## Triggers & automation

| Trigger | Table | Function | Effect |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` AFTER INSERT | `handle_new_user()` | Creates a `profiles` row; seeds `email`, `full_name`, `avatar_url` |
| `trg_profiles_updated_at` | `profiles` BEFORE UPDATE | `set_updated_at()` | Sets `updated_at = NOW()` |
| `trg_courses_updated_at` | `courses` BEFORE UPDATE | `set_updated_at()` | |
| `trg_user_courses_updated_at` | `user_courses` BEFORE UPDATE | `set_updated_at()` | |
| `trg_user_skills_updated_at` | `user_skills` BEFORE UPDATE | `set_updated_at()` | |
| `trg_availability_updated_at` | `availability` BEFORE UPDATE | `set_updated_at()` | |
| `trg_connections_updated_at` | `connections` BEFORE UPDATE | `set_updated_at()` | |
| `trg_sessions_updated_at` | `study_sessions` BEFORE UPDATE | `set_updated_at()` | |
| `trg_notifications_updated_at` | `notifications` BEFORE UPDATE | `set_updated_at()` | |

Both functions use `SECURITY DEFINER SET search_path = public`.

---

## Row Level Security

RLS is enabled on all 11 tables. Summary:

| Table | Read policy | Write policy |
|---|---|---|
| `profiles` | Own row + all discoverable profiles | Own row only |
| `courses` | Public (everyone) | Authenticated users (INSERT/UPDATE for onboarding) |
| `user_courses` | Own + discoverable users | Own only |
| `skills` | Public | Service role only |
| `user_skills` | Own + discoverable users | Own only |
| `availability` | Own + discoverable users | Own only |
| `connections` | Requester or receiver | Requester creates; both update |
| `study_sessions` | Connection participants | Participants (accepted connections only for INSERT) |
| `session_feedback` | Reviewer or reviewee | Reviewer only |
| `notifications` | Own only | Own only (mark read) — inserts via service role |
| `match_scores` | Own pair rows | Service role only |

---

## Backup & recovery (Supabase managed)

| Schedule | Type | Retention |
|---|---|---|
| Daily | Point-in-time snapshot | 7 days (free tier) / 30 days (Pro) |
| Continuous | WAL streaming | Pro tier |

For manual backup before a migration:  
Supabase Dashboard → Settings → Database → Backups → Create a backup.

---

*Last updated: 2026-11-01 (Sprint 4 schema — includes email, onboarded_at, notification enum, updated_at on all tables).*
