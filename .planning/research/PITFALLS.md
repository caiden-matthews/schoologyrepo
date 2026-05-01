# Pitfalls Research — Common Launch Mistakes

**Project:** Schoology Study Planner — Public SaaS  
**Researched:** 2026-05-01

---

## Critical Pitfall 1: Schoology API Rate Limits

### What Happens
You launch, get 500 users, each clicking "Sync" every few minutes. Schoology's API rate limit is hit, and all sync requests start failing silently. Users see a broken, laggy app. You don't know why.

### Warning Signs
- Sync button stays in "loading" state for > 10 seconds
- Network console shows 429 (Too Many Requests) or 503 errors from Schoology
- Only happens during peak usage (lunch, evening when students are online)

### Prevention Strategy
1. **Know the limits:** Schoology's v1 API allows ~1000 requests/hour per IP. Netlify Functions run from shared IPs, so your limit is shared across all users.
2. **Add client-side throttling:** No user can sync more than once per 30 seconds. Disable the button after a click for 30s.
3. **Add exponential backoff in sync.js:** If a Schoology API call fails with 429, wait 30s before retrying (don't retry immediately).
4. **Monitor:** Use Netlify Functions logs to spot 429s early. Alert yourself if error rate spikes.

### Which Phase Addresses It
**Phase 2 (App Conversion).** Add throttling before any public testing.

---

## Critical Pitfall 2: Hardcoded Personal Data Exposure

### What Happens
You forget to remove the embedded DATA object with your real assignments/grades from `study.html`. First user connects, sees YOUR data instead of theirs. Data privacy violation. Instant reputation hit.

### Warning Signs
- New user connects, sees assignments from "Caiden Matthews" or your courses
- Test data persists even after localStorage is cleared
- study.html contains `DATA = { profile: { name: "Caiden" }, ... }`

### Prevention Strategy
1. **Audit study.html:** Search for the DATA block (lines 654–1389 per ARCHITECTURE.md). Confirm it's been removed or replaced with an empty stub.
2. **Empty data on first load:** If DATA is missing, app should initialize with empty state (empty agenda, empty week, no grades).
3. **Test with a fresh browser:** Open incognito window, connect with a test account, confirm you see their data, not yours.

### Which Phase Addresses It
**Phase 2 (App Conversion).** This is the first major change.

---

## Critical Pitfall 3: Schoology Platform App Registration Too Late

### What Happens
You launch with school-admin OAuth keys. On June 25, 2025, Schoology deprecates single-school auth. Suddenly, users from other schools can't connect. Your app becomes broken post-launch.

### Warning Signs
- Users report "I keep getting an error when connecting to Schoology"
- Only users from your school (shschools.org) can log in
- After June 25, 2025, the problem spreads to all users

### Prevention Strategy
1. **Register Platform app ASAP:** Do not wait. Visit developers.schoology.com, register as "Platform" level, get the new consumer key/secret.
2. **Do this before Phase 1 planning:** It's a dependency outside Claude's control. You must do it manually.
3. **Update Netlify env vars immediately:** Swap out the old keys for the new ones.
4. **Test with multi-school OAuth:** Confirm a user from a different school can connect.

### Which Phase Addresses It
**Before Phase 1.** This is a blocker. Cannot proceed without Platform app registration.

---

## Pitfall 4: XSS via AdSense / Third-Party Scripts

### What Happens
You add Google AdSense code to study.html. An attacker compromises Google's ad network or finds an XSS hole in AdSense. The attacker injects JS that reads localStorage, exfiltrating student OAuth tokens.

### Warning Signs
- Suspicious network requests in dev console showing tokens being sent to attacker domain
- Students report unauthorized Schoology access
- Security researchers / bug bounty hunters report the vulnerability

### Prevention Strategy
1. **Add Content Security Policy (CSP) header:** Restrict what third-party scripts can do.
2. **Implementation:** Add `_headers` file to repo root with:
   ```
   /*
   Content-Security-Policy: script-src 'self' pagead.google.com; default-src 'self'
   ```
   This allows only your own scripts + Google AdSense scripts. Blocks data exfiltration to unknown domains.
3. **Avoid eval():** Never use `eval()` or `new Function()` in your own code — makes CSP harder to enforce.
4. **Test CSP:** Open dev console, verify no CSP violations are logged.

### Which Phase Addresses It
**Phase 4 (AdSense Integration).** Do not add AdSense before CSP is in place.

---

## Pitfall 5: Token Persistence Across Users (Shared Device)

### What Happens
Student A uses the app on a shared school computer, closes the browser. Student B sits down at the same computer, opens the same URL. Sees Student A's data still in localStorage.

### Warning Signs
- Test on a shared machine: open app, log in, close browser. Open again. Still logged in as the previous user.

### Prevention Strategy
1. **Document the behavior:** Add a note in the landing page: "This app stores your data locally. Always log out or clear your browser if using a shared device."
2. **Add a logout button:** Include a "Disconnect Schoology" button in the app. Clicking it clears localStorage and resets to [Not Connected] state.
3. **Optional: Logout on tab close:** Advanced UX — automatically clear localStorage when the tab closes (with a confirm dialog).

### Which Phase Addresses It
**Phase 2 (App Conversion).** Add logout UI + handler.

---

## Pitfall 6: API Endpoint Misalignment (Schoology Domain Validation)

### What Happens
A malicious user enters `evil.com` as their Schoology domain. The app tries to call `https://evil.com/api/v1/assignments`, which redirects to attacker's fake OAuth server. Attacker harvests consent/credentials.

### Warning Signs
- App crashes or logs errors trying to reach non-Schoology domains
- Network console shows requests to unexpected domains

### Prevention Strategy
1. **Validate school domain input:** Check that it's a valid Schoology instance before using it.
2. **Implementation:** 
   ```javascript
   // In study.html when user enters domain
   const domain = userInput.trim();
   if (!domain.includes('schoology')) {
     showError('Please enter a valid Schoology domain (e.g., myschool.schoology.com)');
     return;
   }
   ```
3. **Whitelist known patterns:** Schoology domains are typically `{schoolname}.schoology.com` or `schoology.{districtname}.org`. Add validation against common patterns.

### Which Phase Addresses It
**Phase 1 (Any-School OAuth Setup).** Validate before redirecting to OAuth.

---

## Pitfall 7: Sync Data Race (Multiple Tabs)

### What Happens
Student opens the app in two browser tabs. Tab 1 syncs and updates localStorage. Tab 2 syncs concurrently. Both write to localStorage. One overwrites the other's data, causing inconsistency.

### Warning Signs
- Data disappears or reverts unexpectedly when multiple tabs are open
- `lastSync` timestamp jumps around

### Prevention Strategy
1. **Single-tab assumption:** For v1, document that the app is designed for single-tab usage. Not ideal, but acceptable.
2. **Or: Use localStorage events:** When one tab syncs and updates localStorage, broadcast a message to other tabs:
   ```javascript
   // Tab 1: after sync
   localStorage.setItem('lastSync', Date.now());
   window.dispatchEvent(new Event('storage'));
   
   // Other tabs: listen
   window.addEventListener('storage', (event) => {
     if (event.key === 'lastSync') {
       location.reload(); // Sync with other tab's data
     }
   });
   ```
3. **Test multi-tab:** Open app in two tabs, sync in one, verify the other tab reflects the changes.

### Which Phase Addresses It
**Phase 2 (App Conversion).** Document single-tab behavior or implement multi-tab sync.

---

## Pitfall 8: AdSense COPPA Compliance

### What Happens
Your app serves users under 13 (common with middle school Schoology instances). You don't enable COPPA mode in AdSense. Google detects this, disables your account. You lose all revenue.

### Warning Signs
- AdSense account flagged or banned
- Email from Google: "Your account does not comply with COPPA regulations"

### Prevention Strategy
1. **Know your audience:** If you serve any school with grades K–6 or ages <13, you must comply with COPPA.
2. **Enable COPPA mode in AdSense:** In your AdSense account settings, mark the site as COPPA-regulated.
3. **Behavioral changes:** COPPA-regulated sites get limited ad personalization (lower CPM, but legal).
4. **Documentation:** Add age gate or disclosure: "If you're under 13, please ask a parent/guardian before using this app."

### Which Phase Addresses It
**Phase 4 (AdSense Integration).** Confirm COPPA settings before going live.

---

## Pitfall 9: Missing Schoology API Error Handling

### What Happens
Schoology's API goes down for maintenance (happens 1-2x/year). Your sync.js crashes with an unhandled error. Users see a blank app. No error message. No way to recover.

### Warning Signs
- App freezes when Schoology is unreachable
- Network tab shows 503 (Service Unavailable) from Schoology
- Sync button shows no feedback

### Prevention Strategy
1. **Wrap Schoology API calls in try/catch:** Catch errors, return fallback data (cached data from last sync, or empty).
2. **Show user-facing error:** "Schoology API is unavailable. Your data may be stale. Try again in a moment."
3. **Log errors for monitoring:** Use console or Netlify logging to track how often Schoology fails.
4. **Retry logic:** After 60s, try syncing again automatically.

### Which Phase Addresses It
**Phase 2 (App Conversion).** Implement proper error handling in sync.js before public testing.

---

## Pitfall 10: No Monitoring / Alerting Post-Launch

### What Happens
Your app breaks in production. You don't find out for hours. Users quietly abandon it. Revenue disappears.

### Warning Signs
- None, until a user complains or stops visiting
- Netlify Functions logs pile up with errors but you never check them

### Prevention Strategy
1. **Monitor Netlify Functions logs:** Check `netlify.toml` for environment-based logging, or use a third-party service (Sentry, LogRocket).
2. **Set up basic alerts:** Email yourself if the sync.js function error rate exceeds 5% in 1 hour.
3. **Uptime monitoring:** Use a free service like Uptime Robot to ping your landing page every 5 minutes. Alert if it's down.
4. **User feedback loop:** Add a "Report a bug" link or form somewhere in the app. Read user reports.

### Which Phase Addresses It
**Phase 4 (AdSense Integration / Polish).** Set up monitoring before launch.

---

## Summary: Pre-Launch Checklist

- [ ] Schoology Platform app registered (outside Claude's scope — **you must do this**)
- [ ] Hardcoded personal data removed from study.html
- [ ] Logout button implemented + clears localStorage
- [ ] School domain validation added to OAuth flow
- [ ] Client-side sync throttling (30s between syncs)
- [ ] CSP `_headers` file added to repo
- [ ] COPPA compliance configured in AdSense
- [ ] Error handling in sync.js (Schoology API failures)
- [ ] Monitoring / logging set up (Netlify logs + alerting)
- [ ] Tested with multiple users from different schools
- [ ] Tested on shared devices (data isolation)

---

*Research confidence: HIGH for generic SaaS pitfalls. MEDIUM for Schoology-specific edge cases (will refine post-launch feedback).*
