# External Integrations

**Analysis Date:** 2026-04-30

## APIs & External Services

**Schoology LMS API:**
- Purpose: Pull assignments, grades, and announcements for the student's enrolled courses
- API base: `https://api.schoology.com/v1`
- Auth endpoint: `https://app.schoology.com/oauth/authorize`
- Institution URL: `https://schoology.shschools.org` (Sacred Heart Schools)
- Protocol: OAuth 1.0a (HMAC-SHA1 signatures)
- SDK/Client (Netlify path): Pure Node.js with built-in `crypto` — no SDK; OAuth implemented from scratch in `netlify/functions/auth.js`, `netlify/functions/callback.js`, `netlify/functions/sync.js`
- SDK/Client (local path): `requests-oauthlib` (`OAuth1`, `OAuth1Session`) in `sync_server.py`
- Auth env vars: `SCHOOLOGY_CONSUMER_KEY`, `SCHOOLOGY_CONSUMER_SECRET`

**Schoology API endpoints used:**
| Endpoint | Purpose | File |
|----------|---------|------|
| `POST /v1/oauth/request_token` | Step 1 OAuth: get request token | `netlify/functions/auth.js`, `sync_server.py` |
| `GET /app.schoology.com/oauth/authorize` | Redirect user to login | `netlify/functions/auth.js`, `sync_server.py` |
| `POST /v1/oauth/access_token` | Step 2 OAuth: exchange verifier for access token | `netlify/functions/callback.js`, `sync_server.py` |
| `GET /v1/users/me` | Resolve user ID and display name | `netlify/functions/callback.js`, `netlify/functions/sync.js`, `sync_server.py` |
| `GET /v1/users/{uid}/assignments` | Upcoming assignments (next 14 days, incomplete) | `netlify/functions/sync.js`, `sync_server.py` |
| `GET /v1/users/{uid}/grades` | All grade data by section and period | `netlify/functions/sync.js`, `sync_server.py` |
| `GET /v1/users/{uid}/updates` | Announcements/feed (limit 10) | `netlify/functions/sync.js`, `sync_server.py` |

## Data Storage

**Databases:**
- SQLite (`schoology.db`) — Raw exported data from the Schoology scraper
  - Not used at runtime by the app; created by the scraper that produced `assignments.csv`, `grades.csv`, `courses.csv`
  - Open with: `sqlite3 schoology.db`

**File Storage:**
- `study.html` — the DATA object is embedded directly inside the HTML file as a JavaScript constant between `// ===DATA_BEGIN===` / `// ===DATA_END===` markers
  - `sync_server.py` reads and rewrites this block in-place on each sync (`write_data_to_html`)
  - Netlify path: the sync function returns JSON; the browser updates `localStorage` instead

**Caching / Client-Side Persistence:**
- `localStorage` (browser) — stores Schoology access tokens (`sc_at`, `sc_ats`), last synced DATA, and drag-and-drop ordering
- `WKWebsiteDataStore.default()` (`main.swift`) — persistent WebView storage so localStorage survives macOS app restarts

**Exported data files (read-only artifacts, not live storage):**
- `assignments.csv` — 263 assignments with due date, score, grade
- `grades.csv` — overall grade per course (percentage + letter)
- `courses.csv` — 8 enrolled courses (ID, title, URL)
- `updates.csv` — course feed posts (0 entries at export time)
- `summary.json` — full nested JSON: courses → assignments

## Authentication & Identity

**Auth Provider:**
- Schoology OAuth 1.0a — no third-party identity provider (no Auth0, Firebase, etc.)

**Netlify flow (`netlify/functions/`):**
1. `auth.js` — fetches request token, stores token secret in a short-lived HttpOnly `sc_rts` cookie (Max-Age 600s), redirects user to Schoology login
2. `callback.js` — exchanges verifier for access token using cookie-stored secret, redirects to `/#sc_at=TOKEN&sc_ats=SECRET`; browser reads hash fragment and stores in localStorage; clears cookie
3. `sync.js` — accepts `access_token` + `access_token_secret` in POST body; signs Schoology API calls server-side using consumer secret from env vars (never exposed to browser)

**Local macOS flow (`sync_server.py`):**
- HTTP server on `http://localhost:3847`
- `/auth` → fetch request token, open browser to Schoology authorize URL
- `/oauth-callback` → exchange verifier, save tokens to `schoology_config.json`
- `/sync` (POST) → call Schoology API, rewrite DATA block in `study.html`
- `/status` (GET) → return connection state and last sync time
- `/disconnect` (GET) → clear tokens from config

**Consumer credentials location:**
- Netlify: Netlify dashboard → Site settings → Environment variables
- Local: `schoology_config.json` (plain JSON, not committed with real credentials)

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or similar service

**Logs:**
- macOS app: `~/Library/Logs/StudyPlanner.log` (stdout/stderr via LaunchAgent)
- Sync server: `~/Library/Logs/StudySync.log` (stdout/stderr via LaunchAgent)
- Netlify: Netlify Functions log viewer (platform default)
- Python sync server: `print()` statements to stdout; errors logged with function name prefix, e.g. `[sync] assignments error:`

## CI/CD & Deployment

**Hosting:**
- Primary: Netlify (static site + serverless Functions)
  - Publish directory: `.` (repo root)
  - Functions directory: `netlify/functions`
  - Routing configured in `netlify.toml`

**CI Pipeline:**
- Not detected — no GitHub Actions, CircleCI, or similar config files

**macOS app distribution:**
- Manual: `./build_app.sh` compiles Swift, creates `.app` bundle in `~/Applications/`, installs LaunchAgents for auto-launch at login

## Environment Configuration

**Required env vars (Netlify deployment):**
- `SCHOOLOGY_CONSUMER_KEY` — Schoology app consumer key
- `SCHOOLOGY_CONSUMER_SECRET` — Schoology app consumer secret
- `URL` — auto-injected by Netlify; used to construct OAuth callback URL

**Required config (local/macOS path):**
- `schoology_config.json` — template present at `/Users/caidenmatthews/claude/output/schoology_config.json`
  - Fields: `consumer_key`, `consumer_secret`, `access_token`, `access_token_secret`, `user_id`, `user_name`, `last_sync`

## Webhooks & Callbacks

**Incoming:**
- OAuth callback: `/api/callback` (Netlify) or `http://localhost:3847/oauth-callback` (local)
  - Registered as the Schoology developer app callback URL
  - Receives `oauth_token` + `oauth_verifier` query params from Schoology after user login

**Outgoing:**
- None — the app pulls data from Schoology on demand; no push webhooks configured

## macOS System Integrations

**UserNotifications (`main.swift`):**
- `UNUserNotificationCenter` — requests permission for `.alert`, `.sound`, `.badge`
- Notifications fired for agenda items starting within 15 minutes (checked every 30 minutes via `Timer`)
- JS→Swift bridge: `window.webkit.messageHandlers.studyNotify.postMessage({title, body})`

**LaunchAgents (installed by `build_app.sh`):**
- `com.caiden.studyplanner.plist` — auto-launches `Study Planner.app` at login
- `com.caiden.studysync.plist` — auto-starts `sync_server.py` at login, `KeepAlive=true`

---

*Integration audit: 2026-04-30*
