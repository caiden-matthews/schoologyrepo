# Technology Stack Research

**Project:** Schoology Study Planner — Public SaaS
**Researched:** 2026-04-30
**Overall Confidence:** HIGH (core stack) / MEDIUM (Schoology-specific edge cases)

---

## Current Stack Assessment

### What Is Already Solid — Do Not Touch

| Component | Status | Why It's Fine |
|-----------|--------|---------------|
| Vanilla JS SPA (`study.html`) | Solid | Zero-dependency is a feature, not a liability. No framework rot, no security advisories from transitive deps, instant cold load. Keep it. |
| Netlify static hosting | Solid | CDN-backed, free tier is generous for early traffic, deploy previews work correctly, environment variables are first-class. |
| Netlify Functions (CommonJS) | Acceptable now, migration path exists | Node.js 22 is now the default runtime (since Feb 24, 2025). Existing `module.exports.handler` CommonJS functions still work but are the legacy path. No urgency to migrate before launch. |
| `crypto` + native `fetch` (no npm) | Solid | Node 18+ fetch is stable. Built-in `crypto` for HMAC-SHA1 is correct. Zero supply-chain risk. Do not add npm. |
| `localStorage` for OAuth tokens | Acceptable for this use case | Addressed in detail below. |
| Dark-mode design system | Solid | CSS custom properties, no external dependencies. |
| `netlify.toml` routing | Solid | `/api/*` → `/.netlify/functions/:splat` is correct and idiomatic. |

### What Needs Attention Before Launch

| Component | Gap | Fix |
|-----------|-----|-----|
| OAuth helper duplication | `oauthSign()` / `oauthHeader()` copied across `auth.js`, `callback.js`, `sync.js` | Extract to `netlify/functions/_oauth.js`, use `require('../_oauth')` — works without npm, no package.json needed |
| No `_headers` / CSP file | No security headers on the static site | Add `_headers` file to root (described below) |
| No `NODE_VERSION` pin | Default jumped to Node 22 on Feb 24, 2025; behavior may differ from what was tested | Pin `NODE_VERSION=22` in Netlify env vars or add `.nvmrc` with `22` |
| Schoology Platform app registration | **Hard blocker for launch** — personal/school-admin keys cannot access other schools after June 25, 2025 (Schoology auth update) | Register at developers.schoology.com for a Platform-level app before any public testing |

---

## Recommended Stack (Full Picture)

### Core — No Changes

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Vanilla JS | ES2020+ | SPA UI, state management, rendering | HIGH |
| HTML/CSS | HTML5 / CSS3 | Single-file app shell + design system | HIGH |
| Netlify Static Hosting | Current | Serve `study.html` + assets | HIGH |
| Netlify Functions | Node.js 22 (default as of Feb 2025) | OAuth proxy, API proxy | HIGH |
| Node.js built-in `crypto` | Node 22 | HMAC-SHA1 for OAuth 1.0a | HIGH |
| Node.js built-in `fetch` | Node 22 | Outbound API calls in functions | HIGH |
| Schoology OAuth 1.0a | — | User authentication via Schoology | HIGH |

### To Add — Minimal Footprint, No npm

| Addition | How to Add | Why |
|----------|------------|-----|
| `netlify/functions/_oauth.js` shared module | New file, `require()` from existing functions | Eliminates triple-duplication of OAuth signing code |
| `_headers` file | New file in repo root | Adds security headers (CSP, X-Frame-Options, HSTS) without any tooling |
| `NODE_VERSION` env var | Netlify dashboard → Environment variables | Pins runtime to Node 22; prevents surprise upgrades |
| `ads.txt` file | New file in repo root | Required by Google AdSense; served automatically by Netlify at `/ads.txt` |
| Landing page (`index.html`) | New static HTML file | Separate from `study.html`; public entry point for new visitors |

---

## Session-Based Auth: localStorage Tokens

### The Question

Is storing Schoology OAuth access tokens in `localStorage` acceptable for this app?

### Answer: Yes, with XSS prevention as the actual priority

The 2025 security discourse has nuanced the "never use localStorage" dogma considerably. The authoritative pragmatic view (pragmaticwebsecurity.com) is:

> If an attacker achieves XSS in your SPA, they control your application's JavaScript execution. Whether tokens are in localStorage, memory, or a Web Worker becomes secondary — they can intercept network requests, modify the DOM, exfiltrate anything visible to JS. XSS prevention is the real lever.

