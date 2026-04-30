# Coding Conventions

**Analysis Date:** 2026-04-30

## Overview

This codebase spans four languages: Swift (`main.swift`), Python (`sync_server.py`), JavaScript (Netlify functions in `netlify/functions/`), and HTML/CSS/JS (the monolithic `study.html`). No unified linter or formatter config is present. Each language follows its own idioms with consistent internal style.

---

## Naming Patterns

**Files:**
- All lowercase with underscores for Python: `sync_server.py`
- camelCase for JavaScript Netlify functions: `auth.js`, `callback.js`, `sync.js`
- PascalCase (Swift convention) not used in filenames; single file `main.swift`
- Kebab-case for shell scripts: `build_app.sh`
- Lowercase HTML entry point: `study.html`, `city.html`
- Config files in JSON: `schoology_config.json`

**Functions / Methods:**

*Swift (`main.swift`):*
- Instance methods: camelCase — `setupStatusItem()`, `openPopover()`, `closePopover()`, `sendNotification(title:body:)`
- Selector methods prefixed with `@objc`: `togglePopover(_:)`
- Setup methods grouped with `setup` prefix: `setupStatusItem()`, `setupPopover()`
- Notification/timer methods grouped: `requestNotificationPermission()`, `scheduleNotificationChecks()`, `checkAndNotify()`

*Python (`sync_server.py`):*
- Module-level helpers: snake_case — `load_config()`, `save_config()`, `is_connected()`, `has_app_creds()`, `api_get()`, `find_study_html()`
- Data transformation helpers: snake_case — `course_color()`, `course_abbrev()`, `parse_due()`, `schoology_link()`, `build_data()`, `fetch_all()`, `run_sync()`
- HTTP handler class: PascalCase `Handler(BaseHTTPRequestHandler)` with method names matching the protocol: `do_GET()`, `do_POST()`, `do_OPTIONS()`
- Response helpers on `Handler`: `send_json()`, `send_html()`, `cors()`

*JavaScript (Netlify functions — `netlify/functions/`):*
- Top-level helpers: camelCase — `pct()`, `oauthSign()`, `oauthHeader()`, `apiGet()`, `get()`, `courseColor()`, `courseAbbrev()`, `parseDue()`, `schoologyLink()`, `buildData()`, `parseCookies()`, `htmlRedirect()`, `unwrap()`
- Exports use Node CJS: `exports.handler = async (event) => { ... }`

*JavaScript (inline `study.html`):*
- Render functions: `render` prefix — `renderToday()`, `renderAll()`, `renderTodayCols()`
- Action/UI functions: verb-first — `showTab()`, `openModal()`, `closeModal()`, `openTimer()`, `closeTimer()`, `dismissAlert()`, `runSync()`, `saveCustomEvent()`
- Private/internal helpers: underscore prefix — `_scToken()`, `_scSecret()`, `_scUser()`, `_scConnected()`, `_syncTimeout`, `_focusRefresher`
- Utility functions: descriptive — `subjectColor()`, `chip()`, `timerBadge()`, `getTimeMins()`, `formatDate()`, `getGreeting()`, `computeSmartFocus()`

**Variables:**

*Swift:*
- Properties: camelCase — `statusItem`, `popover`, `webViewController`, `notificationTimer`, `eventMonitor`
- Constants: camelCase

*Python:*
- Module-level constants: SCREAMING_SNAKE_CASE — `API_BASE`, `REQUEST_TOKEN_URL`, `AUTHORIZE_URL`, `CALLBACK_URL`, `PORT`, `DEFAULTS`, `SUBJECT_COLORS`, `BASE_DIR`, `CONFIG_FILE`
- Local variables: snake_case — `raw`, `existing`, `new_data`, `due_dt`, `due_local`, `due_str`

*JavaScript:*
- Constants (env vars): ALL_CAPS — `KEY`, `SECRET`, `SITE`, `API_BASE`, `COLORS`
- Local variables: camelCase — `accessToken`, `accessSecret`, `reqToken`, `reqSecret`, `userName`
- DOM element queries: short descriptive — `btn`, `lbl`, `spin`

