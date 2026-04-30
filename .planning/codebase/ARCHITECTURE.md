<!-- refreshed: 2026-04-30 -->
# Architecture

**Analysis Date:** 2026-04-30

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         study.html  (UI Layer)                        │
│   Single-file SPA: CSS + HTML templates + vanilla JS (~3056 lines)   │
│   Tabs: Today · Week · Plan · Grades · Flashcards                    │
│   Embedded DATA object (lines 654–1389) is the live state store      │
└──────────────────┬─────────────────────┬────────────────────────────┘
                   │  POST /api/sync      │  Native bridge (macOS only)
                   │  GET  /api/auth      │  window.webkit.messageHandlers
                   │  GET  /api/callback  │
         ──────────▼──────────           ▼
┌────────────────────────────┐  ┌──────────────────────────────────────┐
│  Netlify Serverless Layer  │  │  macOS App Layer (alternative path)  │
│  netlify/functions/        │  │  main.swift  (NSStatusItem + WKWebView│
│  ├── auth.js               │  │  sync_server.py  (localhost:3847)    │
│  ├── callback.js           │  └──────────────────────────────────────┘
│  └── sync.js               │
└────────────┬───────────────┘
             │  OAuth 1.0a + REST
             ▼
┌──────────────────────────────┐
│  Schoology API               │
│  https://api.schoology.com/v1│
│  Assignments · Grades · Feed │
└──────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| study.html | Entire SPA: UI, state, rendering, sync client | `study.html` |
| DATA object | Embedded JSON state store (today/week/alerts/grades) | `study.html` lines 654–1389 |
| auth.js | OAuth 1.0a Step 1: get request token, redirect to Schoology | `netlify/functions/auth.js` |
| callback.js | OAuth 1.0a Step 2: exchange verifier for access token, redirect to app | `netlify/functions/callback.js` |
| sync.js | API proxy: fetch assignments/grades/updates, transform to DATA format | `netlify/functions/sync.js` |
| main.swift | macOS menu bar host: NSStatusItem + WKWebView popover + UNNotifications | `main.swift` |
| sync_server.py | Local OAuth server + sync for macOS path (port 3847) | `sync_server.py` |
| build_app.sh | Compile Swift, bundle .app, write LaunchAgent plists, sign, launch | `build_app.sh` |
| schoology_config.json | OAuth credential template (consumer key/secret/access tokens) | `schoology_config.json` |
| summary.json | Exported Schoology data snapshot (courses + assignments + grades) | `summary.json` |
| city.html | Separate standalone page sharing the same dark design system | `city.html` |

## Pattern Overview

**Overall:** Single-HTML-file SPA with serverless OAuth proxy backend

**Key Characteristics:**
- The entire application lives in one HTML file (`study.html`); there is no bundler, no npm, no build step for the frontend
- Application state is an embedded `const DATA = {...}` JavaScript object inside `study.html`, delimited by `// ===DATA_BEGIN===` and `// ===DATA_END===` comments so `sync_server.py` can surgically patch it via regex
- Two parallel deployment paths exist: Netlify (cloud) and macOS native app — both serve the same `study.html`
- OAuth consumer secret never reaches the browser; it lives in Netlify environment variables (cloud) or `schoology_config.json` (local macOS path)
- User's OAuth access token is stored in `localStorage` (Netlify path) or `schoology_config.json` (local path)
- Items in the DATA object tagged with `_synced: true` are replaced on each sync; items without that flag (manual class schedules, custom events) are preserved

## Layers

**UI / State Layer:**
- Purpose: Render tabs, handle user interactions, manage local state
- Location: `study.html`
- Contains: Inline CSS (~650 lines), HTML shell with tab markup, 1700+ lines of vanilla JS
- Depends on: Netlify functions (cloud sync) or `localhost:3847` (local sync), `localStorage` for token persistence
- Used by: End user via browser or WKWebView (macOS)

**Serverless API Proxy Layer (Netlify):**
- Purpose: Hold consumer secret, perform OAuth dance, call Schoology API, return structured JSON
- Location: `netlify/functions/`
- Contains: `auth.js`, `callback.js`, `sync.js` — each a standalone AWS Lambda-style handler
- Depends on: `SCHOOLOGY_CONSUMER_KEY`, `SCHOOLOGY_CONSUMER_SECRET` env vars; Node.js built-in `crypto`
- Used by: `study.html` fetch calls to `/api/auth`, `/api/callback`, `/api/sync`

**Local Sync Server Layer (macOS path):**
- Purpose: Identical role to Netlify functions but runs on localhost; also patches `study.html` DATA block in-place
- Location: `sync_server.py`
- Contains: Python `http.server` on port 3847, OAuth 1.0a via `requests-oauthlib`, data transformation, HTML patching via regex
- Depends on: `schoology_config.json` for credentials; `requests`, `requests-oauthlib` pip packages
- Used by: macOS app's WKWebView sync button, or directly from browser at `http://localhost:3847`

**macOS Native Shell Layer:**
- Purpose: Host the web app as a menu bar item; provide native OS notifications; manage app lifecycle
- Location: `main.swift`
- Contains: `AppDelegate` (NSStatusItem, NSPopover, UNNotifications timer), `WebViewController` (WKWebView, JS↔Swift message bridge)
- Depends on: Cocoa, WebKit, UserNotifications frameworks; study.html resolved from several candidate paths
- Used by: macOS LaunchAgent (`com.caiden.studyplanner.plist`)

**Data Export Layer:**
- Purpose: Offline snapshot of Schoology data (read-only reference)
- Location: root directory CSV files and `summary.json`
- Contains: `courses.csv`, `grades.csv`, `assignments.csv`, `updates.csv`, `summary.json`
- Depends on: External Schoology scraper (not in repo)
- Used by: Reference / import into DATA object manually if needed

## Data Flow

### Netlify OAuth + Sync Path (primary)

1. User clicks Connect in `study.html` → `fetch('/api/auth')` (`netlify/functions/auth.js`)
2. `auth.js` calls Schoology request token endpoint, sets `sc_rts` HttpOnly cookie (10 min TTL), redirects to Schoology login
3. User approves → Schoology redirects to `/api/callback` (`netlify/functions/callback.js`)
4. `callback.js` exchanges verifier for access token, redirects to `/#sc_at=TOKEN&sc_ats=SECRET&sc_user=NAME`
5. `study.html` `handleOAuthCallback()` (line 1609) reads hash, stores tokens in `localStorage`, cleans URL
6. User clicks Sync → `runSync()` (line 1686) POSTs `{ access_token, access_token_secret }` to `/api/sync`
7. `sync.js` calls Schoology API in parallel (`/assignments`, `/grades`, `/updates`), runs `buildData()`, returns JSON
8. `mergeSchoologyData()` (line 1645) merges response into in-memory DATA, re-renders all tabs without page reload

### macOS Local Path (alternative)

1. User runs `./build_app.sh` → Swift compiles, `.app` bundle created, LaunchAgents registered
2. `sync_server.py` starts on `localhost:3847` via its own LaunchAgent
3. macOS app opens → WKWebView loads `study.html` from app bundle Resources or fallback paths
4. User navigates to `http://localhost:3847/auth` → browser OAuth flow same as Netlify steps 2–5 except tokens saved to `schoology_config.json`
5. User clicks Sync in app → WKWebView JS posts to `localhost:3847/sync` → Python patches the DATA block inside `study.html` file on disk and saves new tokens

### Native Notification Path (macOS only)

1. `scheduleNotificationChecks()` fires a timer every 30 minutes + once after 5s on launch
2. `checkAndNotify()` injects JS into WKWebView, evaluates `DATA.today.agenda` for items starting within 15 minutes
3. Result JSON returned to Swift → `sendNotification()` posts `UNNotificationRequest`
4. study.html can also call `window.webkit.messageHandlers.studyNotify.postMessage({title, body})` to trigger native notifications directly

**State Management:**
- Primary state: `const DATA` object embedded in `study.html` (lines 654–1389), mutated in memory during session
- Persistence (Netlify): `localStorage` stores OAuth tokens + last-synced DATA JSON (`sc_access_token`, `sc_access_token_secret`, `sc_user`, `lastSync`)
- Persistence (macOS local): `schoology_config.json` on disk for OAuth tokens; `study.html` DATA block rewritten in place by `sync_server.py`
- Custom events: stored in `localStorage` via `getCustomEvents()` / `saveCustomEvents()` (line 2185), merged into week view via `getMergedWeek()` (line 2193)
- Drag ordering: saved automatically to `localStorage`

## Key Abstractions

**DATA object:**
- Purpose: Single source of truth for all planner content
- Structure: `{ profile, subjects, today: { date, agenda, study }, week: [7 days], alerts, grades, lastUpdated }`
- Patched by: `sync_server.py` `write_data_to_html()` (local) or merged in memory by `mergeSchoologyData()` (Netlify)
- Items with `_synced: true` are overwritten on sync; items without are user-owned

**buildData() — data transformation:**
- Purpose: Convert raw Schoology API response → DATA-compatible format
- Implementations: `sync_server.py` `build_data()` (Python) and `netlify/functions/sync.js` `buildData()` (JavaScript) — logic is intentionally mirrored
- Key helpers mirrored in both: `courseColor()`, `courseAbbrev()`, `parseDue()`, `schoologyLink()`

**WKWebView JS↔Swift Bridge:**
- Purpose: Let `study.html` trigger native macOS features
- Channels: `studyNotify` (post notification) and `studySync` (sync trigger fallback)
- Called from JS: `window.webkit.messageHandlers.studyNotify.postMessage({title, body})`
- Handled in: `WebViewController.userContentController(_:didReceive:)` (`main.swift` line 254)

**study.html file path resolution:**
- Both `main.swift` (`studyHTMLPath()` line 208) and `sync_server.py` (`find_study_html()` line 36) probe four candidate paths in order:
  1. Next to .app bundle
  2. `~/claude/output/study.html`
  3. `~/Documents/Claude/output/study.html`
  4. `~/Applications/Study Planner.app/Contents/Resources/study.html`

## Entry Points

**Browser / Netlify:**
- Location: `study.html` served at `/` (via `netlify.toml` redirect)
- Triggers: Direct browser navigation or WKWebView load
- Responsibilities: Boot app, read `localStorage` tokens, check OAuth callback hash, render initial tabs

**macOS App:**
- Location: `main.swift` — `let app = NSApplication.shared; app.run()` (line 295)
- Triggers: LaunchAgent on login, or `open ~/Applications/Study\ Planner.app`
- Responsibilities: Create status bar item, set up WKWebView popover, schedule notification timer

**Sync Server (local):**
- Location: `sync_server.py` `__main__` block (line 548)
- Triggers: LaunchAgent `com.caiden.studysync.plist`, or `python3 sync_server.py`
- Responsibilities: Serve HTTP on `127.0.0.1:3847`, handle OAuth flow, patch `study.html` on sync

**Build Script:**
- Location: `build_app.sh` line 1
- Triggers: Manual `./build_app.sh` from project root or `study_launch/`
- Responsibilities: Compile Swift, assemble .app bundle, write Info.plist, ad-hoc sign, register LaunchAgents, launch app

## Architectural Constraints

- **No build step:** `study.html` is a raw single-file app. CSS, HTML, and JS are all inline. Do not introduce a bundler without significant restructuring.
- **DATA block sentinel comments:** `sync_server.py` relies on `// ===DATA_BEGIN===` and `// ===DATA_END===` comments to locate and replace the DATA object. These sentinel comments must not be moved or renamed.
- **Dual-implementation parity:** `buildData()` logic and color/abbreviation maps exist identically in both `sync_server.py` and `netlify/functions/sync.js`. Changes to data transformation must be applied to both files.
- **No npm / no package.json:** Netlify functions use only Node.js built-in `crypto` and native `fetch`. No `node_modules` or `package.json` exist.
- **Consumer secret isolation:** The Schoology consumer secret must never appear in `study.html` or any client-side code. It belongs only in Netlify env vars or `schoology_config.json` (which is `.gitignore`-worthy).
- **Threading (macOS):** Swift app runs on the main thread. Notification evaluation uses `DispatchQueue.main.asyncAfter`. JavaScript evaluation is asynchronous via `WKWebView.evaluateJavaScript`.
- **Global state:** `DATA` is a module-level `const` in `study.html`, mutated in place by `mergeSchoologyData()`. No framework manages reactivity — all re-renders are explicit function calls.
- **`study_launch/` mirror:** `study_launch/` is a copy of the project used as a clean deployment artifact. Files in root and `study_launch/` are expected to be kept in sync manually.

## Anti-Patterns

### Duplicated OAuth helper code

**What happens:** `oauthSign()` and `oauthHeader()` are copy-pasted identically across `netlify/functions/auth.js`, `netlify/functions/callback.js`, and `netlify/functions/sync.js`.
**Why it's wrong:** A bug fix in OAuth signing must be applied in three places; drift is likely.
**Do this instead:** Extract to a shared `netlify/functions/_oauth.js` module and `require()` it from each function.

### Dual-implementation buildData()

**What happens:** Assignment transformation logic (color map, abbreviation, due-date parsing, alert generation) is duplicated between `sync_server.py` `build_data()` and `netlify/functions/sync.js` `buildData()`.
**Why it's wrong:** The two implementations can diverge silently, causing different behavior depending on deployment path.
**Do this instead:** For the Netlify path, make `sync.js` the authoritative implementation. For the local path, either retire `sync_server.py` in favor of Netlify or add a test that runs both and diffs output.

## Error Handling

**Strategy:** Defensive — errors are swallowed locally and surfaced as UI state (sync button color change) or console logs.

**Patterns:**
- Netlify functions return `{ ok: false, error: "...", needs_auth: true }` JSON on failure; `study.html` `runSync()` reads the `ok` flag and updates button state
- `sync_server.py` catches API errors per-endpoint with `try/except` and prints `[sync] error:` messages; partial data is still returned
- `main.swift` `checkAndNotify()` catches JS evaluation errors by guarding on non-nil result; missing `DATA` in the web page returns `'[]'` (line 136)
- OAuth callback failures redirect to `/#oauth_error=MESSAGE` where JS can surface them

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` in JS; `print()` in Python; `print()` in Swift. No structured logging framework.
**Validation:** Input validation is minimal — Schoology API responses are duck-typed with fallback defaults (`a.title || 'Assignment'`).
**Authentication:** Schoology OAuth 1.0a (HMAC-SHA1). Tokens stored in `localStorage` (browser) or `schoology_config.json` (macOS). No session management beyond token presence check.
**Color theming:** Dark-only. CSS custom properties defined in `:root` on `study.html` and `city.html` — `--bg: #191919`, `--card: #242424`, `--accent: #818CF8`.

---

*Architecture analysis: 2026-04-30*
