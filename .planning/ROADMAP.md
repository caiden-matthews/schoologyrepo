# Roadmap — Schoology Study Planner Public SaaS

**Project:** Schoology Study Planner — Public SaaS  
**Created:** 2026-05-01  
**Total Phases:** 4  
**Requirements Coverage:** 37/37 (100%)

---

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation: Multi-School OAuth | Enable any Schoology student to connect via Platform-level OAuth | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-08 | Any school's student can OAuth and see their data |
| 2 | Core App: Data Sync + Views | Convert personal app to multi-user; sync Schoology data correctly; all tabs functional | DATA-01 to DATA-12, UI-01 to UI-04, CODE-01 to CODE-03, SEC-03 to SEC-05 | 37 total in original list; filtered here |
| 3 | Launch: Security + Landing Page | Add public-facing landing page, security headers, error handling | AUTH-06, AUTH-07, AUTH-09, SEC-01, SEC-02, ADS-01, ADS-04 | Landing page live, CSP enforced, no XSS surface |
| 4 | Go Live: AdSense + Monitoring | Enable monetization, set up monitoring, soft launch | ADS-02, ADS-03, (monitoring infra) | First revenue, error alerts in place |

---

## Phase 1: Foundation: Multi-School OAuth

**Goal:** Enable any Schoology student to connect via Platform-level OAuth integration.

**Why This Phase First:**
This is the hardest blocker. Without multi-school OAuth, the app only works for one school. OAuth is also the security boundary for all user data, so getting it right first sets the foundation for everything else.

**Requirements Mapped:**
- AUTH-01: Landing page explaining the app
- AUTH-02: School domain input field
- AUTH-03: OAuth redirect flow
- AUTH-04: Schoology login + authorization
- AUTH-05: Token storage in localStorage
- AUTH-08: Friendly error for invalid domain

