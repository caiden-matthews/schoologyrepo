# Testing Patterns

**Analysis Date:** 2026-04-30

## Test Framework

**Runner:** None detected.

No test files, test directories, or test configuration files exist anywhere in the repository. Confirmed:
- No `*.test.*`, `*.spec.*`, `test_*.py`, or `*_test.py` files
- No `jest.config.*`, `vitest.config.*`, `pytest.ini`, `setup.cfg`, or `pyproject.toml`
- No `package.json` with test scripts
- No `tests/`, `__tests__/`, or `spec/` directories

**This codebase has zero automated tests.**

---

## What Would Need Testing

Given the architecture, the following units are the highest-value test targets if tests were added:

### Python (`sync_server.py`)

**Pure transformation functions — no I/O, fully unit-testable:**

- `course_color(title)` — keyword matching against `SUBJECT_COLORS` dict; edge cases: unknown subject, empty string, mixed case
- `course_abbrev(title)` — string shortening with AP/Honors/Advanced prefix stripping; edge cases: single-word titles, stop-word-only titles, titles over 6 chars
- `parse_due(val)` — parses Unix timestamps and ISO date strings to aware `datetime`; edge cases: `None`, `0`, malformed strings, float timestamps
- `schoology_link(section_id, assign_id)` — URL construction; edge cases: `None` inputs
- `build_data(raw, existing)` — the core data merge logic; most complex function in the codebase; should be tested with fixtures covering: no existing data, partial overlap, `_synced` flag stripping, week skeleton construction
- `extract_data_from_html(html_path)` — regex-based JSON extraction from HTML; edge cases: malformed JSON, missing DATA block, both sentinel patterns
- `is_connected(cfg)`, `has_app_creds(cfg)` — boolean checks on config dict

**Integration (HTTP handler):**
- `do_GET` at `/status` — needs mock `load_config()`
- `do_POST` at `/sync` — needs mock `run_sync()`

### JavaScript — Netlify Functions

**Pure functions duplicated across `auth.js`, `callback.js`, `sync.js`:**

- `pct(s)` — percent-encoding; edge cases: `null`, `undefined`, special characters
- `oauthSign(method, url, params, consumerSecret, tokenSecret)` — HMAC-SHA1 signature; should be tested against known-good OAuth test vectors
- `oauthHeader(...)` — full Authorization header construction
- `courseColor(title)` — mirrors Python `course_color()`; identical logic
- `courseAbbrev(title)` — mirrors Python `course_abbrev()`; identical logic
- `parseDue(val)` — mirrors Python `parse_due()` with JS Date semantics
- `buildData(raw)` in `sync.js` — equivalent to Python `build_data()`; complex logic, high value to test

**Handler integration:**
- `exports.handler` in each function: should be tested with mock `event` objects covering happy path, missing env vars, bad tokens, and Schoology API errors

### JavaScript — `study.html` (inline)

**Utility functions:**
- `getTimeMins(str)` — parses `"8:15pm"` → minutes since midnight; edge cases: `"12:00am"`, `"12:00pm"`, missing minutes
- `subjectColor(s)` — returns color from `DATA.subjects` or default `#6B7280`
- `mergeSchoologyData(syncedData)` — merges sync response into global `DATA`; should be tested by verifying `_synced` items are replaced and manual items are preserved
- `computeSmartFocus()` — time-aware focus card logic; most complex UI function; needs mocked `Date.now()` and `DATA` states

### Swift (`main.swift`)

- `studyHTMLPath()` — file path resolution across 4 candidate locations; testable with XCTest by mocking `FileManager`
- `checkAndNotify()` — JavaScript injection and parsing of `urgent` items; integration test via `WKWebView` in XCTest

---

## How to Add Tests

### Python

If adding tests, use Python's built-in `unittest` (no install needed) or `pytest`:

```bash
pip3 install pytest
pytest sync_server_test.py -v
```

Recommended test file location: `tests/test_sync_server.py`

Example structure for the most valuable test:

