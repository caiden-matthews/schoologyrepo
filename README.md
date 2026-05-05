# Schoology Study Planner

A web app that lets any student at any Schoology-powered school connect their account via OAuth and get a better, more feature-rich academic dashboard.

## Features

- **Today View** — See your assignments due today and study items at a glance
- **Week View** — 7-day calendar with due dates and custom events
- **Assignment Planner** — Break assignments into smaller tasks with time estimates
- **Grades** — Track your current course grades
- **Flashcards** — Study tool for active recall
- **Custom Events** — Add personal study sessions and deadlines (synced across devices via Supabase)
- **Cross-Device Sync** — Custom events persist across browsers and devices using backend database
- **Dark Mode** — Polished, cohesive dark-only design
- **Any School** — Connect from any Schoology-powered school via OAuth

## Tech Stack

- **Frontend:** Vanilla JavaScript SPA (no framework, no bundler)
- **Hosting:** Netlify static + serverless Functions
- **Authentication:** Schoology OAuth 1.0a
- **Data Storage:** 
  - Schoology API: assignment, grade, and announcement data
  - Supabase PostgreSQL: custom event persistence (Phase 2.5+)
  - localStorage: offline fallback and session cache
- **Custom Event Sync:** Supabase backend + @supabase/supabase-js client library

## Getting Started

### For Users

1. Visit the live site (URL coming soon)
2. Enter your school's Schoology domain (e.g., `myschool.schoology.com`)
3. Click "Connect Schoology" and authorize
4. Your data syncs automatically — no additional setup

### For Developers

**Prerequisites:**
- Node.js 22+ (for local testing of Netlify Functions)
- Git

**Local Development:**

```bash
# Clone the repo
git clone https://github.com/WasEpic/schoologyrepo.git
cd schoologyrepo

# Install dependencies for local testing (optional)
npm install

# Run Netlify Functions locally (requires Netlify CLI)
npm install -g netlify-cli
netlify dev
```

This starts the app at `http://localhost:8888` with hot-reload.

**Environment Variables (Netlify):**

Set these in your Netlify dashboard (Site settings → Build & deploy → Environment):

*Schoology OAuth:*
- `SCHOOLOGY_CONSUMER_KEY` — Your Schoology Platform app consumer key
- `SCHOOLOGY_CONSUMER_SECRET` — Your Schoology Platform app consumer secret

*Supabase (for custom event backend sync):*
- `SUPABASE_PROJECT_URL` — Your Supabase project URL (from Settings → API)
- `SUPABASE_ANON_KEY` — Your Supabase anon/public key
- `SUPABASE_SERVICE_KEY` — Your Supabase service role key (backend-only, never expose to browser)

**Registering a Schoology Platform App:**

1. Go to https://app.schoology.com/apps/developer/request
2. Request developer status (takes 1–3 days)
3. Once approved, visit https://app.schoology.com/apps/publisher
4. Create a new OAuth 1.0a app
5. Set callback URL to `https://yourdomain.com/api/callback`
6. Copy your consumer key/secret to Netlify env vars

## Project Structure

```
.
├── study.html              # Main SPA (all UI, state, styling inline)
├── city.html               # Alternate standalone page (same design system)
├── index.html              # Landing page (coming soon)
├── netlify/
│   ├── functions/
│   │   ├── auth.js         # Step 1: OAuth request token
│   │   ├── callback.js     # Step 2: OAuth token exchange
│   │   ├── sync.js         # Fetch data from Schoology API
│   │   ├── _oauth.js       # Shared OAuth helpers (token extraction, hashing)
│   │   └── custom-events.js # Custom event CRUD API (POST/GET/DELETE)
│   └── netlify.toml        # Routing & build config
├── supabase/
│   └── migrations/
│       └── 001_create_custom_events.sql  # Database schema for custom events
├── .planning/              # Project planning docs (roadmap, requirements)
└── README.md               # This file
```

## Architecture

- **OAuth Flow:** User → `auth.js` → Schoology login → `callback.js` → app redirects with tokens
- **Data Sync:** `sync.js` calls Schoology API (`/assignments`, `/grades`, `/updates`), transforms data, returns JSON
- **Frontend:** `study.html` reads tokens from `localStorage`, syncs on demand, renders UI without page reloads
- **Isolation:** Each user's tokens are unique; Schoology API validates scope per token

See `.planning/ROADMAP.md` and `.planning/codebase/ARCHITECTURE.md` for detailed architecture.

### Custom Event Backend Sync (Phase 2.5)

Custom events are now synchronized across devices via Supabase PostgreSQL database:

1. **Create Event:** User fills form in Browser A → event saves to localStorage immediately → background sync POSTs to `/api/custom-events`
2. **Persist:** Netlify Function extracts user_id from OAuth token (hashed for security) → inserts into Supabase with RLS protection
3. **Restore:** On page load, `restoreCustomEventsFromBackend()` fetches events from Supabase → merges with localStorage → renders unified week view
4. **Cross-Device:** User opens Browser B on different device → same OAuth token → same user_id hash → sees all custom events after page refresh
5. **Offline Fallback:** If backend sync fails (network down), events remain in localStorage and sync when connection returns

**Security:** OAuth token is hashed to user_id in database (never stored raw). Supabase Row Level Security (RLS) policies ensure users can only access their own events.

## Requirements & Roadmap

**Phase 1 (complete):**
- Multi-school OAuth (any Schoology student can connect)
- All 5 tabs fully functional
- Sync throttling (prevents rate limit abuse)
- Security headers (CSP, HSTS)
- Session-only storage (localStorage, no accounts)

**Phase 2 (complete):**
- Core app: week view, assignments, flashcards, custom events (localStorage-only)

**Phase 2.5 (complete):**
- Custom event backend sync via Supabase
- Cross-device event persistence using deterministic user_id hashing
- Offline fallback: events save locally if backend unavailable

**Phase 3+ (planned):**
- Security audit and landing page launch
- User accounts and server-side database
- Push notifications for upcoming deadlines
- Study time analytics + grade trends
- Multi-account support (one user, multiple schools)
- Export to PDF/CSV
- Real-time sync (WebSocket, Phase 4+)

**Out of Scope (v1 and beyond):**
- Direct assignment submission to Schoology
- Messaging / collaboration (use Schoology for this)
- Support for other LMS platforms (Schoology only)

See `.planning/REQUIREMENTS.md` for the full list of 37 requirements.

## Development Workflow

This project uses **GSD (Get Shit Done)** for planning and execution:

- `.planning/PROJECT.md` — Project vision, constraints, decisions
- `.planning/ROADMAP.md` — 4-phase roadmap with requirement mappings
- `.planning/REQUIREMENTS.md` — All v1 requirements (37 total)
- `.planning/config.json` — Workflow preferences (YOLO mode, coarse phases)
- `.planning/research/` — Domain research (stack, features, architecture, pitfalls)

To continue development, run `/gsd-plan-phase 1` to create the detailed Phase 1 plan.

## Deployment

**Netlify:**
- Automatic deploys on `main` branch push
- Functions deployed from `netlify/functions/`
- Environment variables managed in dashboard

## License

This project is proprietary. All rights reserved.

## Contact

Questions or issues? Open an issue on GitHub or email support (coming soon).

---

**Last updated:** 2026-05-04  
**Status:** Phase 2.5 complete — Custom event backend sync via Supabase ready for deployment
