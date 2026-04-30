# Codebase Concerns

**Analysis Date:** 2026-04-30

## Tech Debt

**Duplicate codebase (root vs study_launch/):**
- Issue: All production source files exist in two identical copies — `study.html`, `build_app.sh`, `schoology_config.json`, `main.swift`, `sync_server.py`, and all three Netlify functions are duplicated under `study_launch/`.
- Files: `/Users/caidenmatthews/claude/output/study.html` and `/Users/caidenmatthews/claude/output/study_launch/study.html` (and all counterparts)
- Impact: Any change made to root-level files must be manually mirrored into `study_launch/`, or vice versa. There is no source of truth. Edits will diverge silently.
- Fix approach: Delete the root-level duplicates and work exclusively from `study_launch/` (the canonical Netlify deploy folder per `CONTEXT.md`), or consolidate with a symlink/build step.

**OAuth helpers copy-pasted across three Netlify functions:**
- Issue: `oauthSign`, `oauthHeader`, and `pct` are copy-pasted verbatim into `auth.js`, `callback.js`, and `sync.js`. No shared module.
- Files: `netlify/functions/auth.js` lines 15–42, `netlify/functions/callback.js` lines 14–39, `netlify/functions/sync.js` lines 16–39
- Impact: A bug or security fix in the OAuth signing logic must be applied in three places. It is easy to miss one.
- Fix approach: Extract into a shared `netlify/functions/_oauth.js` helper and `require()` it from each function.

**Subject color/abbreviation logic duplicated across Python and JavaScript:**
- Issue: `SUBJECT_COLORS`/`course_color()`/`course_abbrev()` in `sync_server.py` (lines 106–143) are manually duplicated as `COLORS`/`courseColor()`/`courseAbbrev()` in `netlify/functions/sync.js` (lines 55–91). Both must stay in sync manually.
- Files: `sync_server.py:106–143`, `netlify/functions/sync.js:55–91`
- Impact: A new subject keyword added to one side will be missing from the other, producing inconsistent badge colors and labels depending on which sync path is used.
- Fix approach: Define a single JSON color map (e.g., `subject_colors.json`) and load it from both Python and JS, or consolidate to one sync path (Netlify only).

**`buildData` logic duplicated in Python and JavaScript:**
- Issue: The logic for building the DATA object from raw Schoology API results (7-day skeleton, assignment placement, alerts, grade parsing) exists in `sync_server.py:213–322` and `netlify/functions/sync.js:112–197`.
- Files: `sync_server.py:213–322`, `netlify/functions/sync.js:112–197`
- Impact: Behavioral differences between the two sync paths (macOS app vs Netlify) are likely. Testing one path does not validate the other.
- Fix approach: Pick one sync backend and retire the other.

**Embedded personal data (assignments, grades, study plans) directly in study.html:**
- Issue: `study.html` contains a large inline `const DATA = { ... }` block (lines 654–) encoding real assignment names, due dates, grade information, teacher names, sports schedules, and Schoology assignment deep-link URLs.
- Files: `study.html:654–1500` (approx.), `study_launch/study.html:654–1500`
- Impact: Every rebuild via `sync_server.py` rewrites this file. The entire HTML source doubles as a data store and a UI template — there is no separation between data and presentation. Diffs are noisy, version control is impractical for data changes, and git history conflates code changes with data snapshots.
- Fix approach: Store the DATA object in a separate `data.json` file fetched at runtime, or keep it in `localStorage` only and load from API on every visit.

---

## Known Bugs

**`studyHTMLPath()` hardcodes `~/Documents/Claude/output/` and `~/claude/output/` fallback paths:**
- Symptoms: On any machine where the project is not at those exact paths, the macOS app shows a "study.html not found" error screen.
- Files: `main.swift:214–229`, `study_launch/main.swift:214–229`
- Trigger: Install the app on a machine or account where the file lives elsewhere.
- Workaround: Place `study.html` next to the `.app` bundle; path check #1 succeeds.

**`sync_server.py` has no CSRF protection on `/sync` POST:**
- Symptoms: Any local process or web page can POST to `http://localhost:3847/sync` and trigger a Schoology API sync that overwrites `study.html`.
- Files: `sync_server.py:497–516`
- Trigger: A malicious local web page with JavaScript that posts to `localhost:3847/sync`.
- Workaround: CORS is set to `*` (line 389), which does not protect against same-origin or local requests.

**`DATA.week` items field mismatch — `items` vs `events`/`study` split:**
- Symptoms: `study.html` references both `day.items` (line 1588) and `day.events`/`day.study` (line 1660) on the week structure in different render paths. The `sync.js` / `sync_server.py` output uses `events` and `study` sub-arrays; parts of `study.html` JS iterate `day.items` directly.
- Files: `study.html:1588`, `study.html:1660–1668`, `netlify/functions/sync.js:122–123`
- Trigger: After a Schoology sync, the week view may render events from `items` as empty if it was populated from the sync path using `events`/`study`.
- Workaround: The `getMergedWeek()` function (line 2193) adds a `items` array on the fly, partially masking this.

