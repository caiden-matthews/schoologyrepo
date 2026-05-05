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

// ── Friendly error message mapping ────────────────────────────────────────────
const errorMessages = {
  'auth_denied': 'You denied permission. Click "Allow" on the Schoology login page to continue.',
  '401': 'We couldn\'t authenticate you. Your Schoology connection might have expired. Try connecting again.',
  '403': 'Your school\'s data is not accessible. Check with your IT admin to ensure the app is approved.',
  '404': 'School not found. Double-check the domain (e.g., myschool.schoology.com) and try again.',
  'network_error': 'Connection failed. Check your internet and try again.',
  'invalid_token': 'The authorization code expired. Start over and try connecting again.',
};

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const KEY    = process.env.SCHOOLOGY_CONSUMER_KEY;
  const SECRET = process.env.SCHOOLOGY_CONSUMER_SECRET;
  const SITE   = process.env.URL || `https://${event.headers.host}`;

  const qs       = new URLSearchParams(event.rawQuery || event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : '');
  const verifier = qs.get('oauth_verifier') || (event.queryStringParameters || {}).oauth_verifier;
  const reqToken = qs.get('oauth_token')    || (event.queryStringParameters || {}).oauth_token;

  // Retrieve request token secret from the cookie set in auth.js
  const cookies    = parseCookies(event.headers.cookie || event.headers.Cookie || '');
  const reqSecret  = decodeURIComponent(cookies.sc_rts || '');

  if (!verifier || !reqToken) {
    const reason = (event.queryStringParameters || {}).error || 'auth_denied';
    const message = errorMessages[reason] || errorMessages['auth_denied'];
    console.error(`[callback] OAuth denied: ${reason}`);
    return htmlRedirect(SITE, 'oauth_error', encodeURIComponent(message));
  }
  if (!reqSecret) {
    console.error('[callback] Session expired: no request token secret in cookie');
    return htmlRedirect(SITE, 'oauth_error', encodeURIComponent(errorMessages['invalid_token']));
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

    if (!resp.ok) {
      const statusCode = String(resp.status);
      const friendlyMsg = errorMessages[statusCode] || errorMessages['network_error'];
      console.error(`[callback] Access token request failed: ${resp.status} ${await resp.text()}`);
      return htmlRedirect(SITE, 'oauth_error', encodeURIComponent(friendlyMsg));
    }

    const tokens      = Object.fromEntries(new URLSearchParams(await resp.text()));
    const accessToken = tokens.oauth_token;
    const accessSecret = tokens.oauth_token_secret;

    if (!accessToken) {
      console.error('[callback] No access token in response from Schoology');
      return htmlRedirect(SITE, 'oauth_error', encodeURIComponent(errorMessages['invalid_token']));
    }

    // Fetch the user's name so we can show it in the UI
    let userName = '';
    try {
      const user = await apiGet('/users/me', KEY, SECRET, accessToken, accessSecret);
      userName = `${user.name_first || ''} ${user.name_last || ''}`.trim();
    } catch (_) {}

    // Clear the request token secret cookie
    const clearCookie = 'sc_rts=; Path=/; HttpOnly; Max-Age=0';

    // Redirect back to the app with tokens in the URL hash.
    // Hash fragments never go to the server — the browser reads them and
    // stores them in localStorage, then cleans the URL.
    const hash = new URLSearchParams({
      sc_at:   accessToken,
      sc_ats:  accessSecret,
      sc_user: userName,
    }).toString();

    return {
      statusCode: 302,
      headers: {
        Location:    `${SITE}/#${hash}`,
        'Set-Cookie': clearCookie,
      },
    };

  } catch (err) {
    console.error('[callback] Unexpected error:', err.message);
    const friendlyMsg = errorMessages['network_error'];
    return htmlRedirect(SITE, 'oauth_error', encodeURIComponent(friendlyMsg));
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
