# Phase 2: Core App - Data Sync + Views - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the personal study planner into a multi-user app where each student sees only their own data, and all features work correctly. Phase 1 established OAuth for any school; Phase 2 ensures the app works for multiple users simultaneously without data leakage.

**In scope:**
- Remove all hardcoded personal data (Caiden's assignments/grades)
- Data sync with error handling and throttling (30s minimum)
- All 5 tabs functional (Today, Week, Plan, Grades, Flashcards)
- Empty state UI when user has no assignments
- Logout functionality fully working
- DRY OAuth code via shared _oauth.js module
- Domain validation and user-friendly error messages
- Custom events (created by user) survive sync cycles

**Out of scope:**
- User accounts / server-side database (Phase 2+ only)
- Multi-school switching in same session (Phase 2+ only)
- Push notifications or analytics (Phase 3+)
- Advanced grade analytics (Phase 3+)

</domain>

<decisions>
## Implementation Decisions

### Data Flow & State Management
- **D-01:** Single source of truth: DATA object in study.html stores all user data (assignments, grades, etc.)
- **D-02:** Sync function fetches from /api/sync, updates DATA, triggers UI re-render
- **D-03:** Empty state: if DATA.assignments.length === 0, show "No assignments due soon"
- **D-04:** Custom events stored in localStorage separately (not synced with Schoology; survive local syncs)

### Sync Behavior
- **D-05:** Initial sync: auto-trigger after OAuth (Phase 1, already done)
- **D-06:** Manual sync: "Sync" button in UI, disabled for 30 seconds after last sync
- **D-07:** Sync throttling: localStorage tracks lastSyncTime; if < 30s ago, show "Try again in X seconds"
- **D-08:** Sync error recovery: show error message + "Retry" button; user can retry immediately (no throttle on errors)
- **D-09:** On sync error: preserve existing DATA (don't wipe it out if sync fails)

### UI/Tabs
- **D-10:** All 5 tabs (Today, Week, Plan, Grades, Flashcards) read from DATA object
- **D-11:** Tab switching instant (no re-sync, just UI re-render)
- **D-12:** Logout: clear localStorage, reset DATA to empty object, show landing page

### Code Organization
- **D-13:** Extract OAuth 1.0a signing logic into `netlify/functions/_oauth.js` shared module
- **D-14:** auth.js, callback.js, sync.js import and use _oauth.js helpers (don't repeat OAuth logic)
- **D-15:** sync.js: return consistent format `{ ok, data, error, lastSync }`

### Testing & Validation
- **D-16:** Remove all hardcoded test data from study.html (grep for const assignments, const grades, etc.)
- **D-17:** Test with 2+ real Schoology accounts from different schools simultaneously
- **D-18:** Verify data isolation: Student A should not see Student B's assignments, even if both browsers open same URL

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, decisions
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (multi-user data isolation)
- `.planning/REQUIREMENTS.md` — Full list of 37 requirements; Phase 2 covers DATA-01 to DATA-12, UI-01 to UI-04, CODE-01 to CODE-03, SEC-03 to SEC-05

### Phase 1 Implementation (already done)
- `index.html` — Landing page with school input (no changes needed for Phase 2)
- `netlify/functions/auth.js` — OAuth request with dynamic domain (no major changes)
- `netlify/functions/callback.js` — OAuth callback with token exchange (no major changes)
- `netlify/functions/sync.js` — Data sync from Schoology API (needs error handling + response format update)
- `study.html` — Main app (needs: data removal, all tabs functional, empty state, logout, sync button with throttling)

### Schoology API
- `/api/v1/assignments` — Returns user's assignments (filtered by Schoology based on token scope)
- `/api/v1/grades` — Returns user's grades (per-course breakdown)
- `/api/v1/users/me` — Returns user profile info
- All calls signed with OAuth 1.0a (consumer secret + user token)

### Security & Implementation Notes
- No hardcoded student data in study.html or sync.js
- Each user's data is isolated by Schoology API token (we don't filter; Schoology does)
- localStorage stores only current session's data + custom events
- Logout clears everything

</canonical_refs>

<code_context>
## Existing Code Insights

### Phase 1 Artifacts (built, ready to build on)
- **study.html** (113K) — Main app SPA with all tab UI already present. Currently missing: hardcoded data removal, empty state handling, logout button, sync throttling
- **sync.js** — Calls Schoology API endpoints; currently returns raw data (needs error handling + consistent response format)
- **auth.js, callback.js** — OAuth flow working for Phase 1; no changes needed for Phase 2

### Data Structure (study.html)
Current DATA object structure (inferred from code):
```javascript
DATA = {
  assignments: [ { name, due, section, ... } ],
  grades: { course: { letter, percentage } },
  updates: [ { ... } ],
  user: { name, email, ... },
  lastSyncTime: timestamp
}
```

Tabs consume this DATA:
- **Today**: filters assignments due today/tomorrow from DATA.assignments
- **Week**: 7-day view of DATA.assignments
- **Plan**: assignment details from DATA.assignments
- **Grades**: renders DATA.grades
- **Flashcards**: custom study items (stored locally, not in Schoology)

### Integration Points to Update
1. **Hardcoded data removal** — Search study.html for test assignments (Caiden's math homework, etc.) and remove
2. **Empty state UI** — Add conditional render: if DATA.assignments.length === 0, show "No assignments"
3. **Logout button** — Add button, attach handler that clears localStorage + resets DATA
4. **Sync button** — Add button to manually trigger sync, disable for 30s after sync
5. **sync.js error handling** — Catch 4xx/5xx from Schoology API, return user-friendly error message
6. **_oauth.js module** — Extract OAuth 1.0a code from auth.js/callback.js/sync.js into shared module

</code_context>

<specifics>
## Specific Ideas

- **Throttling UI feedback**: Show countdown timer on Sync button ("Try again in 15 seconds")
- **Empty state encouragement**: "Your to-do list will appear here once you sync with Schoology"
- **Error messaging**: "Schoology is temporarily unavailable. We'll try again." vs "School not found. Check spelling."
- **Custom events**: Allow users to add personal study sessions (not in Schoology); store in localStorage with a flag to preserve across syncs
- **Performance**: Consider debouncing UI updates if many assignments are returned (unlikely, but safe)

</specifics>

<deferred>
## Deferred Ideas

- **Multi-account switching (Phase 3+)** — UI to switch between schools in same session (requires account system)
- **School autocomplete (Phase 3+)** — Dropdown of known Schoology schools (requires school registry)
- **Grade analytics (Phase 4+)** — Trend charts, predicted GPA, study recommendations
- **Push notifications (Phase 4+)** — Alert user X hours before assignment due
- **Offline mode (Phase 4+)** — Serve cached data if network unavailable

---

*Phase: 02-core-app*
*Context gathered: 2026-05-04*