**CSS Classes:**
- All lowercase kebab-case: `.nav-btn`, `.alert-banner`, `.focus-card`, `.sync-btn`, `.timer-badge`, `.col-item`, `.day-col`, `.modal-overlay`, `.modal-sheet`
- State modifiers appended: `.active`, `.syncing`, `.ok`, `.err`, `.dismissing`, `.today`
- Type-qualified variants: `.badge-red`, `.badge-green`, `.badge-gray`, `.badge-major`, `.alert-banner.red`, `.alert-banner.amber`

---

## Code Style

**Formatting:**
- No Prettier, ESLint, Black, or SwiftFormat config detected
- Swift uses 4-space indentation; aligned `=` for related assignments
- Python uses 4-space indentation; aligned `=` within related config blocks
- JavaScript in Netlify functions uses 2-space indentation
- Inline HTML/CSS/JS in `study.html` mixes condensed and expanded styles — CSS is expanded, JS logic is condensed (many one-liners using `&&`, `||`, ternary)

**Linting:**
- No `.eslintrc`, `biome.json`, or `pyproject.toml` detected
- No pre-commit hooks or CI enforcement

**String Templates:**
- Swift: string interpolation with `\(expr)` inside `"..."` and multi-line `""" ... """`
- Python: f-strings — `f"[sync] assignments error: {e}"`, `f"{API_BASE}/{path.lstrip('/')}"`
- JavaScript: template literals — `` `${API_BASE}/${path.replace(/^\//, '')}` ``
- HTML generation: all three languages produce HTML strings via template literals / f-strings; no templating engine used

---

## Section Headers / Structure Markers

A distinctive pattern across all files: major sections are marked with decorative ASCII comment headers.

**Swift (`main.swift`):**
```swift
// ─────────────────────────────────────────────────────────────────────────────
// MARK: - App Delegate
// ─────────────────────────────────────────────────────────────────────────────

// ─── Status Bar Icon ───────────────────────────────────────────────────
```

**Python (`sync_server.py`):**
```python
# ── Schoology OAuth endpoints ─────────────────────────────────────────────────
# ── Config ────────────────────────────────────────────────────────────────────
# ── Fetch from API ────────────────────────────────────────────────────────────
```

**JavaScript (`study.html` inline, Netlify functions):**
```js
// ── OAuth 1.0a helpers (pure Node, no npm deps) ───────────────────────────────
// ── Handler ───────────────────────────────────────────────────────────────────
// ============================================================
// RENDER TODAY  (two-column)
// ============================================================
```

Use this same header style when adding new sections to any file.

---

## Import Organization

**Swift (`main.swift`):**
```swift
import Cocoa
import WebKit
import UserNotifications
```
Standard framework imports only; alphabetical within Apple frameworks.

**Python (`sync_server.py`):**
```python
import json, os, re, sys, time, webbrowser, threading   # stdlib (comma-separated on one line)
from datetime import datetime, timedelta, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse, urlencode

# Then conditional third-party (guarded in try/except):
try:
    import requests
    from requests_oauthlib import OAuth1, OAuth1Session
except ImportError:
    ...
```

**JavaScript (Netlify functions):**
```js
const crypto = require('crypto');   // stdlib only; no npm packages
```
Pure Node stdlib — no `package.json` or `node_modules`. All OAuth signing is hand-rolled.

---

## Error Handling

**Swift:**
- Optional chaining with `guard let` / `if let` throughout
- Errors from async callbacks checked: `if let error = error { print("...") }`
- `try?` used for JSON deserialization where failure is non-fatal
- External link navigation uses `decisionHandler(.cancel)` / `decisionHandler(.allow)` — no thrown errors

**Python:**
- `try/except Exception` (broad catch) at API call sites; errors printed with `print(f"  [sync] ... error: {e}")`
- Config loading catches all exceptions and falls back to `DEFAULTS`
- Data parsing functions (`parse_due`, `extract_data_from_html`) catch silently and return `None`
- HTTP handler methods catch at handler level and call `send_html(500, ...)` / `send_json(500, ...)`
- `run_sync()` returns `(bool, str)` tuples: `(True, "Synced N assignments, M alerts")` or `(False, "error message")`

