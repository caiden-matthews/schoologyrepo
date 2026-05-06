# Phase 3: Launch - Security + Landing Page - Research

**Researched:** 2026-05-04  
**Domain:** Web security (CSP/HSTS), AdSense integration, landing page design, OAuth error handling  
**Confidence:** HIGH

## Summary

Phase 3 prepares the Study Planner for public soft launch by implementing production-grade security headers, integrating Google AdSense, and designing a compelling landing page. This phase addresses three critical concerns: (1) preventing XSS and other web attacks via CSP headers delivered through Netlify's `_headers` file, (2) monetizing the app with AdSense while maintaining strict security policies, and (3) explaining the app's value to prospective student users.

**Key findings:**
- Netlify's `_headers` file is the standard, declarative way to set CSP and other security headers — no code changes needed.
- **Google AdSense requires strict CSP with nonces** (not domain whitelisting) because their ad domains change over time. This means either adopting a nonce-based approach or using `Content-Security-Policy-Report-Only` during development.
- **COPPA 2026 compliance deadline (April 22, 2026, now passed)** has introduced stricter requirements for child-directed content, including mandatory age-screening and consent collection. Education audiences may be subject to these rules.
- Landing page design trends in 2026 favor showing the product in action (interactive demos, screenshots) above the fold, with clear value propositions that speak directly to student pain points.
- CSP violations can be tested safely using `Content-Security-Policy-Report-Only` header while monitoring browser console for violations.

