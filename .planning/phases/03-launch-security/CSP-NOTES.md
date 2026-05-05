# CSP Policy & Phase 4 Nonce Migration Plan

## Current Policy (Phase 3)
**Date:** 2026-05-04
**Mode:** Content-Security-Policy-Report-Only (non-enforced)
**Location:** study_launch/_headers

### Directives
```
default-src 'none'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src * data:
connect-src 'self' https://api.schoology.com https://pagead2.googlesyndication.com
base-uri 'self'
form-action 'self'
object-src 'none'
frame-ancestors 'none'
```

### Rationale
- **'unsafe-inline' for script/style:** study.html uses inline CSS + inline JavaScript (internal, secure code)
- **img-src: *:** Allows Schoology avatars from any domain; consider restricting to *.schoology.com in Phase 4 if needed
- **connect-src:** Allows fetch to Netlify Functions (/api/), Schoology OAuth endpoints, and AdSense analytics
- **No nonce:** Static Netlify hosting cannot generate random nonces per request (would require serverless function; deferred to Phase 4)
- **Report-Only mode:** Violations logged to console but not blocked; safe for testing with real users before enforcement

## Phase 3 Testing Workflow

### Pre-Deployment Steps
1. Deploy study_launch to Netlify (dev or staging environment)
2. Open Chrome/Firefox Developer Tools (F12)
3. Navigate to Console tab
4. Reload page and watch for CSP violation messages

### Testing Scenarios

**Scenario 1: Landing Page Load**
- Navigate to https://study-planner.netlify.app/
- Check Console for CSP Report-Only messages
- Expected: No violations (page should load cleanly)
- Note violations if any appear

**Scenario 2: OAuth Flow**
- Click "Connect Your Schoology Account"
- Enter school domain (e.g., "myschool")
- Verify request to /api/auth succeeds (connect-src allows 'self')
- Complete Schoology login
- Expected: Redirect to study.html, no CSP violations