**Success Criteria:**
1. Student from shschools.org can connect and see their data
2. Student from a different school (e.g., stuy.org) can connect and see their data
3. Each student only sees their own data (no cross-user leakage)
4. Invalid domain input shows error message (doesn't crash)
5. OAuth callback hash is cleaned before analytics/ads initialize

**Deliverables:**
- Landing page (index.html) with Schoology domain input
- Updated auth.js to accept dynamic school domain
- Updated callback.js to handle multi-domain tokens
- Updated sync.js to call the correct school's API endpoint
- Schoology Platform app registration (manual, user's responsibility)

**Dependencies:**
- **Blocking:** User must register Schoology Platform app at developers.schoology.com. This is outside Claude's scope — you must do it manually.

**Estimated Effort:**
- Medium: ~4–6 work days (auth/callback/sync updates are straightforward; testing with multiple schools takes time)

---

## Phase 2: Core App: Data Sync + Views

**Goal:** Convert the personal study planner into a multi-user app where each student sees only their own data, and all features work.

**Why This Phase Second:**
With OAuth working, now we need to ensure the app correctly syncs and displays data for multiple users without showing personal data. This includes removing hardcoded assignments/grades, handling empty states, and making sure all 5 tabs work.

**Requirements Mapped:**
- DATA-01 to DATA-12: All data views, sync, throttling, error handling
- UI-01 to UI-04: Dark mode, responsive design, all tabs, logout button
- CODE-01 to CODE-03: Shared OAuth module, Node.js pinning, no hardcoded data
- SEC-03 to SEC-05: Domain validation, token safety, error messages

**Success Criteria:**
1. study.html contains no personal data (Caiden's assignments are gone)
2. New user sees empty state with helpful message
3. User clicks Sync → data arrives within 5 seconds (normal conditions)
4. User clicks Sync again within 30 seconds → button is disabled, doesn't re-sync
5. All 5 tabs (Today, Week, Plan, Grades, Flashcards) load without errors
6. Custom events are created and survive a sync cycle
7. User clicks Logout → localStorage is cleared, back to [Not Connected] state
8. If Schoology API is down, user sees error message, can retry
9. Invalid school domain at sync time shows friendly error
10. OAuth code is DRY (shared _oauth.js module)

**Deliverables:**
- `netlify/functions/_oauth.js` shared OAuth helper module
- Updated study.html with no hardcoded data
- Updated sync.js with error handling + dynamic API endpoint
- Logout button + handler in study.html
- Empty state UI messages
- Domain validation in auth.js
- Sync throttling (30s minimum between syncs)
- Testing: verified with students from 2+ different schools

**Estimated Effort:**
- Large: ~6–8 work days (data removal + sync updates + testing across schools is detail-heavy)

---

## Phase 3: Launch: Security + Landing Page Polish

**Goal:** Make the app production-safe with security headers and error handling; craft a compelling public landing page.

**Why This Phase Third:**
OAuth and sync are solid, but we can't launch publicly without CSP headers (blocks XSS from AdSense). The landing page is the public face — needs to explain the value proposition clearly.

**Requirements Mapped:**
- AUTH-06: Data visible immediately after OAuth
- AUTH-07: Logout button present
- AUTH-09: Friendly error messages for OAuth failures
- SEC-01, SEC-02: CSP header (_headers file)
- ADS-01: AdSense code integrated
- ADS-04: ads.txt file

**Success Criteria:**
1. `_headers` file exists with CSP header
2. CSP validation passes (no CSP violations in dev console)
3. index.html landing page explains what the app does + shows screenshot/demo
4. Landing page has a clear "Connect Your Schoology" CTA
5. OAuth errors (network failure, domain mismatch, etc.) show friendly text
6. AdSense placeholder ads are visible (may not be approved yet)
7. ads.txt is served at `/ads.txt`
8. No errors in dev console on first load

**Deliverables:**
- `_headers` file with CSP + security headers (HSTS, X-Frame-Options, etc.)
- Landing page (index.html) with value prop + screenshots + CTA
- AdSense code integrated into index.html + study.html
- ads.txt file in repo root
- Error message copy for OAuth failures
- Soft launch: share link with 10 test users from different schools, collect feedback

**Estimated Effort:**
- Medium: ~3–4 work days (security headers are straightforward; landing page design + copy takes iteration)

---

## Phase 4: Go Live: AdSense + Monitoring

**Goal:** Enable monetization and set up alerting so you know if the app breaks post-launch.

**Why This Phase Last:**
Revenue and monitoring are lower priority than making sure the app works, but they're essential for sustainable operation.

**Requirements Mapped:**
- ADS-02, ADS-03: Ad placements don't break UX, COPPA compliance configured
- (Implicit): Error logging + uptime monitoring

**Success Criteria:**
1. AdSense account is approved (if not already)
2. COPPA compliance is enabled in AdSense settings
3. Ads are visible and don't overlap critical UI
4. Netlify Functions error rate is < 1%
5. Uptime monitoring alerts you if site is down
6. You receive an email if sync function errors spike
7. First week revenue is non-zero (even if $0.01)

**Deliverables:**
- AdSense account approved for monetization
- COPPA settings configured
- Ad placement finalized (sidebar, between tabs, bottom of page)
- Uptime monitoring set up (Uptime Robot or similar)
- Error alerting set up (Netlify logs or third-party like Sentry)
- Soft launch → public launch announcement
- Post-launch review of revenue, error rates, user feedback

**Estimated Effort:**
- Small: ~2–3 work days (mostly configuration + waiting for AdSense approval; monitoring is one-time setup)

---

## Critical Path & Dependencies

```
Phase 1 (OAuth)
    ↓ (Foundation: any student can connect)
Phase 2 (Data Sync + Views)
    ↓ (Core: app works for multiple users)
Phase 3 (Security + Landing Page)
    ↓ (Launch: public-safe + compelling entry point)
Phase 4 (AdSense + Monitoring)
    ↓ (Sustain: revenue + observability)
```

**Blocking Dependency (Outside GSD Scope):**
- Schoology Platform app registration. Must complete before Phase 1 planning.

**Soft Dependencies:**
- AdSense account approval (apply early in Phase 3, may take 1–2 weeks)
- Netlify environment variables update (Phase 1)

---

## Workload & Timeline

- **Phase 1:** 4–6 work days
- **Phase 2:** 6–8 work days (longest, most complex)
- **Phase 3:** 3–4 work days
- **Phase 4:** 2–3 work days

**Total:** ~17–21 work days of implementation

**Target Timeline:** Few weeks
- Week 1: Phase 1 (OAuth)
- Week 2: Phase 2 (Data + Views)
- Week 3: Phase 3 (Security + Landing) + Phase 4 (AdSense + Monitoring)
- Week 4: Testing, bug fixes, public launch

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Schoology Platform app registration delayed | Medium | Blocks Phase 1 | Start ASAP, not dependent on Claude |
| AdSense approval takes > 2 weeks | Medium | Delays Phase 4 | Apply early (Phase 3), launch without ads if needed |
| Multi-school testing finds edge cases | Low | Phase 2 overruns | Test with 3+ schools in Phase 2 planning |
| Schoology API rate limits hit | Low | Phase 2 + post-launch | Implement throttling in Phase 2 |
| CSP breaks legitimate third-party analytics | Low | Phase 3 | Test CSP thoroughly before launch |

---

*Roadmap prepared: 2026-05-01 after requirements completion*
