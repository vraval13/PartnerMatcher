# PartnerMatcher

> Connect students with compatible study partners based on courses, goals, availability, and learning style.

PartnerMatcher is a full-stack web application built for NYU Software Engineering I. It matches university students with ideal study partners, helping them form meaningful learning relationships rather than random study groups.

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- (Backend, when added) PostgreSQL ≥ 15, Python ≥ 3.11 or Go ≥ 1.22

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

---

## Project Structure

```
PartnerMatcher/
├── frontend/                  # Next.js 16 web application
│   ├── app/
│   │   ├── components/        # Shared UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── ScrollAnimations.tsx
│   │   ├── signin/            # /signin route
│   │   ├── globals.css        # Tailwind v4 + CSS token system
│   │   ├── layout.tsx         # Root layout + ThemeProvider
│   │   └── page.tsx           # Landing page
│   ├── public/                # Static assets
│   └── package.json
├── backend/                   # API server (to be implemented)
├── docs/                      # Project documentation
│   ├── skills.md              # Tech stack & required skills
│   ├── agents.md              # AI agents & Claude Code conventions
│   ├── database.md            # Database schema & design
│   ├── architecture.md        # System architecture
│   ├── api.md                 # REST API specification
│   ├── features.md            # Feature specs & roadmap
│   ├── deployment.md          # Production deployment guide
│   ├── contributing.md        # Contribution guidelines
│   └── changelog.md           # Version history
└── README.md
```

---

## Documentation

| File | Purpose |
|---|---|
| [docs/skills.md](docs/skills.md) | Tech stack, required skills per role |
| [docs/agents.md](docs/agents.md) | AI agent conventions, Claude Code AGENTS.md |
| [docs/database.md](docs/database.md) | Full DB schema, ERD, migration strategy |
| [docs/architecture.md](docs/architecture.md) | System design, component map, data flow |
| [docs/api.md](docs/api.md) | REST API endpoints and contracts |
| [docs/features.md](docs/features.md) | Feature specs, current state, roadmap |
| [docs/deployment.md](docs/deployment.md) | Vercel, Docker, environment setup |
| [docs/contributing.md](docs/contributing.md) | PR flow, commit conventions, branch rules |
| [docs/changelog.md](docs/changelog.md) | Version history |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.2 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Runtime | React 19 |
| Icons | Inline SVG |
| Fonts | Geist Sans / Geist Mono (Google Fonts) |
| Backend (planned) | TBD — see [docs/architecture.md](docs/architecture.md) |
| Database (planned) | PostgreSQL 15 — see [docs/database.md](docs/database.md) |

---

## Current Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, how-it-works, CTA |
| `/signin` | Two-column sign-in with GitHub OAuth + email/password |
| `/signup` | Registration (planned) |
| `/dashboard` | Partner discovery feed (planned) |
| `/profile` | User profile editor (planned) |

---

## License

Academic project — NYU Tandon School of Engineering, Software Engineering I, 2026.
