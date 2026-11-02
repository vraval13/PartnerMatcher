# Contributing Guide

Welcome to PartnerMatcher. This guide covers everything you need to open a good PR.

---

## Branch Strategy

| Branch           | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `main`           | Production-ready code. Protected — no direct pushes. |
| `vraval`         | Primary development branch for the core team         |
| `feature/<name>` | New features (`feature/signup-page`)                 |
| `fix/<name>`     | Bug fixes (`fix/dark-mode-flicker`)                  |
| `chore/<name>`   | Tooling, docs, refactors (`chore/update-deps`)       |

### Workflow

```bash
# Start new work
git checkout vraval
git pull origin vraval
git checkout -b feature/your-feature

# Work, commit, push
git add <files>
git commit -m "feat: add availability calendar to profile page"
git push -u origin feature/your-feature

# Open PR against vraval (not main)
```

---

## Commit Message Convention

Format: `<type>: <short summary in present tense>`

| Type       | When to use                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature or page                        |
| `fix`      | Bug fix                                    |
| `style`    | CSS/styling changes only (no logic change) |
| `refactor` | Code restructure without behaviour change  |
| `chore`    | Deps, tooling, config, docs updates        |
| `test`     | Adding or updating tests                   |
| `perf`     | Performance improvement                    |

Examples:

```
feat: add two-column sign-in page with GitHub OAuth button
fix: prevent new Date() during static prerender in footer
style: switch feature cards to 3D hover effect
chore: add database schema to docs/database.md
```

When working with Claude Code, end every commit message with:

```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `npm run build` passes in `frontend/` with no errors
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no ESLint warnings)
- [ ] Dark mode tested manually — toggle the theme and check every new element
- [ ] Mobile layout tested at 375 px width
- [ ] No `any` types introduced
- [ ] No hardcoded colour values in JSX — all colours via CSS variables
- [ ] New CSS tokens added to both `:root` and `.dark` blocks in `globals.css`
- [ ] New client components have a comment explaining why they need `"use client"`
- [ ] No `new Date()` called at the module or component render level (use `currentSemester()` or pass dates from server)
- [ ] If touching auth flows: confirmed `useSearchParams()` is inside a `<Suspense>` boundary
- [ ] If touching onboarding: confirmed `profiles.onboarded_at` is set on wizard completion
- [ ] If touching middleware or route guards: confirmed the `onboarded_at IS NOT NULL` check is preserved
- [ ] If touching the courses save: confirmed `savedCount` check still blocks redirect on zero saves
- [ ] Relevant docs updated (`docs/features.md` status, `docs/api.md` if Supabase queries changed, `docs/database.md` if schema changed)
- [ ] SQL schema changes reflected in `docs/sql/supabase_schema.sql` AND a new idempotent patch appended to `docs/sql/fix_profile_trigger.sql`

---

## Frontend Code Conventions

### File naming

- Page files: `app/<route>/page.tsx`
- Shared components: `app/components/ComponentName.tsx` (PascalCase)
- Client components get `"use client"` as the **first line** of the file
- Server-side client: `lib/supabase/server.ts` — use in Server Components and Route Handlers
- Browser client: `lib/supabase/client.ts` — use in Client Components only

### Auth patterns

```tsx
// Server Component — read auth session
import { createServerClient } from "@/lib/supabase/server";
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/signin");

// Client Component — Supabase calls
import { getSupabase } from "@/lib/supabase/client";
const { data, error } = await getSupabase().auth.signUp({ ... });
```

`useSearchParams()` **must** be inside a `<Suspense>` boundary — wrap the component:

```tsx
export default function MyPage() {
  return (
    <Suspense>
      <MyForm />
    </Suspense>
  );
}
```

### Component structure

```tsx
// 1. "use client" if needed
// 2. imports (React, Next.js, then local)
// 3. constants / data outside the component
// 4. types / interfaces
// 5. component function
// 6. export (default or named)
```

### Styling order of preference

1. Tailwind utility classes for layout, spacing, typography
2. CSS custom property via `style={{ ... }}` for colours and theme-aware values
3. Tailwind arbitrary values `bg-[var(--bg-card)]` when Tailwind class composition is needed
4. Direct `className` for animation utility classes from `globals.css`
5. Never: hardcoded hex/rgb colours in JSX

### Adding a new animation

1. Add `@keyframes your-anim { ... }` to `globals.css`
2. Add a utility class `.anim-your-anim { animation: your-anim ... }` to `globals.css`
3. Apply the class in JSX: `<div className="anim-your-anim">`
4. Never put `@keyframes` inside a component file

### Adding a new colour token

```css
/* In globals.css */
:root {
  --bg-new-surface: #ffffff;
  --border-new-surface: rgba(226, 232, 240, 0.85);
}
.dark {
  --bg-new-surface: #111119;
  --border-new-surface: rgba(30, 41, 59, 0.85);
}
```

Then use: `style={{ backgroundColor: "var(--bg-new-surface)" }}`

---

## What NOT to do

- **Don't** put `"use client"` on a component just because it's easier — keep things server-side as long as possible
- **Don't** use `useSearchParams()` outside a `<Suspense>` boundary — it breaks the Next.js build
- **Don't** check `profiles.university IS NOT NULL` for onboarding state — use `profiles.onboarded_at IS NOT NULL`
- **Don't** import from `node_modules/next/dist/...` directly — use public Next.js APIs only
- **Don't** use `useEffect` for data that can be fetched on the server
- **Don't** add `console.log` to committed code
- **Don't** use `!important` in CSS
- **Don't** commit `.env` files or API keys
- **Don't** commit files from `docs/sql/` — they are gitignored to protect schema details
- **Don't** run `git push --force` on `main` or `vraval`

---

## Reviewing PRs

When reviewing:

1. Check the PR description explains **what** changed and **why**
2. Pull the branch and `npm run build` locally — don't approve a failing build
3. Test the dark mode toggle
4. For auth/onboarding PRs: manually test sign-up → email confirm → onboarding → dashboard flow
5. Leave specific, actionable comments — not just "looks off"
6. Approve when all checklist items pass and the feature works as described

---

_Last updated: 2026-11-01 (Sprint 4 — auth/onboarding checklist items added)._
