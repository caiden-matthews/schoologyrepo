// netlify/functions/callback.js
// Step 2 of Schoology OAuth: exchange the verifier for an access token,
// then redirect the browser back to the app with tokens in the URL hash.
// The main page JS picks them up and stores them in localStorage.

const crypto = require('crypto');

const ACCESS_TOKEN_URL = 'https://api.schoology.com/v1/oauth/access_token';
const API_BASE         = 'https://api.schoology.com/v1';

// ── OAuth 1.0a helpers (duplicated from auth.js — functions are isolated) ─────
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

async function apiGet(path, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  const url    = `${API_BASE}/${path.replace(/^\//, '')}`;
  const header = oauthHeader('GET', url, {}, consumerKey, consumerSecret, accessToken, accessTokenSecret);
  const resp   = await fetch(url, { headers: { Authorization: header, Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
  return resp.json();
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const KEY    = process.env.SCHOOLOGY_CONSUMER_KEY;
  const SECRET = process.env.SCHOOLOGY_CONSUMER_SECRET;
  const SITE   = process.env.URL || `https://${event.headers.host}`;

  const qs       = new URLSearchParams(event.rawQuery || event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : '');
  const verifier = qs.get('oauth_verifier') || (event.queryStringParameters || {}).oauth_verifier;
  const reqToken = qs.get('oauth_token')    || (event.queryStringParameters || {}).oauth_token;

  // Retrieve request token secret and school domain from cookies set in auth.js
  const cookies    = parseCookies(event.headers.cookie || event.headers.Cookie || '');
  const reqSecret  = decodeURIComponent(cookies.sc_rts || '');
  const school     = decodeURIComponent(cookies.sc_domain || '');

  if (!verifier || !reqToken) {
    return htmlRedirect(SITE, 'oauth_error', 'Missing verifier or token from Schoology');
  }
  if (!reqSecret) {
    return htmlRedirect(SITE, 'oauth_error', 'Session expired — please try connecting again');
  }
  if (!school) {
    return htmlRedirect(SITE, 'oauth_error', 'Please try connecting again');
  }

  try {
    // Exchange request token + verifier for access token
    const header = oauthHeader(
      'POST', ACCESS_TOKEN_URL,
      { oauth_verifier: verifier },
      KEY, SECRET,
      reqToken, reqSecret
    );

    const resp = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: header, Accept: 'application/x-www-form-urlencoded' },
    });

    if (!resp.ok) throw new Error(`Access token failed: ${resp.status} ${await resp.text()}`);

    const tokens      = Object.fromEntries(new URLSearchParams(await resp.text()));
    const accessToken = tokens.oauth_token;
    const accessSecret = tokens.oauth_token_secret;

    if (!accessToken) throw new Error('No access token in response');

    // Fetch the user's name so we can show it in the UI
    let userName = '';
    try {
      const user = await apiGet('/users/me', KEY, SECRET, accessToken, accessSecret);
      userName = `${user.name_first || ''} ${user.name_last || ''}`.trim();
    } catch (_) {}

    // Clear the request token secret and domain cookies
    const clearCookies = [
      'sc_rts=; Path=/; HttpOnly; Max-Age=0',
      'sc_domain=; Path=/; HttpOnly; Max-Age=0',
    ];

    // Redirect back to the app with tokens in the URL hash.
    // Hash fragments never go to the server — the browser reads them and
    // stores them in localStorage, then cleans the URL.
    const hash = new URLSearchParams({
      sc_at:     accessToken,
      sc_ats:    accessSecret,
      sc_user:   userName,
      sc_school: school,
    }).toString();

    return {
      statusCode: 302,
      headers: {
        Location:    `${SITE}/#${hash}`,
        'Set-Cookie': clearCookies,
      },
    };

  } catch (err) {
    // Log error server-side for debugging
    console.error('Callback error:', err.message);

    // Return friendly error message to user
    let friendlyError = 'Failed to complete login. Please try connecting again.';
    if (err.message.includes('401') || err.message.includes('403')) {
      friendlyError = 'Authorization failed. Please try connecting again.';
    } else if (err.message.includes('404')) {
      friendlyError = 'School not found or access denied. Check your school name and try again.';
    }

    return htmlRedirect(SITE, 'oauth_error', friendlyError);
  }
};

function parseCookies(str) {
  const out = {};
  (str || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k.trim()] = v.join('=').trim();
  });
  return out;
}

function htmlRedirect(site, param, message) {
  // Redirect to app with error in hash so JS can show it
  const hash = new URLSearchParams({ [param]: message }).toString();
  return {
    statusCode: 302,
    headers: { Location: `${site}/#${hash}` },
  };
}