**`updates.csv` is empty — announcements feed always returns zero rows:**
- Symptoms: The announcements/updates section of TASKS.md shows "Updates: 0". `sync_server.py` requests `/users/{uid}/updates` but the CSV is 0 bytes.
- Files: `updates.csv` (0 bytes), `sync_server.py:203–208`
- Trigger: Normal Schoology sync operation.
- Workaround: None documented; the alert feed silently omits announcements.

---

## Security Considerations

**`NSAllowsArbitraryLoads = true` in macOS app bundle:**
- Risk: The generated `Info.plist` (written by `build_app.sh` lines 150–158) sets `NSAllowsArbitraryLoads` to `true`, disabling Apple's App Transport Security for all network requests made by the embedded `WKWebView`.
- Files: `build_app.sh:150–158`, `study_launch/build_app.sh:150–158`
- Current mitigation: App is local/personal use only; no App Store submission path.
- Recommendations: Restrict to `NSAllowsLocalNetworking` only (already also present). Remove `NSAllowsArbitraryLoads`.

**`allowFileAccessFromFileURLs` enabled in WKWebView:**
- Risk: `main.swift:182` sets `allowFileAccessFromFileURLs = true` via a private KVC key, allowing any `file://` page loaded in the webview to read arbitrary files on disk.
- Files: `main.swift:182`, `study_launch/main.swift:182`
- Current mitigation: The webview only loads `study.html` from a known path.
- Recommendations: This is a private API key (`allowFileAccessFromFileURLs`) and may break in future macOS/WebKit versions. Scope access with `loadFileURL(_:allowingReadAccessTo:)` which is already used on line 233 but the KVC key grants broader access.

**OAuth access tokens stored in plaintext `localStorage`:**
- Risk: Schoology OAuth access token and secret are stored unencrypted in browser `localStorage` (study.html lines 1613–1614). Any JavaScript running in the same origin can read them. The Netlify `callback.js` passes them as URL hash parameters (line 105–108) which may appear in browser history.
- Files: `study.html:1612–1616`, `netlify/functions/callback.js:105–108`
- Current mitigation: HttpOnly cookie used for request token secret (short-lived, 10 min). Consumer secret never sent to browser.
- Recommendations: This is acceptable for a personal-use tool. For broader deployment, use HttpOnly server-side session storage instead of `localStorage` for access tokens.

**`schoology_config.json` stores OAuth credentials as plaintext on disk:**
- Risk: `schoology_config.json` at the repo root holds `consumer_key`, `consumer_secret`, `access_token`, and `access_token_secret` in plaintext. This file is not listed in `.gitignore`.
- Files: `schoology_config.json`, `study_launch/schoology_config.json`
- Current mitigation: Template file has placeholder values (`PASTE_YOUR_CONSUMER_KEY_HERE`). `build_app.sh` copies it to `~/Applications/Study Planner.app/Contents/Resources/` where real credentials may be written.
- Recommendations: Add `schoology_config.json` to `.gitignore` immediately. The filled-in copy (in `Resources/`) must never be committed.

**`sync.js` CORS policy is `Access-Control-Allow-Origin: *`:**
- Risk: Any origin can call `POST /api/sync` with a user's stored access token if obtained.
- Files: `netlify/functions/sync.js:201–204`
- Current mitigation: The consumer secret is server-only. Token abuse requires the attacker to have the user's localStorage tokens.
- Recommendations: Restrict CORS to the specific Netlify site origin.

---

## Performance Bottlenecks

**`study.html` is a 3056-line monolithic file:**
- Problem: The entire app — CSS (~500 lines), HTML structure (~200 lines), inline DATA object (~800+ lines), and JavaScript logic (~1500 lines) — lives in one file. No code splitting, no lazy loading.
- Files: `study.html` (3056 lines total)
- Cause: Single-file architecture chosen for simplicity and portability.
- Improvement path: Extract the DATA block to `localStorage`-only (load from API); extract CSS and JS to separate files if build tooling is added.

**`sync_server.py` fetches assignments, grades, and updates sequentially:**
- Problem: `fetch_all()` makes three API calls in sequence (lines 185–208), adding latency proportional to Schoology API response times (~0.5–2s each = up to 6s total sync time).
- Files: `sync_server.py:168–210`
- Cause: No `asyncio` or `threading` used for parallel API calls.
- Improvement path: The Netlify `sync.js` already uses `Promise.allSettled()` for parallel calls (line 249). Apply the same approach to `sync_server.py` using `concurrent.futures.ThreadPoolExecutor`.

