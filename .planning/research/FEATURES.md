# Features Research

**Project:** Schoology Study Planner — Public SaaS  
**Researched:** 2026-05-01

---

## Student Academic Dashboard Features — Table Stakes vs. Differentiators

### Table Stakes (Users expect these)

These are the baseline features that students using gunn.one, bessy, and similar tools expect. Absence is a deal-breaker.

- **Assignment list with due dates** — See all upcoming work at a glance, sorted by due date. Schoology buries this in multiple views.
- **Grade tracking** — Current score per course + overall GPA equivalent. Students want to know where they stand.
- **Calendar/agenda view** — Visual layout of due dates + events. Schoology's calendar is clunky.
- **Today view / dashboard** — What's due today or soon? What should I focus on right now?
- **Progress visualization** — Completion status, submitted vs. graded, missing work flagging.
- **OAuth login** — One-click connect via Schoology (or Canvas, Google Classroom, etc.). Manual data entry = DOA.

### Differentiators (Competitive Advantage)

Features that set this tool apart from Schoology's native interface and other third-party tools.

**Already in codebase:**
- **Week view with custom events** — Students can add personal study sessions, tests, or deadlines that aren't in Schoology.
- **Flashcard study mode** — Embedded study tool for active recall (not just a calendar view).
- **Assignment planner / time blocking** — Help students break assignments into smaller tasks with estimates.
- **Dark mode UI** — Polished, cohesive design system. Schoology's UI is dated.

**Additional differentiators to consider:**
- **Smart notifications / reminders** — Alert students 24 hours before due, or when grades are posted.
- **Study analytics** — Time spent per subject, assignment completion trends, predicted grade based on current work.
- **Collaboration visibility** — Show which classmates have submitted (if Schoology exposes this).
- **Historical grade tracking** — Track grade trends over the semester, not just current score.
- **Mobile-responsive design** — Schoology's mobile experience is poor; better responsive design wins.

### Anti-Features (What NOT to build in v1)

Deliberately exclude these to stay focused and ship fast.

- **Direct assignment submission to Schoology** — Too complex; requires additional OAuth scopes and Schoology's submission API. Users can submit via Schoology directly.
- **Messaging/collaboration within the tool** — Out of scope; Schoology has this. Don't duplicate.
- **Multi-school account merging** — One user, multiple schools = nice-to-have but adds architecture complexity. Defer to v2.
- **Teacher/admin features** — Not the primary user. Ignore for launch.
- **Detailed analytics dashboards** — Tempting but low ROI for v1. Keep analytics simple.
- **Export/download functionality** — Not why users come. Skip it initially.
- **AI tutor / homework help** — Requires LLM integration + compliance complexity. Out of scope.

---

## Onboarding Flow (Standard for OAuth-based student tools)

1. **Landing page** — Explain what the tool does, screenshots/demo, call-to-action "Connect Your Schoology"
2. **OAuth redirect** — Click button → OAuth flow → user authorizes → app redirects back with token
3. **First sync** — App fetches data from Schoology (assignments, grades) while showing a loading state
4. **Empty state handling** — If no assignments, show helpful message ("Your to-do list will appear here once Schoology syncs")
5. **Tour / hints** — Optional: first-time-user walkthrough of the tabs. Keep it short (< 30 seconds).

### Why This Matters

Poor onboarding kills adoption. Users should go from "I've never heard of this" to "I can see my stuff" in < 2 minutes.

---

## Ad Placement for Student Audiences

### AdSense Policy Constraints

- COPPA compliance required if you knowingly serve users under 13 (many middle school students use Schoology)
- Ad density capped (roughly 3 ads per page without special approval)
- No ads above the fold on mobile (new policy)
- Student-safe content requirement (no gambling, adult content, etc. — auto-enforced by AdSense)

### Effective Placements (Without Killing UX)

1. **Sidebar** (desktop only) — Vertical leaderboard or half-banner in a secondary column. Mobile hides it.
2. **Below the fold** — Bottom of week view or end of grades list. User has already engaged with content.
3. **Between tabs** — Small banner at the bottom of today/week/plan/grades that rotates ads. Contextual.
4. **Native ad unit** — Blend ads with the design system. Looks intentional, not intrusive.

**Avoid:**
- Pop-ups / modals — Destroys UX, likely against AdSense policy anyway
- Ads in the header or critical navigation — Breaks trust
- Auto-play video ads — Banned on most student tools

### Realistic Revenue

Expect **$1–5 CPM** (cost per 1000 impressions) for the student audience. With 1000 active users seeing the site weekly, that's $4–20/week or ~$200–1000/month at scale. Not huge, but the appeal is passive income on a free tool.

---

## What Drives Retention

Based on similar tools (gunn.one, bessy, canvas-adjacent dashboards):

- **Accuracy** — Does it reflect reality? If Schoology data is stale or wrong, users leave.
- **Speed** — Loads and syncs fast. Any lag = frustration.
- **Mobile experience** — Many students check from phone. Native Schoology is clunky; you win here.
- **Features that save time** — Flashcards, custom events, study mode. Not just a prettier calendar.
- **Notifications** — Reminder for due dates students might miss. Highly retention-driving.

**Lowest retention risk:** Launch with accuracy + speed + the core features already in the codebase. Add nice-to-haves after you have users.

---

*Research confidence: HIGH for table stakes / onboarding. MEDIUM for ad placement specifics (will refine post-launch based on actual user feedback).*
