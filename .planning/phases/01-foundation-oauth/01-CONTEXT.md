# Phase 1: Foundation: Multi-School OAuth - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable any Schoology student to connect via Platform-level OAuth integration. This phase creates the foundation for multi-school support by making the existing single-school OAuth flow generic and accessible to students from any Schoology-powered school.

**In scope:**
- Dynamic school domain input on landing page
- Multi-school OAuth 1.0a flow (auth.js, callback.js, sync.js updates)
- Token storage and persistence (localStorage)
- Error handling for invalid domains
- First-time user onboarding flow
- Session management and token refresh

**Out of scope:**
- Server-side account system (v1 is session-only)
- Multi-school switching (after auth, single school per session)
- Advanced analytics or tracking
- Email notifications or messaging

</domain>

<decisions>
## Implementation Decisions

### Landing Page & User Onboarding
- **D-01:** Quick connect first — minimize explanation before OAuth. Show minimal headline + domain input + CTA button. Save feature details for post-auth in-app copy.
- **D-02:** School domain format: users enter school name only (e.g., `myschool`), not full domain. App auto-appends `.schoology.com` during OAuth.
- **D-03:** Invalid domain handling: attempt OAuth, catch domain-not-found error at OAuth time, show friendly error message. Don't block submission with client-side validation.
- **D-04:** Post-auth visibility: hide the domain input and landing page once authenticated. Show app tabs (Today, Week, Plan, Grades, Flashcards) only.

### OAuth Flow & Interaction Pattern
- **D-05:** Full page redirect OAuth — when user clicks "Connect," full page redirects to Schoology login, then back to app with token.
- **D-06:** Auto-load data on OAuth success — after redirect back to app, automatically fetch user's Schoology data and display Today view (no manual "Sync" button required).
- **D-07:** Hide domain input after authentication — once tokens are stored, domain input is not visible. User sees the app interface only.

### Token & Session Lifecycle
- **D-08:** Persistent sessions — tokens stored in localStorage survive browser close. User stays authenticated for 30+ days (until token naturally expires or user manually logs out).
- **D-09:** Auto-refresh tokens silently — if a token expires during use, attempt to refresh in background. Only show error/prompt if refresh fails (network error, Schoology API down, etc.).
- **D-10:** Validate tokens on page load — if user refreshes the page, check token validity before showing app. If tokens are invalid/expired, show login screen.

### Claude's Discretion
- Token expiry timeout (how long before manual re-auth required?) — downstream agent to research Schoology OAuth token lifetime and implement accordingly.
- Exact error message copy for domain-not-found, network errors, etc. — planner to define with UX in mind.
- Landing page CSS/visual design — match existing dark design system from `study.html` / `city.html`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints (no database, session-only storage, vanilla JS + Netlify only), and key decisions (Schoology Platform registration required)
- `.planning/REQUIREMENTS.md` — Full list of 37 requirements; Phase 1 covers AUTH-01 through AUTH-05, AUTH-08
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria (multi-school OAuth working, data isolation, error handling)

### Existing Implementation
- `netlify/functions/auth.js` — OAuth request token function (needs update for dynamic domain)
- `netlify/functions/callback.js` — OAuth token exchange function (needs multi-domain support)
- `netlify/functions/sync.js` — Data sync from Schoology API (needs dynamic domain-aware endpoint)
- `study.html` — Main app SPA (contains existing Today, Week, Plan, Grades, Flashcards; will be integrated post-OAuth)
- `index.html` — Current landing page (needs redesign for quick connect flow)

### Schoology API & OAuth Documentation
- Schoology OAuth 1.0a documentation — consumer key/secret obtained from Platform developer app
- Schoology API endpoints: `/assignments`, `/grades`, `/updates` — referenced in `sync.js`

### Security & Implementation Notes
- Consumer key/secret MUST NOT appear in client code — stored in Netlify env vars only
- OAuth callback hash must be cleaned before analytics/ads initialize (requirement AUTH-05)
- Token storage in localStorage — session-only for v1; understand browser storage lifecycle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **study.html** (3056 lines) — Contains working Today, Week, Plan, Grades, Flashcards views. This phase connects the OAuth flow to the existing app views.
- **Netlify Functions auth.js, callback.js, sync.js** — OAuth flow is partially implemented for single school. These functions need domain-parameterization updates.
- **Dark design system** — Colors, spacing, typography already defined in existing HTML. Reuse for landing page.

### Established Patterns
- **localStorage API** — Used for token storage in existing code. Phase 1 extends this for persistent sessions and token refresh.
- **Netlify environment variables** — Consumer key/secret stored as `SCHOOLOGY_CONSUMER_KEY` / `SCHOOLOGY_CONSUMER_SECRET`. Maintain this pattern.
- **Schoology API integration** — Existing code calls `/api/v1/assignments`, `/api/v1/grades`, etc. Phase 1 makes these domain-aware.

### Integration Points
- **index.html → auth.js** — Domain input triggers OAuth request
- **auth.js → callback.js** — OAuth state parameter carries school domain through flow
- **callback.js → study.html** — Token exchange stores tokens; page redirects to app
- **study.html → sync.js** — Auto-load on post-auth; subsequent syncs use stored token and domain

</code_context>

<specifics>
## Specific Ideas

- Quick connection emphasis: Students discover app, enter school name, authenticate in < 2 minutes. Post-auth experience shows value immediately (their real data, real schedule).
- Error resilience: If a student's school domain is mistyped or doesn't have Schoology, friendly message ("School not found. Check spelling and try again.") without losing the domain input.
- Multi-school validation plan: Test with 2+ real schools during Phase 1 to catch domain-parameter edge cases early.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-school switching (Phase 2+)** — Allowing a user to switch schools mid-session or manage multiple school accounts. Requires account system or multi-token strategy; out of scope for Phase 1.
- **School search/autocomplete (Phase 2+)** — Showing a list of known Schoology schools or autocompleting domain input. Requires maintaining a school registry; defer to Phase 2 if needed.
- **SSO + SAML (Phase 3+)** — Direct school administrative OAuth or SAML integration. Currently using Schoology OAuth only; further integration patterns deferred.

---

*Phase: 01-foundation-oauth*
*Context gathered: 2026-05-04*
