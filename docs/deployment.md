# Deployment Guide

PartnerMatcher is a Next.js + Supabase app. There is no separate backend server.

---

## Frontend — Vercel

### One-time setup

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Link the project (from `frontend/`):

   ```bash
   cd frontend
   vercel link
   ```

3. Set environment variables in the Vercel dashboard (see section below).

### Deploy

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

Or connect the GitHub repo — Vercel auto-deploys on push to `main`.

### Build settings (Vercel dashboard)

| Setting          | Value           |
| ---------------- | --------------- |
| Framework Preset | Next.js         |
| Root Directory   | `frontend`      |
| Build Command    | `npm run build` |
| Output Directory | `.next`         |
| Install Command  | `npm install`   |
| Node.js Version  | 20.x            |

---

## Environment variables

### Frontend (`frontend/.env` for dev · Vercel dashboard for prod)

```bash
# Supabase — public (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>

# Supabase — server-side only (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> `SUPABASE_SERVICE_ROLE_KEY` is used only by the dev-only `/api/auth/register` route handler.
> That route returns 404 in production (`NODE_ENV === "production"`), so the key is never active in prod.
> **Never commit `.env` files.**

---

## Database — Supabase

### New project (fresh install)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full schema:
   ```
   docs/sql/supabase_schema.sql
   ```
3. Enable auth providers: **Authentication → Providers → Google + GitHub**
4. Add redirect URLs: **Authentication → URL Configuration → Redirect URLs**
   ```
   http://localhost:3000/auth/callback
   https://<your-domain>/auth/callback
   ```

### Existing project (migrations)

Run patches in order in **SQL Editor**:

```
docs/sql/fix_profile_trigger.sql
```

This file is safe to re-run — all statements use `IF NOT EXISTS` or check `pg_constraint`/`pg_policies` before acting.

---

## CI/CD — GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, vraval]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets (Settings → Secrets and variables → Actions).

---

## Rollback

### Frontend

```bash
vercel rollback [deployment-url]
```

Or in the Vercel dashboard: Deployments → find the last good deploy → Promote to Production.

### Database

Before any migration, create a manual backup:
Supabase Dashboard → Settings → Database → Backups → Create a backup.

---

## Domain & SSL

- Frontend: `partnermatcher.app` → Vercel (SSL auto-provisioned)
- Auth callback: `partnermatcher.app/auth/callback` → must be added to Supabase redirect URL allowlist

---

_Last updated: 2026-11-01 (Sprint 4 — Supabase-only architecture, no separate backend)._
