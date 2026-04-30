# Codebase Structure

**Analysis Date:** 2026-04-30

## Directory Layout

```
output/                         # Project root
├── study.html                  # Entire SPA (UI + state + sync client, ~3056 lines)
├── city.html                   # Separate standalone page sharing dark design system
├── main.swift                  # macOS menu bar app (Swift, Cocoa/WebKit)
├── sync_server.py              # Local OAuth + sync server (Python, port 3847)
├── build_app.sh                # Build + install macOS .app bundle script
├── netlify.toml                # Netlify routing: /api/* → functions, / → study.html
├── schoology_config.json       # OAuth credential template (consumer key/secret/tokens)
├── README.txt                  # Exported data manifest (counts, file list)
├── TASKS.md                    # Project task tracking
│
├── netlify/
│   └── functions/
│       ├── auth.js             # OAuth Step 1: request token → redirect to Schoology
│       ├── callback.js         # OAuth Step 2: exchange verifier for access token
│       └── sync.js             # API proxy: fetch Schoology data, return JSON
│
├── study_launch/               # Clean deployment artifact mirror (same files)
│   ├── study.html
│   ├── main.swift
│   ├── sync_server.py
│   ├── build_app.sh
│   ├── netlify.toml
│   ├── schoology_config.json
│   ├── CONTEXT.md              # Project overview and deployment guide
│   └── netlify/
│       └── functions/
│           ├── auth.js
│           ├── callback.js
│           └── sync.js
│
├── .build/                     # Swift compiler output (gitignored)
│   └── Study Planner           # Compiled binary
│
├── __pycache__/                # Python bytecode cache (gitignored)
│   └── sync_server.cpython-310.pyc
│
├── .planning/                  # GSD planning documents
│   └── codebase/
│       ├── STACK.md
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
│ — Exported Schoology data snapshots —
├── courses.csv                 # All enrolled courses (ID, title, URL)
├── grades.csv                  # Overall grade per course (% + letter)
├── assignments.csv             # Every assignment (due date, score, grade)
├── updates.csv                 # Course feed posts / announcements
└── summary.json                # Full nested JSON (courses → assignments)
```

## Directory Purposes

**Root (`output/`):**
- Purpose: Active development workspace; source of truth for all editable files
- Contains: All source files for both deployment targets (Netlify and macOS)
- Key files: `study.html`, `main.swift`, `sync_server.py`, `build_app.sh`

**`netlify/functions/`:**
- Purpose: Netlify serverless functions — OAuth proxy and API bridge
- Contains: Three Node.js handler modules, each independently deployable
- Key files: `auth.js`, `callback.js`, `sync.js`
- Note: Each file is self-contained; no shared module yet (OAuth helpers are copy-pasted)

**`study_launch/`:**
- Purpose: Clean snapshot of the project used as a Netlify deployment artifact or handoff bundle
- Contains: Mirrors of all files needed to deploy or build the app
- Key file: `CONTEXT.md` — canonical project overview and deployment instructions
- Note: Must be kept in sync with root manually; changes to root files should be mirrored here

**`.build/`:**
- Purpose: Swift compiler intermediate output
- Generated: Yes (by `build_app.sh`)
- Committed: No (should be gitignored)

