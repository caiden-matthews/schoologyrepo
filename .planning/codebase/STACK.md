# Technology Stack

**Analysis Date:** 2026-04-30

## Languages

**Primary:**
- Swift — macOS menu bar app (`main.swift`, `build_app.sh`)
- JavaScript (Node.js) — Netlify serverless functions (`netlify/functions/*.js`)
- Python 3 — local OAuth/sync server (`sync_server.py`)
- HTML/CSS/Vanilla JS — single-file web app UI (`study.html`, `city.html`)

**Secondary:**
- Bash — build and installation scripts (`build_app.sh`)

## Runtime

**Environment (Netlify path):**
- Node.js (version implied by Netlify Functions runtime; no `.nvmrc` detected)
- Netlify Functions (serverless, AWS Lambda-backed)

**Environment (macOS app path):**
- macOS 12+ (Monterey minimum, declared in `Info.plist` via `LSMinimumSystemVersion`)
- Python 3 (system or user-installed; detected at build time via `command -v python3`)

**Package Manager:**
- No `package.json` present — Netlify functions use only built-in Node `crypto` and native `fetch`; zero npm dependencies
- Python: `pip3` — packages installed at build time by `build_app.sh`
- Lockfile: Not present (no npm lockfile, no `requirements.txt`)

## Frameworks

**Core:**
- None (framework-free) — `study.html` is a self-contained vanilla HTML/CSS/JS SPA
- `city.html` is a second standalone SPA with the same dark-theme design system

**macOS Native Frameworks (Swift):**
- `Cocoa` — `NSStatusItem`, `NSPopover`, `NSApplication`
- `WebKit` — `WKWebView`, `WKWebViewConfiguration`, `WKScriptMessageHandler`
- `UserNotifications` — `UNUserNotificationCenter`, push-style banners

**Testing:**
- Not detected — no test framework, spec files, or test directories found

**Build/Dev:**
- `swiftc` (Xcode Command Line Tools) — compiles `main.swift` into a macOS binary
- `codesign` — ad-hoc code signing of the `.app` bundle
- `launchctl` — registers LaunchAgents for auto-start at login

## Key Dependencies

**Python (installed by `build_app.sh` at build time):**
- `requests` — HTTP client for Schoology API calls
- `requests-oauthlib` — OAuth 1.0a session management (`OAuth1`, `OAuth1Session`)

**Node.js (Netlify functions):**
- `crypto` (built-in) — HMAC-SHA1 OAuth signatures in `auth.js`, `callback.js`, `sync.js`
- `fetch` (built-in, Node 18+) — HTTP calls to Schoology API

**Zero third-party npm packages** — all Netlify functions are dependency-free.

## Configuration

**Environment (Netlify deployment):**
- `SCHOOLOGY_CONSUMER_KEY` — set in Netlify dashboard → Site settings → Environment variables
- `SCHOOLOGY_CONSUMER_SECRET` — same location
- `URL` — automatically injected by Netlify (site base URL)

**Local (macOS app path):**
- `schoology_config.json` — JSON file storing consumer key/secret and OAuth tokens
  - Template provided; credentials filled in manually before first run
  - Location: next to `sync_server.py`; copied into `.app` Resources at build time
  - Sensitive fields: `consumer_key`, `consumer_secret`, `access_token`, `access_token_secret`

**Build:**
- `build_app.sh` — single shell script; no Makefile, Xcode project, or Swift Package Manager
- `netlify.toml` — routing: `/api/*` → `/.netlify/functions/:splat`; `/` → `/study.html`

**User data persistence:**
- Netlify path: `localStorage` in the browser (access tokens, DATA cache, drag order)
- macOS app path: `WKWebsiteDataStore.default()` (persistent WebView localStorage across app restarts)

## Platform Requirements

**Development:**
- macOS with Xcode Command Line Tools (`xcode-select --install`) for the Swift build path
- Python 3 + `pip3` for the local sync server
- Netlify CLI or GitHub integration for the serverless deployment path

**Production:**
- Netlify (static hosting + Functions) — primary deployment target per `CONTEXT.md`
- macOS 12+ — for the native menu bar app alternative
- Schoology developer app registration required (free) at `https://developers.schoology.com`

---

*Stack analysis: 2026-04-30*
