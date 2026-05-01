# Research Summary

**Project:** Schoology Study Planner — Public SaaS  
**Research Date:** 2026-05-01

---

## Key Findings

### Stack

**Keep as-is:**
- Vanilla JS SPA, Netlify static hosting, Netlify Functions, localStorage tokens
- OAuth 1.0a via Node.js `crypto` + `fetch` (no npm)
- All existing architecture is solid for multi-user conversion

**Add before launch:**
- Shared OAuth helper module (`netlify/functions/_oauth.js`) to eliminate duplication
- `_headers` file with CSP for security
- `ads.txt` file for AdSense
- Landing page (`index.html`) separate from app (`study.html`)
- NODE_VERSION env var pinned to Node 22

**Blocking dependency:**
- **Must register Schoology Platform app at developers.schoology.com before launch** (do this manually, outside Claude's control)

---

### Features

**Table stakes (expected by users):**
- Assignment list + due dates ✓ (existing)
- Grade tracking ✓ (existing)
- Calendar/agenda view ✓ (existing, as "Today" and "Week")
- Today/dashboard view ✓ (existing)
- Flashcard study mode ✓ (existing)
- Dark UI ✓ (existing)
- OAuth login ✓ (existing, needs multi-school update)

**Differentiators (competitive advantage):**
- Custom events that survive sync ✓ (existing)
- Assignment planner / time blocking ✓ (existing as "Plan" tab)
- Dark mode cohesive design ✓ (existing)
- Future: smart notifications, study analytics, grade trends

**Anti-features (explicitly out of v1 scope):**
- Direct assignment submission to Schoology
- Messaging/collaboration
- Multi-school account merging
- Teacher/admin features
- Analytics dashboards
- Export functionality
- AI tutor

**Onboarding pattern:**
Landing page → OAuth flow → first sync → data loaded. Target: < 2 minutes from zero to seeing their data.

**Monetization:**
Google AdSense with COPPA compliance (serves student audience). Realistic CPM: $1–5. Expected revenue: $200–1000/month at scale.

---

### Architecture

**OAuth flow transformation:**

Current: Single school (shschools.org) → New: Any Schoology instance

Changes:
1. Accept school domain parameter in auth flow
2. Route OAuth to that school's Schoology instance
3. Validate domains server-side
4. User tokens are domain-specific (automatic isolation)

**New user state machine:**
- [Not Connected] → [Entering School Domain] → [OAuth In Progress] → [Connected, Syncing] → [Connected, Data Loaded]
- Each state has UI guidance

**Security boundaries before launch:**
- CSP header blocks unauthorized scripts (mitigates XSS token theft)
- Schoology API validates tokens per domain (no cross-domain access)
- Tokens are domain-specific (isolation by design)
- Rate limiting: throttle syncs to once per 30s per client

**Build order (phases):**
1. Platform app registration + any-school OAuth setup
2. App conversion (remove personal data, add empty state, multi-user sync)
3. Landing page + onboarding
4. AdSense + security headers + monitoring

---

### Pitfalls

**Critical (can break post-launch):**
1. **Schoology API rate limits** → Add client-side throttling (30s min between syncs)
2. **Hardcoded personal data exposure** → Remove DATA block from study.html
3. **Platform app registration too late** → Must register before June 25, 2025 (blocking dependency)
4. **XSS via AdSense** → Add CSP header before adding ads
5. **Token leakage on shared devices** → Add logout button, document single-user warning

**Important (affects UX/revenue):**
6. **Domain validation missing** → Validate school domain is a Schoology instance
7. **Multi-tab sync race** → Document single-tab usage or implement multi-tab sync
8. **COPPA compliance** → Enable COPPA mode in AdSense for underage audience
9. **No Schoology error handling** → Wrap API calls, show user-facing errors
10. **No monitoring** → Set up error logging + uptime monitoring before launch

---

## Downstream Consumer (Requirements Phase)

From this research:

- **Tech stack remains vanilla JS + Netlify** (no framework, no npm, no build step)
- **OAuth becomes multi-school** (requires Platform app registration — user's responsibility)
- **Session-only storage is safe** with CSP header in place
- **Landing page is new requirement** (separate from study.html)
- **Logout button is required** for shared-device safety
- **Empty state handling is required** (no pre-populated data)
- **Security headers (_headers file) is required** before AdSense launch
- **Monitoring / alerting is recommended** post-launch

---

## Confidence Levels

| Topic | Confidence | Notes |
|-------|------------|-------|
| Stack | HIGH | Vanilla JS + Netlify is proven for this use case |
| Features | HIGH | Well-understood student tool patterns |
| Architecture | HIGH | Multi-tenant OAuth conversion is standard |
| Pitfalls | HIGH | Covers common SaaS gotchas |
| Schoology specifics | MEDIUM | Platform app is well-documented; edge cases discovered post-launch |
| AdSense revenue | MEDIUM | CPM estimates based on student audience; actual revenue TBD |
| Monitoring | MEDIUM | Best practices identified; implementation TBD |

---

*Research phase complete. Ready for requirements definition.*
