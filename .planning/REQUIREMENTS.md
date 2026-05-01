# Requirements — Schoology Study Planner Public SaaS v1

**Prepared:** 2026-05-01

---

## v1 Requirements

### Authentication & Onboarding

- [ ] **AUTH-01**: User can land on a public landing page explaining what the app is
- [ ] **AUTH-02**: User can input their Schoology school domain on the landing page
- [ ] **AUTH-03**: User can click "Connect Schoology" and be redirected through OAuth
- [ ] **AUTH-04**: User can authorize the app to access their Schoology data via Schoology's login page
- [ ] **AUTH-05**: User is redirected back to the app with their OAuth tokens stored in localStorage
- [ ] **AUTH-06**: User can see their data immediately after OAuth (no additional setup)
- [ ] **AUTH-07**: User can click "Disconnect Schoology" to clear their session and return to [Not Connected] state
- [ ] **AUTH-08**: User sees a friendly error message if their Schoology domain is invalid
- [ ] **AUTH-09**: User sees a friendly error message if OAuth flow fails (network error, denied, etc.)

### Data Views & Sync

- [ ] **DATA-01**: User can view their agenda for today (assignments due today, study items)
- [ ] **DATA-02**: User can view their assignments for the upcoming week in a calendar layout
- [ ] **DATA-03**: User can create and save custom study events that are preserved across syncs
- [ ] **DATA-04**: User can view their assignment planning interface (assignment breakdown + time estimates)
- [ ] **DATA-05**: User can view their current course grades
- [ ] **DATA-06**: User can study with the flashcard tool
- [ ] **DATA-07**: User can manually trigger a sync to refresh data from Schoology
- [ ] **DATA-08**: App auto-syncs data on first load and periodically (every 30 min or on tab focus)
- [ ] **DATA-09**: Sync button is disabled for 30 seconds after last sync (throttling to prevent rate limit abuse)
- [ ] **DATA-10**: User sees a loading indicator while syncing
- [ ] **DATA-11**: User sees an empty state message if they have no assignments ("Your to-do list will appear here")
- [ ] **DATA-12**: User sees an error message if sync fails due to Schoology API outage (with retry option)

### UI & UX

- [ ] **UI-01**: App is styled in dark mode (no light mode)
- [ ] **UI-02**: App is responsive and usable on mobile (phone, tablet)
- [ ] **UI-03**: All existing UI tabs (Today, Week, Plan, Grades, Flashcards) are present and functional
- [ ] **UI-04**: Logout button is visible and accessible (not buried in a menu)

### Security

- [ ] **SEC-01**: `_headers` file exists with CSP header to block unauthorized scripts
- [ ] **SEC-02**: CSP allows own scripts + Google AdSense scripts only
- [ ] **SEC-03**: School domain input is validated server-side (blocks non-Schoology domains)
- [ ] **SEC-04**: Schoology API tokens are never logged or exposed in console errors
- [ ] **SEC-05**: Sync errors do not expose sensitive information to the user

### Monetization

- [ ] **ADS-01**: Google AdSense code is integrated into the landing page and app
- [ ] **ADS-02**: Ad placements do not interfere with core functionality
- [ ] **ADS-03**: AdSense COPPA compliance is configured (for underage audience)
- [ ] **ADS-04**: `ads.txt` file exists and is served at `/ads.txt`

### Code Quality

- [ ] **CODE-01**: OAuth signing code is shared across auth.js, callback.js, sync.js (via `netlify/functions/_oauth.js`)
- [ ] **CODE-02**: Node.js version is pinned to 22 (via NODE_VERSION env var or .nvmrc)
- [ ] **CODE-03**: No hardcoded personal data (Caiden's assignments/grades) in study.html

---

## v2 Requirements (Deferred)

These are valuable but explicitly deferred to v2 to ship faster.

- [ ] **V2-NOTIF**: Push notifications for upcoming deadlines
- [ ] **V2-ANALYTICS**: Study time analytics + grade trends
- [ ] **V2-MULTI-ACCOUNT**: One user, multiple schools
- [ ] **V2-EXPORT**: Download assignments/grades as PDF or CSV
- [ ] **V2-COLLAB**: See which classmates have submitted assignments
- [ ] **V2-MESSAGING**: In-app messaging (currently rely on Schoology)

---

## Out of Scope

These are explicitly **not** building in v1 or v2 for this project.

- **Direct assignment submission to Schoology** — Too complex (extra OAuth scope, submission API). Users submit via Schoology directly. Why: reduces backend complexity, avoids API scope creep.
- **Assignment comments / annotations** — Schoology already supports this; adding it here duplicates effort. Why: out of our control (Schoology's interface is the source of truth).
- **Teacher / admin features** — Not the target user. Why: scope explosion, different use case.
- **Conversation / messaging system** — Schoology has this. Don't reinvent. Why: reduces scope, stays focused on student academic planning.
- **Offline mode** — Session-only design means offline is not supported. Why: keeps architecture simple, acceptable trade-off.
- **Accounts / user profiles** — No server-side storage in v1. Why: avoids database, privacy obligations, and account system complexity.
- **AI tutor / homework help** — LLM integration adds operational cost + compliance risk. Why: defer to experiment later if there's user demand.
- **Canvas / Google Classroom / other LMS support** — Schoology only for v1. Why: focus, avoid API whack-a-mole.
- **Advanced scheduling (recurring events, recurring assignments)** — Nice-to-have. Why: not a blocker for v1 ship.
- **Dark mode toggle / theme picker** — Dark-only for v1. Why: reduces options paralysis, matches student tool aesthetic.

---

## Traceability (Updated by Roadmapper)

| Requirement ID | Phase | Status |
|---|---|---|
| (To be filled by roadmapper) | | |

---

## Success Criteria

v1 is successful when:

1. ✓ Any student can visit the public site, enter their Schoology domain, and connect via OAuth
2. ✓ Data syncs correctly from Schoology (assignments, grades, updates appear within 30 seconds)
3. ✓ All 5 tabs (Today, Week, Plan, Grades, Flashcards) work without errors
4. ✓ Custom events are preserved across syncs
5. ✓ No security issues (XSS, token leakage, domain bypass)
6. ✓ AdSense is running and generating revenue (even if small)
7. ✓ Roadmap shows clear path to v2 features

---

*Requirements prepared: 2026-05-01 after research completion*
