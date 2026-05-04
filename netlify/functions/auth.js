// netlify/functions/auth.js
// Step 1 of Schoology OAuth: get a request token, set a short-lived cookie
// with the request token secret, then redirect user to Schoology login.
//
// Env vars required (set in Netlify dashboard → Site settings → Environment):
//   SCHOOLOGY_CONSUMER_KEY
//   SCHOOLOGY_CONSUMER_SECRET

const crypto = require('crypto');

const REQUEST_TOKEN_URL = 'https://api.schoology.com/v1/oauth/request_token';
const AUTHORIZE_URL     = 'https://app.schoology.com/oauth/authorize';

// ── OAuth 1.0a helpers (pure Node, no npm deps) ───────────────────────────────
function pct(s) { return encodeURIComponent(String(s ?? '')); }

function oauthSign(method, url, params, consumerSecret, tokenSecret = '') {
  const sorted = Object.keys(params).sort()
    .map(k => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = `${method.toUpperCase()}&${pct(url)}&${pct(sorted)}`;
  const key  = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function oauthHeader(method, url, extra, consumerKey, consumerSecret, token = '', tokenSecret = '') {
  const params = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_version:          '1.0',
    ...extra,
  };
  if (token) params.oauth_token = token;

  params.oauth_signature = oauthSign(method, url, params, consumerSecret, tokenSecret);

  return 'OAuth ' + Object.keys(params)
    .filter(k => k.startsWith('oauth_')).sort()
    .map(k => `${pct(k)}="${pct(params[k])}"`)
    .join(', ');
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const KEY    = process.env.SCHOOLOGY_CONSUMER_KEY;
  const SECRET = process.env.SCHOOLOGY_CONSUMER_SECRET;
  const SITE   = process.env.URL || `https://${event.headers.host}`;

  if (!KEY || !SECRET) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: errorPage('Missing environment variables',
        'Set <code>SCHOOLOGY_CONSUMER_KEY</code> and <code>SCHOOLOGY_CONSUMER_SECRET</code> ' +
        'in Netlify → Site settings → Environment variables.'
      ),
    };
  }

  // Parse school name from POST body
  let school = '';
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      school = (body.school || '').trim();
    }
  } catch (e) {
    // Ignore JSON parse errors, school stays empty
  }

  // Validate school name
  if (!school) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'School name required' }),
    };
  }

  // Check for invalid characters (allow alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(school)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid school name format. Use only letters, numbers, hyphens, and underscores.' }),
    };
  }

  const callbackUrl = `${SITE}/api/callback`;
  const schoolDomain = school;  // Store for later use (school name, without .schoology.com)

  try {
    const header = oauthHeader(
      'POST', REQUEST_TOKEN_URL,
      {
        oauth_callback: callbackUrl,
        state: encodeURIComponent(schoolDomain),  // Pass school in state parameter
      },
      KEY, SECRET
    );

    const resp = await fetch(REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: header, Accept: 'application/x-www-form-urlencoded' },
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Schoology returned ${resp.status}: ${body}`);
    }

    const parsed    = Object.fromEntries(new URLSearchParams(await resp.text()));
    const reqToken  = parsed.oauth_token;
    const reqSecret = parsed.oauth_token_secret;

    if (!reqToken) throw new Error('No oauth_token in Schoology response');

    // Store the request token secret AND school domain in HttpOnly cookies so the
    // callback function can retrieve them without any server-side storage.
    const cookies = [
      [
        `sc_rts=${encodeURIComponent(reqSecret)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=600',          // 10 minutes — plenty for the auth flow
        ...(SITE.startsWith('https') ? ['Secure'] : []),
      ].join('; '),
      [
        `sc_domain=${encodeURIComponent(schoolDomain)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=600',
        ...(SITE.startsWith('https') ? ['Secure'] : []),
      ].join('; '),
    ];

    const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(reqToken)}`;

    return {
      statusCode: 302,
      headers: {
        Location: authorizeUrl,
        'Set-Cookie': cookies,
      },
    };

  } catch (err) {
    // Log error server-side for debugging, but show friendly message to user
    console.error('Auth error:', err.message);

    // Determine if error is network/domain related
    const isDomainError = err.message.includes('ENOTFOUND') || err.message.includes('ERR_NAME_NOT_RESOLVED');
    const friendlyError = isDomainError
      ? 'Could not connect to Schoology. Please check your school name and internet connection.'
      : 'Failed to connect to Schoology. Please try again.';

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: friendlyError,
        details: err.message  // Include full error server-side for logs (visible in Network tab for now)
      }),
    };
  }
};

function errorPage(title, body) {
  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:system-ui;background:#191919;color:#e2e8f0;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{background:#242424;border-radius:14px;padding:40px;max-width:480px;
border:1px solid rgba(255,255,255,.08)}h2{color:#f87171}pre{background:#111;
padding:12px;border-radius:8px;font-size:12px;color:#f87171;overflow:auto}
code{background:#111;padding:2px 6px;border-radius:4px;font-size:12px}</style>
</head><body><div class="c"><h2>${title}</h2>${body}</div></body></html>`;
}