**Primary recommendation:** Deploy `_headers` with `Content-Security-Policy-Report-Only` first, monitor console violations for 3–5 days, then switch to enforced CSP. Integrate AdSense using a nonce-based approach (deferred to Phase 4 if tokens can't be generated in static hosting context) or use `'unsafe-inline'` temporarily with a note to migrate to nonces later.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Security headers (CSP, HSTS, X-Frame-Options) | CDN / Static (Netlify) | — | Netlify's `_headers` file is declarative; applies to all responses at the edge |
| AdSense script loading | Browser / Client | Frontend Server (Netlify) | AdSense JS runs in browser; Netlify configures CSP to permit it |
| Landing page design & copy | Frontend Server (Netlify) | Browser | index.html served by Netlify; rendering + interactivity in browser |
| OAuth error messaging | API / Backend (Netlify Functions) | Browser | auth.js/callback.js set error state in hash; study.html displays friendly copy |
| Ads.txt verification | Static / CDN (Netlify) | — | Netlify serves `/ads.txt` at root; no logic needed |

---

## Standard Stack

### Core Security Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Netlify _headers | N/A (declarative config) | CSP, HSTS, X-Frame-Options delivery | Industry standard for edge-delivered headers; no dependencies |
| Content-Security-Policy (CSP) Level 3 | Latest spec | XSS prevention via script source restrictions | OWASP recommended; prevents unauthorized script execution |
| Google AdSense | Latest (2026) | Ad serving + monetization | Industry standard for SaaS; supports nonce-based CSP |

### AdSense Integration
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Google AdSense Script Tag | `//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXX` | Ad loading | On both index.html (landing page) and study.html (app) |
| ads.txt | IAB standard format | Publisher verification | Place at `/ads.txt` in repo root; Netlify serves publicly |

### Testing & Validation
| Tool | Purpose | Link |
|------|---------|------|
| Chrome DevTools Console | CSP violation logging | Built-in to Chrome/Edge |
| CSP Evaluator | CSP policy strength assessment | [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com/) [VERIFIED: official Google tool] |
| Content-Security-Policy.com | CSP syntax reference | [content-security-policy.com](https://content-security-policy.com/) |

---

## Security Headers (_headers file)

### Netlify _headers Syntax

The `_headers` file is a declarative, plain-text configuration placed at the root of your publish directory. Each HTTP header is declared with a path matcher and key-value pairs. [CITED: docs.netlify.com/manage/security/content-security-policy]

```
/* 
  Content-Security-Policy: script-src 'self'; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src 'self' https://api.schoology.com https://pagead2.googlesyndication.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: microphone=(), camera=(), geolocation=()
```

**Path matcher explanation:** The `/*` prefix means "apply these headers to all routes." You can also specify path-specific headers (e.g., `/api/*` for function responses) if needed. [CITED: docs.netlify.com]

### CSP Directive Breakdown (for Phase 3)

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'none'` | Deny everything by default; explicitly allow only what's needed |
| `script-src` | `'self'` | Allow only scripts from the same origin (your Netlify domain) |
| `style-src` | `'self' 'unsafe-inline'` | Allow inline CSS (study.html uses inline `<style>` tag); no external stylesheets |
| `img-src` | `* data:` | Allow images from any origin (Schoology avatars + AdSense images); allow data URIs |
| `connect-src` | `'self' https://api.schoology.com https://pagead2.googlesyndication.com` | Allow fetch/XHR to: same origin (Netlify functions), Schoology API, AdSense analytics |
| `base-uri` | `'self'` | Prevent attackers from changing the base URL |
| `form-action` | `'self'` | Forms submit only to same origin |
| `object-src` | `'none'` | No plugins or embeds (Flash, Java, etc.) |
| `frame-ancestors` | `'none'` | Prevent embedding in iframes (clickjacking protection) |

**Why not domain whitelisting for AdSense:** [CITED: support.google.com/adsense/answer/16283098] Google explicitly states their ad domains change over time and **only support strict CSP (nonce-based approach)**. However, this requires server-side nonce generation, which static Netlify hosting cannot do without a serverless function.

### Recommended Phase 3 Approach: Report-Only Mode

Deploy initially with `Content-Security-Policy-Report-Only` to identify violations without blocking resources:

```
/*
  Content-Security-Policy-Report-Only: script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src 'self' https://api.schoology.com https://pagead2.googlesyndication.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
```

Monitor the browser console for CSP violations (Chrome DevTools → Console tab). Expected warnings:
- AdSense script may log about missing `'unsafe-inline'` or nonce — document these for Phase 4
- Schoology OAuth redirect may warn about frame-src — adjust if needed

After 3–5 days of testing with real users, switch to enforced `Content-Security-Policy` header. [CITED: developer.chrome.com/blog/csp-issues]

---

## AdSense Integration

### Current State (Phase 3)

AdSense account is **not yet approved** (approval typically takes 24 hours to 3 weeks). Phase 3 integrates placeholder ads that show structure without real ad serving. Phase 4 will enable monetization after approval.

### ads.txt File Format

Create `/ads.txt` in the repo root with this structure: [CITED: support.google.com/adsense/answer/12171612]

```
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

**Fields:**
- `google.com` — advertising platform (constant for AdSense)
- `pub-0000000000000000` — your AdSense publisher ID (assigned when account is created)
- `DIRECT` — relationship type (you are the direct publisher)
- `f08c47fec0942fa0` — certification authority ID for Google (constant for AdSense)

**Placement:** Netlify will serve this at `/ads.txt` automatically if placed in the root of the publish directory. [VERIFIED: no configuration needed in netlify.toml]

**Verification timeline:** It may take a few days to a month for Netlify to crawl and validate the file, depending on your site's traffic. [CITED: support.google.com/adsense/answer/12171612]

### AdSense Code Integration (Phase 3 vs Phase 4)

**Phase 3 (Placeholder):**
Add the AdSense script to both `index.html` (landing page) and `study.html` (main app):

```html
<!-- AdSense placeholder (before </head> or before </body>) -->
<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID"></script>
```

Replace `ca-pub-YOUR_PUBLISHER_ID` with your AdSense publisher ID. The script is async and non-blocking.

**Ad unit placement (Phase 4):**
Once approved, add ad unit divs in desired locations (not in Phase 3):

```html
<!-- Example: Responsive ad unit -->
<div class="adsbygoogle" data-ad-client="ca-pub-YOUR_PUBLISHER_ID" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></div>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### AdSense + CSP Configuration (Future: Phase 4 with Nonce)

If nonce-based CSP is implemented in Phase 4, the `_headers` file would include a server-generated nonce (requires a Netlify Function to generate random nonce per request):

```
script-src 'nonce-${RANDOM_NONCE}' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:;
```

Then apply the nonce to both inline scripts and AdSense:

```html
<script nonce="${RANDOM_NONCE}" async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXX"></script>
```

**For Phase 3, use `'unsafe-inline'` as a temporary measure** (acceptable because study.html is internally authored). Document this as a tech debt item to migrate to nonces in Phase 4. [ASSUMED: Netlify static deployment cannot generate random nonces per request without a serverless function]

---

## COPPA Compliance (2026)

**Critical:** COPPA's amended rule became enforceable **April 22, 2026**. Your app targets students (underage users), so compliance is mandatory. [CITED: support.google.com/adsense/answer/3248194]

### Key 2026 Changes Affecting Your App

| Change | Your App Impact | Action |
|--------|-----------------|--------|
| **Targeted advertising requires explicit parental consent** | AdSense interest-based ads cannot target under-13 users without consent | Mark site as child-directed in AdSense settings (Phase 4) |
| **Age-screening required for mixed audiences** | If your app serves both underage and adult users (likely), you must screen age before personalizing content | Document that no personalization occurs (you store no user profiles) |
| **Biometric data (facial recognition, voice prints) is regulated** | Your app uses no facial recognition | No action needed |
| **Stricter enforcement + higher penalties** | Noncompliance = up to $53,088 per violation | Ensure compliance before launch |

### Required Phase 4 Configuration

In Google AdSense settings, you **must**:
1. Navigate to **Ads → Ad suitability**
2. Tag your site as **"Yes, I have child-directed content"** or **"I'm not sure"** (safer if uncertain)
3. Disable interest-based advertising for your site
4. Remove remarketing and conversion tracking pixels

This is a **configuration step, not code**. Phase 3 research; Phase 4 execution. [CITED: support.google.com/adsense/answer/3248194] [ASSUMED: AdSense UI as of 2026; verify current menu structure at approval time]

---

## Landing Page Design

### 2026 SaaS Landing Page Trends

Education-focused SaaS landing pages in 2026 prioritize:
1. **Hero section with product in motion** — Interactive demo, embedded video, or live screenshot carousel above the fold (not static text)
2. **Specific value proposition** — "Finally, a study planner that syncs with Schoology" (speak directly to the pain point, not generic features)
3. **Social proof / trust** — "Trusted by 500+ students at [school names]" (add as soft launch progresses)
4. **Feature grid (bento-style)** — 3–6 cards highlighting core capabilities (today's agenda, week view, grades, flashcards)
5. **Prominent CTA** — "Connect Your Schoology Account" (single, clear call-to-action above and below the fold)
6. **Mobile-first responsive design** — 70% of education SaaS users visit on mobile

[CITED: swipepages.com/blog/12-best-saas-landing-page-examples-of-2026] [CITED: involve.me/blog/landing-page-design-trends]

### Recommended Structure for index.html

```
HTML Structure:
├── <header> — Navigation (minimal; just logo + links)
├── <section class="hero"> — Headline, subheading, CTA button, animated background or screenshot
├── <section class="features"> — Grid of 4–6 feature cards
├── <section class="social-proof"> — Quote/logos from test users
├── <section class="demo"> — Embedded video or carousel of app screenshots
├── <section class="faq"> — 3–5 common questions
├── <section class="cta-final"> — Final "Ready to organize your study plan?" CTA
└── <footer> — Links to Terms, Privacy, contact
```

### Copy Guidance (Student-Focused Tone)

**Avoid:** Corporate language ("leverage," "synergize," "best-in-class")
**Use instead:** Student language ("your assignments," "stay on top of," "actually makes sense")

**Hero headline options:**
- "Your Schoology assignments, organized for you"
- "Study smarter with real-time synced assignments"
- "One place for all your Schoology classes"

**Subheading:**
- "See your entire week at a glance. Sync your assignments automatically. Track your grades in one view."

[CITED: Medium article on SaaS Landing Page Design from Design Studio UI/UX, Apr 2026]

### Design System Consistency

Reuse the dark theme from study.html (`--bg: #191919`, `--card: #242424`, `--accent: #818CF8`) in index.html. This creates visual continuity when users transition from landing page to the app. [VERIFIED: .planning/codebase/STACK.md confirms color variables]

---

## OAuth Error Handling & User-Friendly Messages

### Error Types & Friendly Responses

| HTTP Status | Technical Cause | Friendly User Message |
|------------|-----------------|----------------------|
| **401 Unauthorized** | Consumer secret is invalid or access token expired | "We couldn't authenticate you. Try connecting again or contact support." |
| **403 Forbidden** | Consumer secret is incorrect OR app not approved by Schoology | "Your school's data is not accessible. Ask your IT admin to approve the app." |
| **404 Not Found** | School domain doesn't exist (e.g., "invaliddomain.schoology.com") | "School not found. Check the domain and try again." |
| **Network error** | Timeout, DNS failure, Netlify function error | "Connection failed. Check your internet and try again." |
| **OAuth callback mismatch** | Redirect URI doesn't match registered app | "We couldn't complete login. Try refreshing the page." |

### Implementation Pattern (existing code)

The `callback.js` function already redirects errors to `/#oauth_error=MESSAGE`. Phase 3 updates the error messages shown to users:

**Before (Phase 2):**
```javascript
// callback.js (current)
if (errorCode) {
  return new Response(`<script>window.location='/#oauth_error=${errorCode}'</script>`, { status: 302 })
}
```

**After (Phase 3):**
Map HTTP error codes to friendly text displayed in study.html:

```javascript
// netlify/functions/callback.js (Phase 3 update)
const errorMessages = {
  '401': 'We couldn\'t authenticate you. Try connecting again or contact support.',
  '403': 'Your school\'s data is not accessible. Ask your IT admin to approve the app.',
  '404': 'School not found. Check the domain and try again.',
  'network': 'Connection failed. Check your internet and try again.'
};

if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
  const msg = errorMessages[String(statusCode)] || 'An error occurred. Try again.';
  return new Response(`<script>window.location='/#oauth_error=${encodeURIComponent(msg)}'</script>`, { status: 302 })
}
```

**In study.html, display the message:**

```javascript
// study.html (Phase 3 update)
function handleOAuthError() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const error = params.get('oauth_error');
  if (error) {
    showModal('Connection Error', error); // Show friendly message in modal
    window.history.replaceState(null, '', '/'); // Clean URL
  }
}
```

[CITED: developers.schoology.com/api-documentation/authentication] [CITED: developers.schoology.com/app-platform/handling-domains]

---

## Common Pitfalls

### Pitfall 1: CSP Blocks AdSense Without Explicit Allow

**What goes wrong:** You deploy CSP with `script-src 'self'` and AdSense script (hosted at `pagead2.googlesyndication.com`) fails to load. Ads don't appear, revenue drops.

**Why it happens:** CSP is strict by default; you must explicitly allow external script sources.

**How to avoid:**
1. Add `https://pagead2.googlesyndication.com` to `connect-src` (for analytics)
2. Either use nonce-based CSP (Phase 4) or allow `'unsafe-inline'` for inline AdSense code (Phase 3)
3. Test in `Content-Security-Policy-Report-Only` mode first; check browser console for violations

**Warning signs:** AdSense script tag loads but no ads appear; browser console shows "Refused to load the script because it violates the Content Security Policy directive."

### Pitfall 2: COPPA Violations Lead to Account Suspension

**What goes wrong:** You launch without configuring COPPA compliance in AdSense. Ads are served to under-13 users with interest-based targeting. Google audits and suspends your AdSense account.

**Why it happens:** COPPA 2026 rules are strict; education audiences are assumed to include minors.

**How to avoid:**
1. In Phase 4, tag your site as child-directed in AdSense settings
2. Disable interest-based ads before launch
3. Document in your Privacy Policy that you do not collect personal information
4. Store no user profiles or tracking data (already true for this app)

**Warning signs:** Warning email from Google about compliance violations; account flagged for review.

### Pitfall 3: Schoology OAuth Callback URL Mismatch

**What goes wrong:** You register the app at developers.schoology.com with callback URL `https://mysite.netlify.app/api/callback`, but later change the domain to a custom domain. OAuth fails because the registered callback URL no longer matches.

**Why it happens:** Schoology's Platform app registration is tied to a specific domain. Netlify's default `.netlify.app` domain differs from custom domains.

**How to avoid:**
1. Register the Schoology Platform app with the **final custom domain first** (not the temporary `.netlify.app` domain)
2. If using a custom domain, register with that domain
3. Alternatively, register with both domains in Schoology app settings (if supported)
4. Test OAuth flow before deploying to production

**Warning signs:** OAuth redirects to Schoology login OK, but after login, you get a 403 or "redirect_uri mismatch" error.

### Pitfall 4: Inline Styles Blocked by CSP

**What goes wrong:** study.html uses inline `<style>` tags and inline `style="..."` attributes. If CSP has `style-src 'self'`, inline styles are blocked and the page looks unstyled.

**Why it happens:** CSP treats inline styles as a potential XSS vector (like inline scripts).

**How to avoid:**
1. Use `style-src 'self' 'unsafe-inline'` in `_headers` (safe for internal styles; you control all CSS)
2. Alternatively, extract styles to external `.css` files and use `style-src 'self'`
3. For ad-hoc inline styles (e.g., `style="color: red"`), consider using CSS classes and external stylesheets

**Warning signs:** Page loads but has no styling; CSS is missing or grayed out in DevTools.

### Pitfall 5: ads.txt Not Served by Netlify

**What goes wrong:** You add `ads.txt` to the repo, but Netlify doesn't serve it. Accessing `/ads.txt` returns 404.

**Why it happens:** Netlify's publish directory might not include the file, or the file is in the wrong location.

**How to avoid:**
1. Place `ads.txt` in the **root of the repository** (same level as `netlify.toml`)
2. If using a `study_launch/` subfolder, place `ads.txt` there
3. Verify in Netlify deploy logs: should see "Deploying files" listing `ads.txt`
4. Test: visit `https://your-domain.com/ads.txt` in browser; should return the file content

**Warning signs:** AdSense verification shows "ads.txt not found"; browser console shows 404 for `/ads.txt`.

### Pitfall 6: localStorage Token Exposed in OAuth Hash

**What goes wrong:** OAuth callback redirects to `/#sc_at=TOKEN&sc_ats=SECRET`. This token is visible in browser history and may be logged by third-party services.

**Why it happens:** OAuth callback naively stores tokens in URL hash without cleanup.

**How to avoid:**
1. Extract tokens from hash immediately: `const token = new URLSearchParams(window.location.hash.substring(1)).get('sc_at')`
2. Store in localStorage
3. **Clean the URL:** `window.history.replaceState(null, '', '/')` to remove the hash
4. Do this before analytics, ads, or error reporting runs

**Warning signs:** Tokens visible in browser history (address bar shows `/#sc_at=...`); error reports or analytics logs contain tokens.

[VERIFIED: existing Phase 2 code already does this in `handleOAuthCallback()` line 1609]

---

## Code Examples

### Example 1: _headers File (CSP + HSTS)

**File location:** `/study_launch/_headers` or `/_headers` (at Netlify publish root)

```
/*
  Content-Security-Policy-Report-Only: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src 'self' https://api.schoology.com https://pagead2.googlesyndication.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: microphone=(), camera=(), geolocation=()
```

**Notes:**
- Start with `Content-Security-Policy-Report-Only` for 3–5 days to identify violations
- Switch to `Content-Security-Policy` (without `-Report-Only`) after testing
- One header per line; directives separated by semicolons within the header value
- Path matcher `/*` applies to all routes; can use `/api/*` or `/study.html` for specific paths

[CITED: docs.netlify.com/manage/security/content-security-policy]

### Example 2: ads.txt File

**File location:** `/ads.txt` (at repo root, Netlify publish root)

```
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

Replace `pub-0000000000000000` with your AdSense publisher ID (assigned when account is created). Create with plain text editor; do not copy from rich-text editor (may include invisible formatting).

[CITED: support.google.com/adsense/answer/12171612]

### Example 3: AdSense Script Integration (index.html or study.html)

```html
<!-- Place in <head> or before </body> -->
<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID"></script>
```

Replace `ca-pub-YOUR_PUBLISHER_ID` with your publisher ID.

**Async attribute:** Non-blocking; page loads while script downloads and executes in background.

**Phase 4 update:** Once AdSense account is approved, add responsive ad units:

```html
<div style="text-align: center; margin: 20px 0;">
  <div class="adsbygoogle" data-ad-client="ca-pub-YOUR_PUBLISHER_ID" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></div>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
```

[CITED: support.google.com/adsense/answer/16283098]

### Example 4: Friendly OAuth Error Messages (callback.js)

```javascript
// netlify/functions/callback.js (Phase 3 update)

const errorMessages = {
  'auth_denied': 'You denied permission. Try again and click "Allow".',
  '401': 'We couldn\'t authenticate you. Your Schoology connection might have expired. Try connecting again.',
  '403': 'Your school\'s data is not accessible. Check with your IT admin to ensure the app is approved.',
  '404': 'School not found. Double-check the domain (e.g., myschool.schoology.com) and try again.',
  'network_error': 'Connection failed. Check your internet and try again.',
  'invalid_token': 'The authorization code expired. Start over.'
};

async function handler(event) {
  try {
    const { code, state, oauth_verifier } = event.queryStringParameters || {};
    const { school_domain } = JSON.parse(Buffer.from(state || '', 'base64').toString()) || {};

    if (!oauth_verifier) {
      const reason = event.queryStringParameters?.error || 'unknown';
      const message = errorMessages[reason] || 'An error occurred. Try again.';
      return redirect(`/#oauth_error=${encodeURIComponent(message)}`);
    }

    // Exchange verifier for access token...
    // (existing logic)

    return redirect(`/#sc_at=${accessToken}&sc_ats=${accessTokenSecret}&sc_user=${name}`);
  } catch (error) {
    console.error('[callback] error:', error);
    const msg = errorMessages['network_error'];
    return redirect(`/#oauth_error=${encodeURIComponent(msg)}`);
  }
}

function redirect(url) {
  return {
    statusCode: 302,
    headers: { Location: url },
    body: ''
  };
}

exports.handler = handler;
```

**Key pattern:** Map error codes to user-friendly messages; log technical details server-side (not shown to user).

---

## Testing CSP Headers

### Development Workflow

1. **Deploy `_headers` with `Content-Security-Policy-Report-Only`:**
   ```
   Content-Security-Policy-Report-Only: ...
   ```

2. **Open browser DevTools (F12) → Console tab**

3. **Visit the site and interact:**
   - Sync assignments (triggers Schoology API call)
   - Load AdSense script (if present)
   - Click OAuth connect button
   - Navigate between tabs

4. **Watch console for CSP violation messages:**
   ```
   [Report Only] Refused to load the script '<URL>' 
   because it violates the Content Security Policy directive: "script-src 'self'".
   ```

5. **Document violations and adjust `_headers`** (if needed):
   - If Schoology avatar images fail: add domain to `img-src`
   - If AdSense script fails: add domain to `script-src` or use nonce
   - If analytics fails: add domain to `connect-src`

6. **After 3–5 days with no critical violations, switch to enforced CSP:**
   ```
   Content-Security-Policy: ...  (remove -Report-Only)
   ```

7. **Test again in production:** Verify no user reports of broken functionality

[CITED: developer.chrome.com/blog/csp-issues] [CITED: csp-evaluator.withgoogle.com]

### Manual CSP Validation Tools

- **CSP Evaluator:** [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com/) — Paste your CSP policy to check for weaknesses (nonce-based, domain-based, wildcard issues)
- **CSP Reference:** [content-security-policy.com](https://content-security-policy.com/) — Syntax reference and examples
- **CSP Validator:** [cspvalidator.org](https://cspvalidator.org/) — Validate CSP header format

---

## State of the Art

| Old Approach (2022–2023) | Current Approach (2026) | When Changed | Impact |
|--------------------------|-------------------------|--------------|--------|
| Domain whitelisting in CSP | Nonce-based CSP for third-party scripts | Ongoing (motivated by frequent IP/domain changes) | Strict CSP is now standard; domain lists become stale quickly |
| AdSense approval instant | 24 hours to 3+ weeks review | 2024–2026 (stricter content requirements) | Must plan ads as late-phase feature, not blocking launch |
| COPPA guidelines vague | COPPA 2026 Rule (effective April 22, 2026) with explicit requirements | April 2026 | Must configure child-directed settings; failure = $53k per violation |
| Static `.netlify.app` domains | Custom domains + Netlify DNS | Ongoing (matured Netlify DNS offering) | Must register OAuth callbacks with final domain, not temp netlify.app URL |

**Deprecated/outdated:**
- **inline-script hashing:** Previously, CSP allowed hashing inline scripts (`script-src 'sha256-...'`). Now `'unsafe-inline'` is simpler for small, internally-authored pages like study.html. [ASSUMED: hash approach still works but nonce is more flexible for dynamic scripts]
- **CSP 2.0 (pre-2020):** CSP Level 3 (2023+) added nonce and strict-dynamic support, making strict CSP much more practical.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong | Mitigation |
|---|-------|---------|---------------|-----------|
| A1 | Google AdSense requires nonce-based CSP, not domain whitelisting | CSP + AdSense | If domains are whitelisted, app may break when AdSense infrastructure changes | Phase 4 testing will surface domain changes immediately; switch to nonce approach if needed |
| A2 | COPPA 2026 deadline has passed (April 22, 2026), but rules are now in effect | COPPA Compliance | If deadline is extended or rules are voluntary, compliance effort is wasted | Verify current FTC guidance; assume strict enforcement for safety |
| A3 | Netlify static hosting cannot generate random nonces per request | AdSense + CSP | If nonces can be generated without a serverless function, Phase 3 could use strict CSP now | Phase 4 will implement nonce generation via serverless function if needed |
| A4 | Schoology OAuth callback URL must match exactly (including protocol, domain, path) | OAuth Error Handling | If Schoology allows partial matches or regex patterns, callback URL updates could be avoided | Verify with Schoology developer docs; assume exact match for Phase 3 planning |
| A5 | Landing page should emphasize product demo (screenshots/video) over copy | Landing Page Design | If education audiences respond better to feature lists or pricing, design strategy shifts | A/B test during soft launch with test users |

---

## Open Questions

1. **Should Phase 3 include an AdSense publisher ID placeholder?**
   - What we know: AdSense account will not be approved by Phase 3 launch; placeholder ads are allowed
   - What's unclear: Can you test with a placeholder publisher ID, or must the ads.txt exactly match your real ID?
   - Recommendation: Use your real publisher ID in ads.txt once you've created an AdSense account (Phase 3); use placeholder divs in HTML without firing real ads until Phase 4 approval

2. **Will the existing OAuth flow need updates for error handling?**
   - What we know: callback.js already redirects errors to `/#oauth_error`; study.html needs to display friendly messages
   - What's unclear: Are there other OAuth endpoints (auth.js, sync.js) that also need error message updates?
   - Recommendation: Audit all three functions (auth.js, callback.js, sync.js) to identify error scenarios; map each to a friendly message in Phase 3 planning

3. **What's the best way to test CSP with AdSense during development?**
   - What we know: CSP-Report-Only allows monitoring without blocking; browser console logs violations
   - What's unclear: Can you test with a real AdSense script tag if your account isn't approved yet?
   - Recommendation: Add the AdSense script tag with your publisher ID in Phase 3 even before approval; use Report-Only mode to verify CSP doesn't break it; no ads will show until Phase 4 approval

4. **Should landing page mention ads, monetization, or pricing?**
   - What we know: Phase 3 context says "no monetization messaging (Phase 4 concern)"
   - What's unclear: Can landing page mention "we use ads to keep this free" as a trust signal?
   - Recommendation: Defer all monetization mentions to Phase 4; focus landing page entirely on value prop and features for Phase 3 soft launch

5. **How to handle the domain mismatch issue when moving from .netlify.app to custom domain?**
   - What we know: Schoology app must be registered with the final callback URL; changing domains breaks OAuth
   - What's unclear: Does Schoology allow multiple callback URLs (one for .netlify.app, one for custom domain)?
   - Recommendation: Contact Schoology support in Phase 3 planning; register final custom domain as primary callback; add .netlify.app as fallback if possible

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Netlify (hosting + Functions) | Core deployment | ✓ | Current Netlify platform | Self-hosted (not viable for soft launch timeline) |
| Google AdSense account | ads.txt + ad serving | Pending | N/A (will create in Phase 3) | Manual ad network (Mediavine, Monunetize) — less ideal for education |
| Schoology Platform app | OAuth flow | ✓ (registered by user) | Per user's registration | — (required; no fallback) |
| HTTPS/custom domain | Netlify + Schoology | ✓ | Netlify free HTTPS | — (required; Schoology enforces HTTPS) |
| Browser (for testing CSP) | CSP validation | ✓ | Chrome/Firefox/Safari 2026+ | N/A (testing only, not blocking) |

**No missing dependencies:** All required services are either available, pending user action (AdSense account creation), or will be available by Phase 3 deployment.

---

## Validation Architecture

**Framework:** Browser console CSP violation monitoring + manual testing + soft launch user feedback

| Phase Requirement | Behavior | Test Type | Verification Command | File Exists? |
|-------------------|----------|-----------|---------------------|----|
| SEC-01 | `_headers` file exists with CSP | Manual file check | `ls -la study_launch/_headers` | ❌ Wave 0 |
| SEC-02 | CSP allows own scripts + AdSense, blocks unauthorized scripts | CSP Report-Only + console check | Open DevTools → Console; trigger sync, load AdSense, verify no CSP violations | ✅ (Phase 2 study.html exists) |
| AUTH-09 | OAuth errors show friendly messages | Manual testing | Trigger OAuth with invalid domain; verify message displayed, not error code | ❌ Wave 0 (callback.js needs update) |
| ADS-01 | AdSense code integrated | Manual inspection | Check `<script>` tag with AdSense publisher ID in index.html and study.html | ❌ Wave 0 |
| ADS-04 | ads.txt served at `/ads.txt` | HTTP check | `curl https://your-site.netlify.app/ads.txt` should return file content (not 404) | ❌ Wave 0 |

**Sampling Rate:**
- **Per task commit:** Manual CSP validation in browser console (30 sec)
- **Per wave merge:** Full soft launch with 5+ test users; collect feedback on landing page clarity and no broken features
- **Phase gate:** No CSP violations in Report-Only mode for 5 days; landing page passes clarity review with 3 beta users; OAuth error messages are friendly

**Wave 0 Gaps:**
- [ ] `_headers` file — CSP + HSTS configuration
- [ ] Landing page redesign (`index.html`) — hero section, features, CTA, FAQ
- [ ] AdSense script integration (`index.html`, `study.html`) — placeholder ads
- [ ] `ads.txt` file — AdSense publisher ID verification
- [ ] OAuth error messages in `callback.js`, `auth.js` — friendly copy
- [ ] CSP validation via browser console — no critical violations logged

*(After Wave 0: all gaps filled; Phase 3 ready for soft launch testing)*

---

## Security Domain

**Applicable ASVS Categories:**

| ASVS Category | Applies | Standard Control | Implementation |
|---------------|---------|-----------------|-----------------|
| V2 Authentication | yes | OAuth 1.0a consumer secret isolation | Secrets in Netlify env vars, never in client code |
| V3 Session Management | yes | HttpOnly cookies for state; token cleanup | `sc_rts` cookie HttpOnly; hash cleanup in study.html |
| V4 Access Control | yes | Token validation per request | sync.js validates access token before API call |
| V5 Input Validation | yes | Domain validation + server-side validation | auth.js validates school domain; callback.js validates state |
| V6 Cryptography | yes | HTTPS-only, HMAC-SHA1 OAuth signatures | Netlify enforces HTTPS; OAuth signatures via crypto module |
| V7 Cryptography - Secrets | yes | Never log or expose tokens | Tokens logged server-side only; client sees friendly errors |
| V8 Data Protection | yes | No sensitive data in URLs after cleanup | OAuth callback hash cleaned via `replaceState` |

**Known Threat Patterns for Study Planner (Netlify + Schoology OAuth):**

| Pattern | STRIDE | Standard Mitigation | Your Implementation |
|---------|--------|---------------------|-------------------|
| XSS via AdSense or third-party script | Tampering | CSP script-src restrictions | CSP allows only `'self'` + AdSense domain; nonce for Phase 4 |
| Clickjacking (iframe embedding) | Spoofing | X-Frame-Options: DENY | Configured in _headers |
| MIME-type sniffing | Information Disclosure | X-Content-Type-Options: nosniff | Configured in _headers |
| Referrer leakage | Information Disclosure | Referrer-Policy: strict-origin-when-cross-origin | Configured in _headers |
| Token leakage via URL history | Information Disclosure | Clean hash; HttpOnly cookies | Existing: `replaceState()` in study.html + HttpOnly `sc_rts` cookie |
| OAuth replay attack (duplicate nonce/timestamp) | Tampering | Unique nonce + timestamp per request | Existing: Node.js `crypto.randomBytes()` in auth.js/callback.js |
| Unauthorized API access (expired token) | Elevation of Privilege | Token validation + 401 handling | Existing: sync.js validates token before API call |
| COPPA violation (targeted ads to minors) | Legal/Compliance | Disable interest-based ads; parent consent | Phase 4 task: configure AdSense child-directed setting |

**CSP Policy Strength Assessment:**
- ✅ **Strong:** Restricts script-src to `'self'` + trusted domains (blocks most XSS)
- ✅ **No wildcards:** All sources are explicit domains or 'self'
- ✅ **object-src: 'none':** Blocks Flash/Java plugins
- ⚠️ **'unsafe-inline' for styles:** Acceptable for internally-authored CSS; migrate to external stylesheets or nonces if stricter policy needed
- ⚠️ **img-src: * :** Allows images from any origin (Schoology avatars); consider restricting to specific domains if feasible

[CITED: csp-evaluator.withgoogle.com guidelines]

---

## Sources

### Primary (HIGH confidence)

- [Netlify Content Security Policy Documentation](https://docs.netlify.com/manage/security/content-security-policy/) — _headers syntax, CSP directives, Report-Only mode
- [Google AdSense CSP Integration Guide](https://support.google.com/adsense/answer/16283098?hl=en) — Nonce-based CSP requirement, domain changes, strict policy recommendation
- [Google AdSense ads.txt Verification](https://support.google.com/adsense/answer/12171612?hl=en) — File format, placement, verification timeline
- [Google AdSense COPPA Tagging](https://support.google.com/adsense/answer/3248194?hl=en) — Child-directed treatment configuration, interest-based ad disabling
- [Schoology Developer Authentication](https://developers.schoology.com/api-documentation/authentication/) — OAuth 1.0a endpoints, error codes, token validation
- [Schoology Platform Domain Handling](https://developers.schoology.com/app-platform/handling-domains/) — Domain validation, callback URL matching, domain parameter requirements

### Secondary (MEDIUM confidence)

- [Chrome DevTools CSP Debugging](https://developer.chrome.com/blog/csp-issues) — Violation reporting, Report-Only testing workflow
- [CSP Evaluator Tool](https://csp-evaluator.withgoogle.com/) — CSP policy strength assessment
- [2026 SaaS Landing Page Examples](https://swipepages.com/blog/12-best-saas-landing-page-examples-of-2026/) — Landing page design trends, hero section patterns
- [Netlify Domain Management](https://docs.netlify.com/manage/domains/get-started-with-domains/) — Custom domain setup, DNS configuration, CNAME vs ALIAS
- [Content Security Policy Reference](https://content-security-policy.com/) — CSP syntax, directive explanations, examples
- [COPPA 2026 Compliance](https://support.google.com/adsense/answer/3248194?hl=en) — FTC rule updates, age-screening, penalties

### Tertiary (LOW confidence — Web Search only, flagged for validation)

- [SaaS Landing Page Design Trends 2026](https://involve.me/blog/landing-page-design-trends) — Visual trends, CTA placement; verify current best practices with landing page expert
- [AdSense Approval Process 2026](https://careerandmarket.com/google-adsense-approval-2026/) — Approval timelines, content requirements; verify current approval criteria with AdSense team

---

## Metadata

**Confidence breakdown:**
- **Security headers (CSP, HSTS, _headers syntax):** HIGH — Verified with official Netlify + Google docs + multiple sources
- **AdSense integration + ads.txt:** HIGH — Verified with official Google AdSense docs
- **COPPA compliance:** HIGH — Verified with official Google AdSense + FTC guidance
- **Landing page design:** MEDIUM — Based on 2026 SaaS trends; specific education audience feedback needed during soft launch
- **OAuth error handling:** MEDIUM — Technical details verified; user copy effectiveness untested until soft launch
- **CSP testing workflow:** HIGH — Verified with Chrome DevTools documentation + CSP Evaluator

**Research date:** 2026-05-04  
**Valid until:** 2026-05-31 (security landscape moves quickly; re-check if major revisions occur)

---

*Phase 3 Research complete. Ready for planner to create PLAN.md with tasks for _headers, landing page, AdSense integration, and error messaging.*
