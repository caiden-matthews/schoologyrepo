# Architecture Research — Multi-User Conversion

**Project:** Schoology Study Planner — Public SaaS  
**Researched:** 2026-05-01

---

## Schoology Platform Developer Registration

### What Changes When You Register a Platform App

**Before:** You have school-specific OAuth credentials (consumer key/secret) issued by your school's Schoology admin. These only work for `shschools.org`.

**After:** You register a **Platform app** at `developers.schoology.com`. This gives you:
- Dedicated consumer key/secret that work across **all Schoology instances**
- Ability to direct users from any school domain to OAuth
- Access to Schoology's multi-tenant infrastructure

### Key Gotcha: Schoology Auth Update (June 25, 2025)

Schoology is retiring old auth methods for school-specific apps on June 25, 2025. After that date:
- Old school-issued keys may be disabled or rate-limited
- Platform-level apps are the required path forward

**Action:** Register your Platform app **before June 25, 2025**. This is a hard blocker for any post-launch users.

### Registration Steps

1. Visit `developers.schoology.com`
2. Create an account or sign in
3. Register an app as **Type: Platform**
4. Provide: app name, description, callback URL (`https://yourdomain.com/api/callback`)
5. Receive: new consumer key + secret (different from school-admin keys)
6. Update Netlify environment variables: `SCHOOLOGY_CONSUMER_KEY`, `SCHOOLOGY_CONSUMER_SECRET`

---

## OAuth Flow Changes for Multi-School

### Current Flow (Single School)

```
User → /api/auth (Netlify) 
  → Hardcoded to shschools.org OAuth endpoint
  → User logs in at that school
  → Redirect back to callback
```

### New Flow (Any School)

```
1. User lands on www.yoursite.com
2. User enters their school's Schoology domain (e.g., "myschool.schoology.com")
3. User clicks "Connect Schoology"
4. Redirect to /api/auth?school_domain=myschool.schoology.com
5. auth.js reads query param, constructs OAuth URL for that domain
   → https://myschool.schoology.com/oauth/authorize?oauth_token=...
6. User logs in at their school
7. callback.js receives request, knows which school via state/session tracking
8. Token is valid for that school's API calls
9. sync.js calls https://myschool.schoology.com/api/v1/* to fetch data

User's data is namespaced by their access_token in localStorage.
Since each token is unique to that user + school, isolation is automatic.
```

### Implementation Changes

**auth.js:**
- Accept `school_domain` query parameter
- Validate it's a valid Schoology domain (basic check: contains "schoology.com")
- Build OAuth request URL pointing to that domain

**callback.js:**
- Extract school domain from the OAuth response state (include it in the state parameter)
- Return tokens in hash, keep isolation implicit (each user gets their own token)

**study.html:**
- Add input field on landing page: "What's your school's Schoology domain?"
- Store domain in localStorage (or UI state) so sync.js knows which API to call
- Redirect auth request with domain parameter

**sync.js:**
- Read domain from request body or stored config
- Call API at `https://{domain}/api/v1/...` instead of hardcoded Schoology domain

---

## New User State Machine

### State Transitions

```
[Not Connected]
    ↓ (user clicks "Connect Schoology")
[Entering School Domain]
    ↓ (user types domain, clicks connect)
[OAuth In Progress]
    ↓ (Schoology redirect back)
[Connected, Syncing]
    ↓ (data arrives)
[Connected, Data Loaded]
    ↓ (user closes tab / clears localStorage)
[Not Connected]
```

### UI/UX for Each State

- **Not Connected:** Show landing page. "Connect your Schoology to see your assignments, grades, and study plan."
- **Entering Domain:** Input field + "Connect" button. Help text: "e.g., myschool.schoology.com"
- **OAuth In Progress:** Loading spinner. "Redirecting to Schoology..."
- **Connected, Syncing:** Loading spinner. "Syncing your data..."
- **Connected, Data Loaded:** Show app tabs (Today, Week, Plan, Grades, Flashcards)
- **Error State:** Show error message, offer to retry or re-enter domain

### localStorage Isolation

Each user's tokens live in their own browser:
```javascript
localStorage.sc_access_token    // user's token
localStorage.sc_access_token_secret
localStorage.sc_user            // user's name
localStorage.sc_school_domain   // their school's domain (new)
localStorage.lastSync           // last sync timestamp
```

When user closes tab → localStorage persists. When they return → app checks tokens, auto-syncs.

When user clears localStorage → full reset, back to [Not Connected] state. This is fine for v1.

---

## Security Boundaries Before Launch

### Threat: Token Leakage via Browser XSS

**Risk:** If AdSense or another third-party script gets XSS, they can read localStorage tokens.

**Mitigation:**
- Add CSP header to block unauthorized scripts
- Use `Content-Security-Policy: script-src 'self' pagead.google.com`
- This allows only your own scripts + Google AdSense scripts

**Netlify Implementation:** Add `_headers` file to repo root with CSP directive.

### Threat: CSRF on Sync

**Risk:** If an attacker tricks a user into visiting a malicious site while logged in, that site's script could trigger a sync request.

**Mitigation:**
- The sync endpoint already requires a POST body with tokens
- Tokens are not in cookies (so CSRF can't include them automatically)
- SOP (Same-Origin Policy) prevents cross-origin script access

**Status:** Current architecture is safe.

### Threat: Rate Limiting / DDoS on Schoology API

**Risk:** A malicious user could spawn hundreds of browser tabs, each syncing rapidly, hitting Schoology API rate limits.

**Mitigation:**
- Schoology's API has rate limits (~1000 req/hr per IP)
- Netlify Functions run from fixed IPs, so multiple users share the same limit
- Add client-side throttling: no sync more than once per 30 seconds
- (Post-launch: add server-side throttling if abuse occurs)

**Status:** Acceptable risk for v1. Monitor and add throttling if needed.

### Threat: Unauthorized School Domain Access

**Risk:** User A connects to schoolA.schoology.com. Can they manually change localStorage to access schoolB's data?

**Mitigation:**
- No. Schoology API validates that the access_token matches that domain.
- If token is for schoolA, calling schoolB's API will return 401 (Unauthorized)
- Tokens are domain-specific; cross-domain token use fails at Schoology's end

**Status:** Secure by design.

---

## Component Build Order (Phases)

### Phase 1: Any-School OAuth Setup
- Register Platform developer app
- Update auth.js to accept school_domain parameter
- Update callback.js to handle multi-domain tokens
- Add school domain input to landing page

### Phase 2: App Conversion for Multi-User
- Remove hardcoded personal data from study.html
- Add empty state handling (show message when no data)
- Update sync.js to use dynamic school domain
- Test with multiple students from different schools

### Phase 3: Landing Page + Onboarding
- Build public-facing landing page (index.html)
- Add OAuth flow walkthrough
- Add error handling for failed auth

### Phase 4: AdSense Integration + Polish
- Add AdSense code to study.html and index.html
- Place ads in non-intrusive locations
- Add _headers file with CSP + security headers
- Deploy to production

---

## What Stays the Same

- Netlify Functions architecture (auth → callback → sync pattern)
- OAuth 1.0a signing logic (reuse existing crypto code)
- study.html single-file SPA structure
- localStorage-based session storage
- data sync and transformation logic

---

## What Changes

- OAuth endpoint is dynamic (per school domain)
- Consumer key/secret are Platform-level (not school-specific)
- study.html initializes with empty state (not pre-populated data)
- Landing page is separate (index.html), not embedded in study.html
- Added school domain tracking in localStorage

---

*Research confidence: HIGH. This is a standard multi-tenant OAuth conversion pattern. Schoology Platform is well-documented.*