**`__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes (by Python runtime)
- Committed: No (should be gitignored)

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents consumed by planning and execution agents
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `study.html`: Browser SPA entry point — served at `/` on Netlify, loaded in WKWebView on macOS
- `main.swift` line 295: macOS app entry point — `NSApplication.shared.run()`
- `sync_server.py` line 548: Python sync server entry point — `HTTPServer(...).serve_forever()`
- `build_app.sh` line 1: Build script entry point — run manually

**Configuration:**
- `netlify.toml`: Netlify publish directory and redirect rules
- `schoology_config.json`: OAuth credential store / template (consumer key, access tokens)
- `study.html` lines 654–1389: `const DATA` — the embedded application state object

**Core Logic:**
- `study.html` line 1686: `runSync()` — Netlify sync trigger
- `study.html` line 1645: `mergeSchoologyData()` — merge API response into live DATA
- `study.html` line 2604: `computeSmartFocus()` — time-aware smart focus card logic
- `study.html` line 2720: `_nearestDraggable()` — drag-and-drop utility
- `study.html` line 2732: `makeDraggable()` — today/plan column drag behavior
- `study.html` line 2809: `makeDraggableWeekCol()` — week view drag behavior
- `sync_server.py` line 325: `extract_data_from_html()` — read DATA block from file
- `sync_server.py` line 340: `write_data_to_html()` — patch DATA block back into file
- `sync_server.py` line 213: `build_data()` — transform Schoology API response → DATA
- `netlify/functions/sync.js` line 112: `buildData()` — same transform, JS version

**macOS App:**
- `main.swift` lines 13–168: `AppDelegate` — status item, popover, notifications
- `main.swift` lines 174–289: `WebViewController` — WKWebView setup, JS bridge, nav delegate
- `main.swift` line 208: `studyHTMLPath()` — four-candidate path resolution for study.html

**Testing:**
- No test files exist. See CONCERNS.md.

## Naming Conventions

**Files:**
- Lowercase with underscores for Python: `sync_server.py`
- camelCase for JavaScript functions: `buildData()`, `runSync()`, `courseColor()`
- PascalCase for Swift classes: `AppDelegate`, `WebViewController`
- UPPERCASE for documentation/config: `README.txt`, `CONTEXT.md`, `TASKS.md`
- Kebab-case not used

**Directories:**
- Lowercase with underscores: `study_launch/`, `netlify/`
- Lowercase for generated: `.build/`, `__pycache__/`

**DATA object keys:**
- camelCase: `lastUpdated`, `todayStr`, `daysOut`
- Snake_case for sync metadata fields: `_synced`, `_req_token`, `_req_token_secret`
- Leading underscore indicates internal/transient fields that are stripped or preserved differently

## Where to Add New Code

**New UI tab or section:**
- Add tab button to `#nav` in `study.html` HTML template section
- Add `.tab` div with matching ID
- Add render function (follow pattern of `renderToday()` line 1851, `renderWeek()` line 1995)
- Wire up in `showTab()` (line 1779)

**New sync data field:**
- Add to the `DATA` object shape in `study.html` (after the `===DATA_BEGIN===` sentinel)
- Add extraction logic to `sync_server.py` `build_data()` and `netlify/functions/sync.js` `buildData()`
- Add merge logic to `mergeSchoologyData()` in `study.html` (line 1645)

**New Netlify serverless function:**
- Create `netlify/functions/<name>.js` exporting `handler(event)`
- Add redirect in `netlify.toml` if needed (`/api/<name>` → `/.netlify/functions/<name>`)
- Mirror to `study_launch/netlify/functions/<name>.js`

**New sync endpoint (local/macOS path):**
- Add route handler to `Handler.do_GET()` or `Handler.do_POST()` in `sync_server.py`
- Add corresponding fetch call in `study.html` JS

**New macOS native feature:**
- Add JS message handler channel name in `WebViewController.loadView()` (`main.swift` line 191)
- Handle message in `userContentController(_:didReceive:)` (`main.swift` line 254)
- Call from `study.html` JS: `window.webkit.messageHandlers.<name>.postMessage({...})`

**New helper utility (shared logic):**
- If pure data transformation: add to `sync_server.py` AND mirror to `netlify/functions/sync.js`
- If UI-only: add as a function in `study.html` JS section (after line 1396)

**Exported data files:**
- Place at project root alongside existing CSVs
- Update `README.txt` counts section

## Special Directories

**`.build/`:**
- Purpose: Swift compiler output — compiled `Study Planner` binary
- Generated: Yes, by `swiftc` call in `build_app.sh`
- Committed: No

**`__pycache__/`:**
- Purpose: Python `.pyc` bytecode for `sync_server.py`
- Generated: Yes, automatically by Python interpreter
- Committed: No

**`study_launch/`:**
- Purpose: Deployment-ready snapshot of the project for Netlify drag-drop deploy or handoff
- Generated: No (manually maintained)
- Committed: Yes
- Note: `study_launch/CONTEXT.md` is the canonical human-readable project guide

**`.planning/`:**
- Purpose: GSD agent planning documents (codebase maps, phase plans)
- Generated: Yes, by GSD agents
- Committed: Yes

---

*Structure analysis: 2026-04-30*