The "in-memory" and "HttpOnly cookie" alternatives are architecturally complex and inappropriate for this project's constraints:
- **In-memory storage** loses tokens on tab refresh, breaking the UX entirely for a SPA with no server-side session
- **HttpOnly cookie** would require every Schoology API call to route through a Netlify Function (since the browser can't read the cookie to construct the Authorization header) — adds latency and complexity to every sync call
- **BFF pattern** requires a stateful backend, violating the no-server-side-storage decision

For this app specifically:
- The Schoology access token accesses a student's own assignment/grade data. Scope of damage if stolen is narrow.
- The app has no user-supplied input fields rendered as HTML, which is the primary XSS vector.
- Third-party scripts (AdSense) are the only realistic XSS surface, mitigated by CSP.

**Recommendation:** Keep `localStorage` for `sc_access_token`, `sc_access_token_secret`, `sc_user`. Add a `_headers` file with CSP to limit what third-party scripts can do.

### Implementation Pattern (No Changes Needed to Current Code)

The current pattern in `handleOAuthCallback()` is correct:

```
1. callback.js sets sc_rts in an HttpOnly cookie (already done — good)
2. callback redirects to /#sc_at=TOKEN&sc_ats=SECRET&sc_user=NAME
3. study.html reads hash, stores to localStorage, cleans URL
```

The one improvement worth making: **clear the hash immediately after reading** (already done per ARCHITECTURE.md line 1609's note about `handleOAuthCallback()`). Confirm the URL is cleaned before any analytics or AdSense scripts initialize.

### Confidence: HIGH

---

## Netlify Functions: OAuth Proxy Patterns

### Current Architecture Assessment

The three-function pattern (`auth.js` → `callback.js` → `sync.js`) is the correct Netlify approach for OAuth 1.0a. No changes to the architecture are needed.

### Node.js 22 Runtime

As of February 24, 2025, Netlify's default Node.js version for Functions is **Node 22**. The existing functions use:
- `require()` (CommonJS) — still works on Node 22
- `module.exports.handler` — still works (legacy Netlify Functions format)
- `crypto` — still works
- `fetch` — still works (stable since Node 18)

**No breaking changes** from the Node 22 upgrade for this codebase. However, the legacy `module.exports.handler` format is being deprecated in favor of the modern `export default async function(request, context)` format (Web Request/Response API). This migration is not required before launch but is the right path for any new functions written.

### Shared Module Pattern (No npm Required)

To eliminate the OAuth helper duplication, use a subdirectory within `netlify/functions/`:

```
netlify/functions/
  _oauth.js          ← shared helper (underscore prefix = not deployed as a function)
  auth.js            ← require('./_oauth')
  callback.js        ← require('./_oauth')
  sync.js            ← require('./_oauth')
```

Any `.js` file in the functions root is deployed as an individual function. Files in **subdirectories** or with an **underscore prefix** are treated as shared utilities, not deployed as standalone endpoints. The `_oauth.js` naming convention works for this.

**Confidence: HIGH** — confirmed by Netlify support forum thread on shared modules.

### Function Timeout

Netlify synchronous functions have a **60-second timeout**. The `sync.js` function makes three parallel Schoology API calls. Under normal conditions this is well within budget, but if Schoology's API is slow, parallel calls via `Promise.all()` are the correct pattern (already implemented per ARCHITECTURE.md).

### Modern Function Format (Future Path, Not Required for Launch)

When writing new functions post-launch, use the modern format:

```javascript
// netlify/functions/example.js
export default async function(request, context) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

This requires either `.mjs` extension or `"type": "module"` in a `package.json` inside the functions directory. Since the project has no `package.json`, the path of least resistance is renaming new functions to `.mjs`. Do not change existing `.js` functions before launch.

**Confidence: HIGH** (verified against Netlify migration guide)

---

## Google AdSense Integration

### AdSense on Netlify

Netlify is fully compatible with Google AdSense. There is no platform-level blocker. Multiple Netlify users run AdSense successfully; Google's AdSense Community confirms Netlify-hosted pages are supported.

### The SPA Problem with AdSense

Standard AdSense Auto Ads expect a traditional multi-page site: one page load = one ad impression. A SPA with tab-switching gets **one impression per visit** with Auto Ads. This is the correct behavior for a dashboard-style app — users don't navigate between URL routes.

For this app, the tabs are content sections of a single dashboard, not separate pages. Auto Ads will show once per session, which is appropriate. Do not attempt to call `adsbygoogle.push({})` on every tab switch — that violates AdSense policies and causes duplicate-impression errors.

### Implementation Steps

**Step 1 — ads.txt (Required)**

Create `/ads.txt` in the repo root with your AdSense publisher ID:

```
google.com, pub-XXXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Netlify serves files from the repo root at their literal path. `/ads.txt` resolves to `https://yourdomain.com/ads.txt` automatically. AdSense will verify this file during approval.

**Step 2 — Auto Ads script in `study.html` `<head>`**

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

Place this in the `<head>` of `study.html` (and any other pages served, including the landing page). Auto Ads will algorithmically select placement positions.

**Step 3 — Manual ad units (optional, better UX control)**

For explicit placement control (recommended to avoid ads appearing in the middle of study content), use display ad units:

```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
     data-ad-slot="YYYYYYYYYY"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

Place one unit in a static sidebar or below the main content area. Call `push({})` once per unit per page load only.

**Step 4 — AdSense approval timeline**

AdSense approval requires:
- A custom domain (not `*.netlify.app`)
- Sufficient content (the app's tabs qualify)
- Privacy policy page
- Some traffic history (not strictly 6 months — that is the "AdSense for Search" requirement; standard display AdSense reviews new sites regularly)

Apply early. Use placeholder `<ins>` elements that simply won't render until AdSense approves the account. No code changes needed post-approval.

### CSP Impact on AdSense

AdSense injects scripts from `pagead2.googlesyndication.com` and multiple Google CDN domains. A strict CSP will break AdSense. The recommended approach is to set CSP in `_headers` with AdSense domains whitelisted, rather than `unsafe-inline`. Google publishes a list of required CSP domains for AdSense.

**Confidence: MEDIUM** — Netlify + AdSense compatibility is HIGH confidence. AdSense approval timeline specifics are MEDIUM (policy details change).

---

## Tooling: Linting, Testing, CI Without npm

### The Constraint

No `package.json`, no `node_modules`, no build step. Any tooling must either:
- Run via `npx` (installs temporarily, leaves no lockfile in repo), or
- Run inside GitHub Actions CI without touching the repo's file structure, or
- Be a native tool (e.g., a browser's built-in linter).

### What Is Worth Adding

**1. ESLint via npx (CI only, not local requirement)**

ESLint can lint the inline `<script>` content in `study.html` via `eslint-plugin-html`:

```bash
npx eslint --plugin html --ext .html study.html netlify/functions/*.js
```

Run this in GitHub Actions on push. No config file is strictly required — use `--no-config-lookup` with inline `--rule` flags, or commit a minimal `.eslintrc.json` to the repo root (this is just a JSON file, not a build dependency).

Recommended minimal `.eslintrc.json`:
```json
{
  "env": { "browser": true, "node": true, "es2020": true },
  "rules": {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "eqeqeq": "error"
  }
}
```

**Confidence: HIGH** — ESLint's `--plugin html` with `npx` is well-established.

**2. GitHub Actions CI (Zero Local Footprint)**

A minimal `.github/workflows/ci.yml` that requires no local npm:

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npx --yes eslint@latest eslint-plugin-html --no-config-lookup
               --rule 'no-undef: error' --ext .html,.js .
```

This runs in CI, produces no lockfile in the repo, and does not change the no-npm constraint.

**Confidence: HIGH** — GitHub Actions `npx` pattern is standard.

**3. Testing: Not Worth Adding Pre-Launch**

The codebase has no tests. Adding a testing framework without npm (e.g., via `npx jest`) is possible but introduces significant complexity for marginal benefit before launch. The OAuth flow integration tests would require Schoology API credentials in CI, which is a separate problem.

**Recommendation:** Skip automated tests before launch. The correct first tests are integration tests against the live OAuth flow and sync endpoint, which require a real Schoology account. Add those post-launch once the Platform app is registered.

**Confidence: HIGH** — this is a pragmatic call for a weeks-to-launch timeline.

**4. What NOT to Add**

- **TypeScript** — requires a build step, contradicts the core constraint
- **Prettier** — requires npm for meaningful integration; manual formatting is fine
- **Husky / lint-staged** — requires npm and `package.json`
- **Webpack / Vite / esbuild** — explicitly out of scope
- **Jest / Vitest / Playwright** — require npm; defer post-launch

---

## Security Headers: `_headers` File

This is the highest-leverage single addition to the project. Add a `_headers` file to the repo root:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/study.html
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://www.googletagservices.com; connect-src 'self' https://api.schoology.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-src https://googleads.g.doubleclick.net;
```

Notes:
- `'unsafe-inline'` in `script-src` is required because `study.html` is a single-file app with all JS inline. Nonces or hashes would require server-side rendering or a build step — neither is viable here. This is an acceptable tradeoff.
- `connect-src` restricts `fetch()` calls to `self` (Netlify Functions) and `api.schoology.com`. This prevents exfiltrated token data from being sent to third-party hosts via XSS.
- The AdSense domains in `script-src` will need to be extended once you verify the full list of domains AdSense injects from. Google's AdSense CSP help page provides the authoritative list.

**Confidence: HIGH** — `_headers` file is Netlify's documented mechanism; CSP syntax is standard.

---

## Critical External Dependency: Schoology Platform Registration

This is not a stack decision but it gates everything. Per Schoology's June 25, 2025 authentication update:

- Personal API keys can no longer access other users' data
- Unapproved apps attempting cross-school access receive 401 errors
- Apps must be approved by Schoology to access data from schools other than their own

**This means the existing consumer key/secret — obtained for personal use — cannot be used for a public multi-school product.** A Schoology Platform developer registration is required before any public testing with real users from other schools.

Registration is at `https://developers.schoology.com`. Free. Timeline unknown (manual review process).

**This is the project's primary external dependency and launch blocker.** All other stack work can proceed in parallel, but no real multi-school OAuth testing is possible until the Platform app is approved.

**Confidence: HIGH** — Schoology's own documentation explicitly states these restrictions effective June 25, 2025.

---

## Alternatives Considered and Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth token storage | `localStorage` | HttpOnly cookie | Requires every sync call to route through a function; adds latency; breaks the client-side-only architecture |
| Auth token storage | `localStorage` | In-memory only | Token lost on tab refresh; unacceptable UX for a persistent planner |
| Shared OAuth module | `_oauth.js` with `require()` | Local npm package | Works, but requires `package.json` in the functions dir — introduces npm to the project |
| Functions format | Stay on CommonJS for existing | Migrate to modern ESM | No functional benefit before launch; risk of introducing bugs right before shipping |
| Ad integration | AdSense Auto Ads | Carbon Ads / EthicalAds | AdSense is the correct choice for a student audience; Carbon/Ethical require application and have minimum traffic requirements that won't be met at launch |
| CI linting | `npx eslint` in GitHub Actions | Pre-commit hook via Husky | Husky requires npm; CI is lower friction and sufficient |
| Testing | Defer to post-launch | Add Jest via npx now | No test infrastructure exists; writing tests for 3000 lines of undocumented state management before launch is a time sink that delays shipping |

---

## Installation / File Additions

Nothing to install. All additions are new files committed to the repo:

```
# New files to create
netlify/functions/_oauth.js    # Shared OAuth signing helpers
_headers                        # Netlify security headers
ads.txt                         # AdSense publisher verification
.github/workflows/ci.yml        # GitHub Actions lint CI
.eslintrc.json                  # ESLint config (optional, no npm)
.nvmrc                          # Pin Node.js version to 22
```

No `package.json`. No `node_modules`. No build step. The constraint holds.

---

## Sources

- Netlify Functions Overview: https://docs.netlify.com/build/functions/overview/
- Netlify Node.js 22 default upgrade (Feb 2025): https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981
- Netlify modern Functions migration guide: https://developers.netlify.com/guides/migrating-to-the-modern-netlify-functions/
- Netlify shared module pattern: https://answers.netlify.com/t/using-require-to-include-a-relative-module-in-netlify-functions-on-node/4177
- Schoology June 2025 auth update: https://developers.schoology.com/api-documentation/important-api-authentication-update/
- localStorage vs alternatives — nuanced view: https://pragmaticwebsecurity.com/articles/oauthoidc/localstorage-xss.html
- Auth0 token storage guidance: https://auth0.com/docs/secure/security-guidance/data-security/token-storage
- Curity SPA OAuth best practices: https://curity.io/resources/learn/spa-best-practices/
- AdSense on Netlify community: https://answers.netlify.com/t/can-i-use-google-adsense-in-netlify-free-plan/96938
- AdSense for SPAs: https://jasonwatmore.com/add-google-adsense-to-a-single-page-app-react-angular-vue-next-etc
- Netlify CSP documentation: https://docs.netlify.com/manage/security/content-security-policy/
- ESLint HTML plugin: https://github.com/BenoitZugmeyer/eslint-plugin-html
- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