**`renderAll()` re-renders all four tabs on every sync:**
- Problem: After a successful sync, `renderAll()` (study.html) re-renders Today, Week, Plan, and Grades unconditionally, even for tabs the user is not viewing.
- Files: `study.html` (renderAll call at line 2990–2994)
- Cause: No dirty-flag or virtual DOM; all rendering is innerHTML replacement.
- Improvement path: Only re-render the active tab immediately; defer other tabs until tab switch.

---

## Fragile Areas

**`write_data_to_html()` mutates `study.html` in place with regex:**
- Files: `sync_server.py:340–358`, `study_launch/sync_server.py:340–358`
- Why fragile: Uses regex substitution (`re.subn`) to locate and replace the `const DATA = {...}` block inside an HTML file. If the DATA block is accidentally reformatted, nested deeply, or the sentinel comments (`// ===DATA_BEGIN===`) are removed, the sync silently fails to write (returns `False, "Could not locate DATA block"`), leaving stale data.
- Safe modification: Always preserve the `// ===DATA_BEGIN===` and `// ===DATA_END===` comment markers in `study.html`. Do not reformat the DATA block manually.
- Test coverage: No automated tests. No validation that the written JSON round-trips correctly.

**LaunchAgent plists reference absolute paths baked in at build time:**
- Files: `build_app.sh:173–225`, `study_launch/build_app.sh:173–225`
- Why fragile: The LaunchAgent plist files written to `~/Library/LaunchAgents/` embed the absolute path to the compiled binary and Python interpreter as they existed at build time. If the app is moved, renamed, or Python is upgraded/relocated, the LaunchAgent silently fails to start the app or sync server at login.
- Safe modification: Rebuild with `build_app.sh` any time the install location or Python path changes. The script does not detect stale plists.
- Test coverage: None. No check that the LaunchAgent-launched process actually starts successfully.

**`checkAndNotify()` in Swift evaluates JavaScript against live DOM state:**
- Files: `main.swift:109–156`, `study_launch/main.swift:109–156`
- Why fragile: The notification check relies on `DATA.today.agenda` being accessible as a global JS variable inside the WKWebView. If `study.html` is not loaded (network/file error) or the DATA structure changes shape, the `evaluateJavaScript` call silently returns `[]` and no notifications fire — with no error surfaced to the user.
- Safe modification: Any rename or restructure of `DATA.today.agenda` in `study.html` must be mirrored in the JS snippet in `main.swift:111–139`.
- Test coverage: None.

**`sync_server.py` runs a single-threaded HTTP server:**
- Files: `sync_server.py:564–569`
- Why fragile: `HTTPServer` with `BaseHTTPRequestHandler` is single-threaded. If a Schoology API call blocks for the full 15-second timeout (line 101), the sync button in the UI will hang and no other requests (e.g., `/status`) will be served.
- Safe modification: Replace with `ThreadingHTTPServer` (stdlib) or add a timeout on the sync POST response.
- Test coverage: None.

---

## Scaling Limits

**`localStorage` as primary data store:**
- Current capacity: Browser localStorage is limited to ~5MB per origin.
- Limit: `summary.json` (the raw Schoology export) is already 82KB. The merged `sc_last_data` key in localStorage grows with assignment history. With 263 assignments (current count per `README.txt`), this is fine, but a full academic year of history could approach the limit.
- Scaling path: Prune `_synced` items older than 14 days from localStorage before saving.

---

## Dependencies at Risk

**`requests-oauthlib` Python package — `--break-system-packages` flag:**
- Risk: `build_app.sh` installs Python dependencies with `pip install --break-system-packages` (line 48), bypassing the system package manager. On macOS with system Python (Homebrew or Apple), this can corrupt the system Python environment.
- Impact: May break other Python tools on the developer's machine.
- Migration plan: Use a virtual environment (`python3 -m venv .venv && .venv/bin/pip install ...`) instead of global pip installs.

**Private WKWebView KVC key `allowFileAccessFromFileURLs`:**
- Risk: `main.swift:182` uses `config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")`, a private/undocumented preference key. Apple may remove or rename it in a future WebKit/macOS release, causing a silent failure (no error, but file access would break).
- Impact: The app would fail to load local CSS/JS resources from `study.html`.
- Migration plan: Switch fully to `WKWebView.loadFileURL(_:allowingReadAccessTo:)` scoped to the Resources directory (already partially in use at `main.swift:233`).

---

## Test Coverage Gaps

**No tests of any kind exist:**
- What's not tested: `sync_server.py` HTTP routes, `build_data()` transformation, `write_data_to_html()` regex mutation, all three Netlify functions, `study.html` JS rendering logic, Swift app lifecycle, and drag-and-drop state machine.
- Files: Entire codebase — no `*.test.*`, `*_test.*`, or `test_*.py` files found anywhere.
- Risk: Any refactor or change to the sync pipeline, DATA schema, or rendering logic can silently break without detection.
- Priority: High for `write_data_to_html()` (data corruption risk) and the Netlify OAuth flow (auth breakage is invisible until login fails).

---

*Concerns audit: 2026-04-30*
