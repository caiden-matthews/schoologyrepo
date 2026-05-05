# COPPA Configuration Checklist — Phase 4 Revenue Launch BLOCKING

**Status:** BLOCKING for Phase 4 launch
**Created:** 2026-05-04
**Deadline:** Must be configured before first impressions served to users (Phase 4)
**Penalty for Non-Compliance:** $53,088+ per violation (FTC enforcement)

## Why This Matters

Children's Online Privacy Protection Act (COPPA) regulates how websites collect data from users under 13. AdSense requires compliance before serving any ads to child-directed content. The site qualifies as child-directed because:
- Target audience: K–12 students using Schoology (school-issued accounts)
- Content: Assignment tracking, study tools, grade management (educational, inherently appealing to minors)
- Intent: Designed for student use in school context

## COPPA Requirement 1: Mark Site as "Child-Directed" in AdSense Settings

**Phase 4 Task:** Configure AdSense account settings
- Navigate to AdSense Settings → Privacy
- Check box: "This site contains content for children/minors"
- Explanation: Schoology is used by K–12 students in school context; app targets this demographic

**Why:** AdSense will not serve ads on child-directed sites without explicit opt-in. This prevents FTC enforcement actions.

**Verify After Configuration:**
```
AdSense Dashboard → Settings → Privacy
[✓] "This site is for children" or "This site contains content for children"
```

## COPPA Requirement 2: Disable Interest-Based Ads in AdSense Settings

**Phase 4 Task:** Configure ad personalization
- Navigate to AdSense Settings → Ad Preferences
- Disable: "Enable interest-based ads" or set to "Disable"
- Explanation: COPPA prohibits serving interest-based ads to minors; only contextual ads allowed

**Why:** Interest-based ads (ads tailored to user browsing history) are prohibited by COPPA for minors. AdSense can serve contextual ads instead (ads based on page content, not user profile).

**Verify After Configuration:**
```
AdSense Dashboard → Settings → Ad Preferences
[✓] Interest-Based Ads: Disabled
[✓] Personalization: Disabled or "Contextual Only"
```

## COPPA Requirement 3: Include Privacy Policy Mentioning Data Collection

**Phase 3 Blocker (Setup, Phase 4 Implementation):**
- Already committed: Privacy Policy link in footer of index.html
- Phase 4 Task: Write/update Privacy Policy to include:
  - "This app collects Schoology data (assignments, grades) via OAuth"
  - "We do NOT share your data with third parties"
  - "Ads are contextual only; we do NOT use your browsing history for personalization"
  - "You can contact [your email] with privacy questions"
  - Age disclosure: "This app is designed for K–12 students; parental consent not required (used in school context)"

## COPPA Requirement 4: Ensure Data Security Measures

**Phase 3 Status:** Already implemented
- CSP headers prevent XSS (security header)
- HTTPS/HSTS enforces encrypted transmission
- OAuth tokens not stored in cookies (localStorage only; Phase 4+ can upgrade to httpOnly)

## Testing Checklist Before Phase 4 Launch

- [ ] AdSense account approved for monetization (may take 1–2 weeks)
- [ ] Child-directed tag configured in AdSense settings
- [ ] Interest-based ads disabled in AdSense settings
- [ ] Privacy Policy updated with COPPA disclosures
- [ ] First test ad served without errors (may take 24–48 hours after configuration)
- [ ] Browser console: no CSP violations related to ad serving
- [ ] Network tab: ads.txt file served at /ads.txt
- [ ] Analytics: confirm no PII leaking in error logs

## FTC Enforcement & Penalties

**Violation:** Serving interest-based ads to minors without COPPA compliance
- **Civil Penalty:** $53,088+ per violation (FTC 2024 rates)
- **Calculation:** Each day of violation = separate violation; can accumulate quickly
- **Example:** If configured wrong for 30 days during launch, potential exposure = $1.6M+

**Why Phase 4 Blocking:** This is not optional. COPPA compliance must be verified before any revenue is earned.

## Resources

- [FTC COPPA Compliance Guide](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)
- [Google AdSense COPPA Compliance](https://support.google.com/adsense/answer/16283098)
- [COPPA Requirements Checklist](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)

## Timeline

- **Phase 3 (now):** Document requirements; set up privacy policy framework
- **Phase 4 Start:** Apply for AdSense account (if not already approved)
- **Phase 4 Mid:** Complete checklist (all 4 items); test configuration
- **Phase 4 End:** Verify compliance before public launch announcement

## Notes for Phase 4 Executor

**CRITICAL:** Do NOT serve any ads until all 4 checklist items are complete. Partially-configured AdSense (e.g., child-directed checked but interest-based not disabled) still violates COPPA.

**Questions or concerns?** Contact FTC directly or consult a lawyer specializing in online privacy. Better to delay launch than risk $50k+ penalty.
