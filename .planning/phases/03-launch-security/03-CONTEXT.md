# Phase 3: Launch - Security + Landing Page Polish - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app production-safe with security headers and craft a compelling public landing page. Phase 1 & 2 established the core app; Phase 3 adds the public-facing security and polish needed before launch.

**In scope:**
- Security headers (_headers file): CSP, HSTS, X-Frame-Options, etc.
- CSP validation to prevent XSS
- Landing page redesign (index.html) with value prop, screenshots, clear CTA
- AdSense code integrated (placeholder ads, COPPA compliance noted)
- ads.txt file for AdSense verification
- OAuth error messaging (user-friendly copy)
- No dev console errors on first load
- Soft launch with 10 test users

**Out of scope:**
- AdSense account approval (may take 1-2 weeks)
- Revenue/monetization strategy (Phase 4)
- Full monitoring/alerting setup (Phase 4)
- Advanced CSP tuning for third-party integrations

</domain>

<decisions>
## Implementation Decisions

### Security Headers
- **D-01:** Use Netlify _headers file (simple, declarative, no code changes)
- **D-02:** CSP policy: script-src 'self' (no external JS except Schoology OAuth + AdSense); style-src 'unsafe-inline' (inline CSS in study.html); img-src * (allow Schoology avatars)
- **D-03:** HSTS: max-age=31536000 (one year), includeSubDomains
- **D-04:** X-Frame-Options: DENY (prevent clickjacking)
- **D-05:** X-Content-Type-Options: nosniff (prevent MIME-type sniffing)
- **D-06:** Referrer-Policy: strict-origin-when-cross-origin (protect user privacy)
- **D-07:** Feature-Policy: microphone 'none', camera 'none' (disable unused APIs)

### Landing Page
- **D-08:** Single-page landing (no separate landing.html; integrate with index.html)
- **D-09:** Above-the-fold: headline, 2-3 sentence value prop, "Connect Schoology" CTA
- **D-10:** Below-the-fold: feature list, screenshot/demo, FAQ, sign-up/contact CTA
- **D-11:** Design: match study.html dark theme (--bg: #191919, --accent: #818CF8), responsive mobile-first
- **D-12:** Copy tone: friendly, student-focused, non-corporate
- **D-13:** No monetization messaging (Phase 4 concern)

### AdSense Integration
- **D-14:** Placeholder ads: show ad units but no real ads until account approved
- **D-15:** Ad placements: sidebar on study.html (non-intrusive), bottom of landing page
- **D-16:** COPPA compliance: configure in AdSense settings (not in code, but document the step)
- **D-17:** ads.txt file: add to repo root, list AdSense publisher ID (placeholder until approved)

### Error Messaging
- **D-18:** OAuth errors user-friendly: "School not found" not "401 Unauthorized"
- **D-19:** All errors log server-side for debugging, but client sees clean messages
- **D-20:** No token/API details in error messages shown to user

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria
- `.planning/REQUIREMENTS.md` — Full requirements; Phase 3 covers AUTH-06, AUTH-07, AUTH-09, SEC-01, SEC-02, ADS-01, ADS-04

### Phase 2 Completion (prerequisite)
- Phase 2 (Core App) must be complete before Phase 3 starts
- study.html must have all tabs functional, no hardcoded data
- OAuth error handling must be in place (Phase 3 just adds user-facing copy)

### Schoology API & OAuth
- Schoology OAuth 1.0a documentation (already integrated in Phase 1)
- OAuth error responses: 401 (unauthorized), 403 (forbidden), 404 (domain not found)

### AdSense & Compliance
- Google AdSense terms of service
- COPPA (Children's Online Privacy Protection Act) requirements for education audience
- AdSense code: async loading, no blocking

### Security Standards
- OWASP Top 10 (CSP prevents XSS, X-Frame-Options prevents clickjacking)
- Mozilla Web Security Guidelines
- Content Security Policy (CSP) Level 3 spec

</canonical_refs>

<code_context>
## Existing Code Insights

### Phase 2 Artifacts (prerequisite)
- **study.html** (113K) — Main app, ready for AdSense integration
- **index.html** — Current landing page, needs redesign
- **netlify/functions/** — All OAuth + sync working

### Security Integration Points
1. **_headers file** — Netlify-specific; declarative headers (no code change needed)
2. **index.html** — Add AdSense script tag (async, deferred)
3. **study.html** — Add AdSense ad units (sidebar, between tabs)
4. **ads.txt** — Static file, Netlify serves directly

### Design System Reuse
- Colors, typography, spacing already defined in study.html
- Reuse for landing page consistency
- Responsive breakpoints: 480px, 768px, 1024px

</code_context>

<specifics>
## Specific Ideas

- **Landing page hero:** Animated gradient background (or simple solid color), headline that speaks to student pain point ("Finally, a study planner that keeps up with you")
- **Screenshot carousel:** 3-4 screenshots of the app tabs (Today, Week, Grades) showing real-looking Schoology data
- **Social proof:** "Used by students at [school names]" (add as more schools test)
- **FAQ section:** "Is my data safe?", "Do you share my data?", "Why Schoology?"
- **Newsletter signup:** (optional) Collect emails for soft launch announcements
- **CSP nonce approach:** If needed for inline scripts, use nonce attribute (not 'unsafe-inline')

</specifics>

<deferred>
## Deferred Ideas

- **Full CSP tuning (Phase 3+)** — May need exceptions for third-party analytics/monitoring (Phase 4)
- **AMP landing page (Phase 4+)** — Accelerated Mobile Pages for SEO (nice-to-have)
- **Multi-language support (Phase 5+)** — Currently English-only
- **Accessibility audit (Phase 4+)** — WCAG 2.1 AA compliance (not required for v1)

---

*Phase: 03-launch-security*
*Context gathered: 2026-05-04*