**JavaScript (Netlify functions):**
- `try/catch` at handler boundary; errors returned as JSON `{ ok: false, error: err.message }`
- `Promise.allSettled` used in `sync.js` for parallel API calls — individual failures do not abort the sync
- `401`/`403` status codes from upstream API are detected by string-matching `err.message` and returned as `needs_auth: true`
- `unwrap()` helper swallows settled-rejection warnings: `console.warn(result.reason?.message)`

**JavaScript (inline `study.html`):**
- `.then()/.catch()` chains on `fetch()` — no `async/await`
- Failed sync updates button state to `.err` class and reverts after 3 seconds
- `localStorage` access wrapped in `try {} catch(_) {}` to silently handle storage quota errors
- `sessionStorage` used for dismissed alerts; parse errors silently return `[]`

---

## Logging

**Python:**
- `print()` only — no logging framework
- Prefix pattern: `[Study Planner]`, `[sync]`, `[auth]` in brackets
- Example: `print(f"  [sync] assignments error: {e}")`, `print(f"  [auth] Connected as {cfg['user_name']}")`
- Indented with 2 spaces inside the startup block

**JavaScript (Netlify functions):**
- `console.warn()` for non-fatal issues in `unwrap()`
- No structured logging or log levels

**Swift:**
- `print()` only: `print("Notification permission error: \(error)")`

**Bash (`build_app.sh`):**
- Three helper functions: `ok()` (green checkmark), `info()` (yellow arrow), `die()` (red X + exit)
- All user-facing output goes through these helpers

---

## Comments

**When to Comment:**
- Section headers are mandatory (see decorative header pattern above)
- Inline `//` comments explain non-obvious decisions, not restate what code does
- Examples of good inline comments in this codebase:
  - `// auto-adapts to light/dark menu bar` (`main.swift:39`)
  - `// Silence default Apache-style logs` (`sync_server.py:386`)
  - `// Hash fragments never go to the server — the browser reads them` (`callback.js:103`)
  - `// ===DATA_BEGIN=== / ===DATA_END===` markers anchor regex replacement in `sync_server.py`

**Docstrings (Python):**
- Module-level docstring with setup instructions in `sync_server.py` (lines 2–16)
- Short one-line docstrings on key functions: `"""Shorten a course title to a compact badge label (<=5 chars)."""`
- Not all functions have docstrings; only the non-obvious ones

**JSDoc:**
- Not used. Functions are self-documenting through naming.

---

## Function Design

**Size:**
- Render functions in `study.html` are long (50–150 lines) — they build large HTML strings via template literals inline
- Utility/transformation functions are short (5–20 lines)
- HTTP handler `do_GET` in `sync_server.py` is ~80 lines with path-based dispatch using `if/elif`

**Parameters:**
- Python helpers prefer passing the `cfg` dict rather than individual fields
- JS Netlify functions pass individual credentials (`consumerKey`, `consumerSecret`, `accessToken`, `accessTokenSecret`) to low-level helpers
- Swift uses named parameters: `sendNotification(title: String, body: String)`

**Return Values:**
- Python sync primitives return `(bool, str)` tuples for success/error reporting
- JS handlers always return an object `{ statusCode, headers, body }`
- JS data helpers return `null` on failure

---

## Module Design

**Exports (JavaScript):**
- Netlify functions use CommonJS: `exports.handler = async (event) => { ... }`
- No ES module syntax (`import`/`export`) anywhere in the JS codebase
- No shared module — OAuth helpers are duplicated verbatim across `auth.js`, `callback.js`, and `sync.js`

**Inline Script (study.html):**
- All logic lives in a single `<script>` block at the bottom of `study.html`
- No module bundler, no `<script type="module">`
- Global scope used freely: `DATA`, `DETAILS`, `window._focusRefresher`, `window._timerInterval`
- Functions are hoisted and called by name from event delegation

**Data Sentinels:**
- Items written by sync carry `_synced: true` — this flag is used by both `sync_server.py` and the inline JS to distinguish manually-set items from auto-synced ones
- The `// ===DATA_BEGIN=== ... // ===DATA_END===` comment markers inside `study.html` serve as regex anchors for programmatic data replacement by `sync_server.py`

---

*Convention analysis: 2026-04-30*