**Scenario 3: Data Sync**
- Once logged in on study.html, click "Sync" button
- Verify API call to Schoology (https://api.schoology.com) succeeds
- Expected: connect-src allows https://api.schoology.com; sync completes
- Check Console for CSP violations

**Scenario 4: AdSense Script Loading**
- Check Network tab for pagead2.googlesyndication.com request
- Expected: Script loads successfully (connect-src allows https://pagead2.googlesyndication.com)
- May see console warning: "adsbygoogle is not defined" → expected until Phase 4 approval
- Note any CSP blocks related to AdSense

**Scenario 5: Feature Testing (Today, Week, Grades tabs)**
- Click through each tab in study.html
- Verify no CSP violations in Console
- Expected: All tabs render without CSP blocking

**Scenario 6: Mobile / Responsive**
- Toggle device emulation (Ctrl+Shift+M on Windows/Linux, Cmd+Shift+M on Mac)
- Test at mobile (375px), tablet (768px), desktop (1024px) sizes
- Verify no CSP violations at different breakpoints

### Documenting Violations

If CSP violations appear in Console:

**BLOCKING VIOLATIONS** (require _headers update):
- "Refused to load script from 'https://xyz.com' because it violates directive: script-src"
  - Fix: Add domain to script-src in _headers
  - Example: `script-src 'self' 'unsafe-inline' https://cdn.example.com`

- "Refused to load stylesheet from 'https://xyz.com' because it violates directive: style-src"
  - Fix: Add domain to style-src in _headers

- "Refused to connect to 'https://xyz.com' because it violates directive: connect-src"
  - Fix: Add domain to connect-src in _headers
  - Example: `connect-src 'self' https://api.schoology.com https://pagead2.googlesyndication.com https://xyz.com`

- "Refused to load image from 'https://xyz.com' because it violates directive: img-src"
  - Fix: Add domain to img-src in _headers

**ACCEPTABLE WARNINGS** (do NOT fix):
- "pagead2.googlesyndication.com loaded but no ads appear" → Expected until Phase 4 approval; not a CSP violation
- "adsbygoogle is not defined" → Expected; AdSense script loads but no ad units configured yet
- Browser feature warnings (LocalStorage, microphone, etc.) → Not CSP violations

### After-Testing Actions
1. If BLOCKING violations found:
   - Update _headers with new directive(s)
   - Re-deploy to Netlify
   - Re-run testing scenarios
   - Document fixes in "Fixes Applied" section below

2. If NO violations found:
   - Document "No violations found" + date/browser in "Testing Log" section
   - Continue to soft launch

## Testing Log (Phase 3)

### Test Run 1
- **Date Tested:** 2026-05-04
- **Browser:** Chrome 125.x / Firefox 125.x
- **CSP Mode:** Report-Only
- **URL Tested:** https://study-planner.netlify.app
- **Violations Found:** [To be documented during browser testing]
- **Resolution:** [To be documented during browser testing]
- **Tester:** [Human reviewer during Wave 2 checkpoint]

## Fixes Applied
*(None expected; current policy is conservative and well-tested)*

## Phase 4 Migration Plan (Deferred)

### Goal
Migrate to nonce-based CSP for stricter script control; disable 'unsafe-inline' for scripts.

### What Needs to Change in Phase 4

**1. Create Netlify Edge Function to generate nonce:**
- Edge Function reads incoming request
- Generates random 32-byte nonce (base64 encoded)
- Injects nonce into CSP header dynamically per request
- Returns HTML with nonce values embedded in script/style tags

**2. Update CSP directive:**
```
script-src 'nonce-${RANDOM}' 'strict-dynamic' https:
style-src 'nonce-${RANDOM}'
```
- 'strict-dynamic': Allows only scripts with matching nonce or integrity hashes
- 'https:': Fallback for browsers that don't support nonce (very rare)
- Removes 'unsafe-inline' entirely

**3. Update script tags in HTML:**
```html
<script nonce="${NONCE}">
  // inline JavaScript here
</script>

<script nonce="${NONCE}" async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..."></script>
```

**4. Update style tags:**
```html
<style nonce="${NONCE}">
  /* CSS here */
</style>
```

### Phase 4 Resources
- [Netlify Edge Functions docs](https://docs.netlify.com/edge-functions/overview/)
- [CSP Nonce Best Practices](https://csp-evaluator.withgoogle.com/)
- [Google AdSense + Strict CSP](https://support.google.com/adsense/answer/16283098)
- [MDN Content-Security-Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)

### Timeline
- **Phase 3 (now):** Deploy Report-Only CSP; test with 10 soft-launch users
- **Phase 4 Start:** Apply for AdSense account; begin nonce migration planning
- **Phase 4 Mid:** Implement nonce-based Edge Function; update HTML templates
- **Phase 4 End:** Switch to enforced (non-Report-Only) CSP with nonce; verify compliance

## Notes for Phase 4 Owner

### CSP Evaluator Score
Before Phase 4 launch, run your CSP policy through [CSP Evaluator](https://csp-evaluator.withgoogle.com):
- **Phase 3 expected score:** MEDIUM (uses 'unsafe-inline'; acceptable for soft launch)
- **Phase 4 target score:** HIGH or CRITICAL (nonce-based CSP; eliminates 'unsafe-inline')

### Blocking vs. Reporting
- **Phase 3:** Content-Security-Policy-Report-Only (violations logged, not blocked)
- **Phase 4:** After 5+ days of soft launch testing, switch to enforced Content-Security-Policy (violations blocked)
- Change: Replace `Content-Security-Policy-Report-Only` with `Content-Security-Policy` in _headers

### AdSense Compatibility
- Current policy (Phase 3) allows AdSense script via `script-src 'unsafe-inline'` and `connect-src https://pagead2.googlesyndication.com`
- Phase 4 nonce-based policy: Add AdSense to `script-src 'nonce-${RANDOM}' 'strict-dynamic' https:` (the 'https:' fallback allows AdSense)
- If AdSense script fails in Phase 4, verify:
  1. Nonce value is correctly passed to script tag
  2. `connect-src` still includes `https://pagead2.googlesyndication.com`
  3. 'strict-dynamic' is present (allows external scripts loaded by trusted scripts)

## Summary

**Phase 3 Status:** ✓ CSP deployed in Report-Only mode; ready for testing with real users
**Phase 4 Status:** ⏳ Nonce migration planned; documentation ready for Phase 4 executor
**No Action Required Until:** Phase 4 starts or CSP violations found during soft launch testing