```python
import unittest
from sync_server import course_color, course_abbrev, parse_due, build_data

class TestCourseColor(unittest.TestCase):
    def test_chemistry_keyword(self):
        self.assertEqual(course_color("AP Chemistry Honors"), '#34D399')
    def test_unknown_returns_default(self):
        self.assertEqual(course_color("Gym"), '#94A3B8')
    def test_empty_string(self):
        self.assertEqual(course_color(""), '#94A3B8')

class TestCourseAbbrev(unittest.TestCase):
    def test_ap_prefix(self):
        self.assertEqual(course_abbrev("AP Chemistry"), 'APCh')
    def test_honors_prefix(self):
        self.assertEqual(course_abbrev("Honors English"), 'HEn')
    def test_single_word(self):
        self.assertEqual(course_abbrev("Physics"), 'Physi')

class TestParseDue(unittest.TestCase):
    def test_unix_timestamp(self):
        result = parse_due(1700000000)
        self.assertIsNotNone(result)
    def test_iso_date_string(self):
        result = parse_due("2026-04-30")
        self.assertIsNotNone(result)
    def test_none_returns_none(self):
        self.assertIsNone(parse_due(None))
    def test_zero_returns_none(self):
        self.assertIsNone(parse_due(0))
```

### JavaScript (Netlify Functions)

If adding tests, use Jest (most compatible with CommonJS `exports.handler` pattern):

```bash
npm init -y
npm install --save-dev jest
```

```json
// package.json
{ "scripts": { "test": "jest" } }
```

Example test for the OAuth helpers in `netlify/functions/auth.js`:

```js
// tests/auth.test.js
const { oauthSign } = require('../netlify/functions/auth'); // would need to export it

test('oauthSign produces deterministic output for known inputs', () => {
  // Use official OAuth 1.0a test vectors
  const sig = oauthSign('GET', 'https://api.example.com/', {
    oauth_consumer_key: 'key',
    oauth_nonce: 'nonce',
    oauth_timestamp: '1234567890',
    oauth_version: '1.0',
    oauth_signature_method: 'HMAC-SHA1',
  }, 'secret', 'tokensecret');
  expect(typeof sig).toBe('string');
  expect(sig.length).toBeGreaterThan(0);
});
```

Note: The OAuth helpers (`pct`, `oauthSign`, `oauthHeader`) are currently not exported — they would need `module.exports = { pct, oauthSign, oauthHeader }` added to each file to be unit-tested.

---

## Coverage

**Requirements:** None enforced (no CI, no coverage tooling).

**Current coverage:** 0% — no tests exist.

**Highest-risk untested areas by impact:**

| Area | Risk | Complexity |
|------|------|------------|
| `build_data()` in `sync_server.py` | High — core sync logic | High |
| `buildData()` in `netlify/functions/sync.js` | High — duplicate of above | High |
| `oauthSign()` / `oauthHeader()` (duplicated ×3) | High — auth correctness | Medium |
| `parse_due()` / `parseDue()` | High — date parsing bugs are silent | Medium |
| `mergeSchoologyData()` in `study.html` | High — data merge correctness | Medium |
| `extract_data_from_html()` | Medium — regex fragility | Low |
| `course_abbrev()` / `courseAbbrev()` | Low — display only | Low |

---

## Test Types

**Unit Tests:** Not present. Should cover pure transformation and utility functions listed above.

**Integration Tests:** Not present. Would cover HTTP handler routes in `sync_server.py` and Netlify function handlers.

**E2E Tests:** Not present. `study.html` UI interactions (tab switching, modal opening, sync flow, drag-and-drop) are entirely manual.

**Manual testing approach (current):**
1. Run `python3 sync_server.py` → visit `http://localhost:3847/status` and `http://localhost:3847/auth`
2. Open `study.html` in browser directly (file:// URL) or via `./build_app.sh` for macOS app
3. For Netlify: `netlify dev` (if CLI installed) or deploy and test on live URL

---

## Code Duplication Risk

The OAuth signing implementation (`pct`, `oauthSign`, `oauthHeader`) is copied verbatim into all three Netlify functions (`auth.js`, `callback.js`, `sync.js`). A change to the signing algorithm must be applied in three places. Tests would catch regressions if added, but the real fix is extracting to a shared `netlify/functions/_oauth.js` helper.

Similarly, `courseColor`/`courseAbbrev`/`parseDue`/`buildData` are duplicated between `sync_server.py` and `netlify/functions/sync.js`. Any logic fix in the Python version must be manually mirrored in JS.

---

*Testing analysis: 2026-04-30*
