# Soft Launch Plan — Study Planner (May 2026)

**Start Date:** May 5, 2026 (after Phase 3 checkpoint approval)
**Duration:** 2 weeks (soft launch); feedback collection ongoing
**Users:** 10 testers from different Schoology domains

## Objective

Validate landing page clarity, OAuth flow UX, data sync accuracy, and identify critical bugs before public launch announcement.

## Test Users (10 identified)

| # | Name/ID | School Domain | Email | Grade Level | Contact Method |
|---|---------|---------------|-------|-------------|-----------------|
| 1 | User A (Urban HS) | urbandist.schoology.com | [email] | 10–12 | Email |
| 2 | User B (Suburban MS) | suburbanms.schoology.com | [email] | 6–8 | Email |
| 3 | User C (Rural HS) | ruralschool.schoology.com | [email] | 9–12 | Discord |
| 4 | User D (Charter) | charternetwork.schoology.com | [email] | 9–10 | Email |
| 5 | User E (Private) | privateschool.schoology.com | [email] | 9–12 | Email |
| 6 | User F (Large District) | largedist.schoology.com | [email] | 6–8 | Email |
| 7 | User G (International) | intl-school.schoology.com | [email] | 9–11 | Email |
| 8 | User H (Tech-Forward) | techschool.schoology.com | [email] | 10–12 | Slack |
| 9 | User I (Minimal Users) | smallschool.schoology.com | [email] | 9–10 | Email |
| 10 | User J (Heavy Users) | bigcity.schoology.com | [email] | 11–12 | Email |

## Feedback Collection

**Google Form:** https://forms.google.com/...
**Questions:** 8 (see below)
**Response Target:** 100% of testers (10/10) provides feedback
**Deadline:** May 18, 2026 (2 weeks after launch)

### Form Questions

1. **Landing Page Clarity** (Scale: 1-5)
   "How clear is it what this app does from the landing page?"
   - 1 = Completely unclear
   - 5 = Crystal clear

2. **OAuth Flow Experience** (Scale: 1-5)
   "How easy was it to connect your Schoology account?"
   - 1 = Very difficult / I gave up
   - 5 = Very easy

3. **Data Accuracy** (Multiple choice or text)
   "Did your assignments, grades, and other data load correctly after connecting?"
   - Yes, all correct
   - Mostly correct, a few missing
   - Missing significant data
   - Other: [text box]

4. **Feature Usefulness** (Checkboxes for each feature)
   "Which features did you find most useful?" (Check all that apply)
   - [ ] Today's assignments view
   - [ ] Week calendar view
   - [ ] Grades tracker
   - [ ] Study timer
   - [ ] Flashcards
   - [ ] Other: [text box]

5. **Issues or Errors** (Text box)
   "Did you encounter any errors or issues? Please describe:"
   - [Large text box]

6. **Device/Browser** (Text box, optional)
   "What device/browser did you use?" (for debugging CSP or mobile issues)
   - Example: "Chrome on iPhone 13", "Firefox on desktop"

7. **Overall Rating** (Scale: 1-10)
   "How likely are you to use this app regularly?"
   - 1 = Not at all
   - 10 = Very likely

8. **Final Thoughts** (Text box, optional)
   "Any other feedback or suggestions?"
   - [Large text box]

## Launch Instructions for Testers

**Subject:** "Try the Study Planner Beta — Share Your Feedback"

**Message:**
> Hi [Tester Name],
>
> You're invited to try Study Planner, a free app that syncs your Schoology assignments and grades into one organized view.
>
> **Link:** https://studyplanner.netlify.app
>
> **What to do:**
> 1. Visit the link above
> 2. Click "Connect Your Schoology Account"
> 3. Enter your school domain (e.g., "myschool" from myschool.schoology.com)
> 4. Log in with your Schoology credentials
> 5. Explore the app (Today, Week, Grades tabs)
> 6. Share feedback via this form: [FORM LINK]
>
> **How long does it take?** ~5 minutes to try the app, ~2 minutes to fill the form
>
> **Questions?** Reply to this email or DM me on [Discord/Slack/etc.]
>
> Thanks for being an early tester!

## Monitoring & Feedback Analysis (Phase 3 End)

After 2 weeks:
1. Collect all responses from Google Form (auto-email)
2. Analyze feedback by category:
   - **Landing Page:** Did users understand the value prop?
   - **OAuth:** Any issues connecting?
   - **Data Sync:** Were all assignments/grades loaded?
   - **Features:** Which tabs were most useful?
   - **Issues:** Any errors reported?
3. Prioritize bug fixes for Phase 4
4. Document 3–5 key takeaways for post-soft-launch plan

## Success Criteria

- [ ] 10 test users recruited and contacted
- [ ] All 10 users visit the link (Google Analytics: 10 new visitors from targeted domains)
- [ ] 8/10 users (80%) complete the feedback form
- [ ] 0 "couldn't connect" reports (OAuth flow works for all)
- [ ] 0 "missing data" reports (sync is accurate)
- [ ] No critical errors reported (can launch publicly with minor fixes)

## Notes

- **Timeline:** Soft launch starts immediately after checkpoint approval (expected ~May 5, 2026)
- **Public Launch:** After soft launch feedback is collected + critical bugs fixed (expected early-mid May)
- **Next Phase:** Phase 4 (AdSense + Monitoring) can run in parallel with soft launch feedback collection
