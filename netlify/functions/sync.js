// netlify/functions/sync.js
// Schoology API proxy. The browser sends its stored access token; this function
// signs the requests with the consumer secret (never exposed to the browser)
// and returns structured assignment/grade/announcement data.
//
// POST /api/sync
// Body: { access_token, access_token_secret }
// Returns: { ok, data: { assignments, grades, updates, user } }

const crypto = require('crypto');

const API_BASE = 'https://api.schoology.com/v1';

// ── OAuth 1.0a helpers ────────────────────────────────────────────────────────
function pct(s) { return encodeURIComponent(String(s ?? '')); }

function oauthSign(method, url, params, consumerSecret, tokenSecret = '') {
  const sorted = Object.keys(params).sort()
    .map(k => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = `${method.toUpperCase()}&${pct(url)}&${pct(sorted)}`;
  const key  = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function oauthHeader(method, url, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  const params = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  };
  params.oauth_signature = oauthSign(method, url, params, consumerSecret, accessTokenSecret);
  return 'OAuth ' + Object.keys(params)
    .filter(k => k.startsWith('oauth_')).sort()
    .map(k => `${pct(k)}="${pct(params[k])}"`)
    .join(', ');
}

async function get(path, params, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  let url = `${API_BASE}/${path.replace(/^\//, '')}`;
  if (params && Object.keys(params).length) {
    url += '?' + new URLSearchParams(params).toString();
  }
  const header = oauthHeader('GET', url.split('?')[0], consumerKey, consumerSecret, accessToken, accessTokenSecret);
  const resp   = await fetch(url, {
    headers: { Authorization: header, Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`GET ${path} → ${resp.status}`);
  return resp.json();
}

// ── Subject color + abbreviation (mirrors sync_server.py logic) ───────────────
const COLORS = {
  chemistry:'#34D399', chem:'#34D399',
  math:'#60A5FA', algebra:'#60A5FA', calculus:'#60A5FA', statistics:'#60A5FA', precalc:'#60A5FA',
  english:'#F472B6', literature:'#F472B6', writing:'#F472B6',
  history:'#FBBF24', social:'#FBBF24', government:'#FBBF24', economics:'#FBBF24',
  physics:'#A78BFA',
  biology:'#4ADE80', bio:'#4ADE80',
  spanish:'#FB923C', french:'#FB923C', latin:'#FB923C',
  art:'#F87171', music:'#F87171', drama:'#F87171',
  pe:'#94A3B8', health:'#94A3B8', wellness:'#94A3B8',
  religion:'#C4B5FD', theology:'#C4B5FD', gospel:'#C4B5FD',
  computer:'#38BDF8', technology:'#38BDF8',
};

function courseColor(title) {
  const t = (title || '').toLowerCase();
  for (const [kw, color] of Object.entries(COLORS)) {
    if (t.includes(kw)) return color;
  }
  return '#94A3B8';
}

function courseAbbrev(title) {
  const t = (title || '').trim();
  const skip = new Set(['and','or','the','a','an','of','in','at']);
  for (const [prefix, tag] of [['AP ', 'AP'], ['Honors ', 'H'], ['Advanced ', 'Adv']]) {
    if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest  = t.slice(prefix.length);
      const words = rest.split(/\s+/).filter(w => !skip.has(w.toLowerCase()));
      return (tag + words.slice(0, 2).map(w => w[0].toUpperCase()).join('')).slice(0, 6);
    }
  }
  const words = t.split(/\s+/).filter(w => !skip.has(w.toLowerCase()));
  if (!words.length) return t.slice(0, 5);
  if (words.length === 1) return words[0].slice(0, 5);
  return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
}

function parseDue(val) {
  if (!val) return null;
  const n = Number(val);
  if (!isNaN(n) && n > 0) return new Date(n * 1000);
  const s = String(val).trim();
  for (const fmt of ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d']) {
    const d = new Date(s.slice(0, 19).replace(' ', 'T'));
    if (!isNaN(d)) return d;
  }
  return null;
}

function schoologyLink(sectionId, assignId) {
  if (sectionId && assignId)
    return `https://schoology.shschools.org/course/${sectionId}/materials/gp/${assignId}`;
  return '';
}

// ── Transform API results → app DATA ─────────────────────────────────────────
function buildData(raw) {
  const now      = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const labels   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // 7-day skeleton
  const weekByDate = {};
  for (let i = 0; i < 7; i++) {
    const d  = new Date(now); d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    weekByDate[ds] = { date: ds, label: labels[d.getDay()], events: [], study: [] };
  }

  const todayStudy  = [];
  const todayAgenda = [];
  const alerts      = [];

  // Assignments
  for (const a of (raw.assignments || [])) {
    const dueDt = parseDue(a.due);
    if (!dueDt) continue;
    const dueStr  = dueDt.toISOString().split('T')[0];
    const daysOut = Math.round((dueDt - now) / 86400000);
    if (daysOut < 0 || daysOut > 13) continue;

    const course = a.course_title || a.section_title || 'Class';
    const title  = a.title || 'Assignment';
    const color  = courseColor(course);
    const abbrev = courseAbbrev(course);
    const link   = schoologyLink(a.section_id, a.id);

    const item = { subject: abbrev, label: title, color, study: true, _synced: true, ...(link ? { link } : {}) };

    if (weekByDate[dueStr]) weekByDate[dueStr].study.push(item);

    if (daysOut <= 3) {
      const when = ['Due today','Due tomorrow','Due in 2 days','Due in 3 days'][daysOut];
      todayStudy.push({ ...item, time: when });
      todayAgenda.push({ type:'study', title, subject:abbrev, color, study:true, _synced:true, ...(link?{link}:{}) });
    }

    if      (daysOut === 0) alerts.push({ type:'warning', msg:`${title} (${abbrev}) — due today`,    _synced:true });
    else if (daysOut === 1) alerts.push({ type:'info',    msg:`${title} (${abbrev}) — due tomorrow`, _synced:true });
  }

  // Recent grades
  for (const section of (raw.grades || [])) {
    const abbrev = courseAbbrev(section.section_title || '');
    for (const period of (section.period || [])) {
      for (const ga of (period.assignment || [])) {
        const grade = ga.grade;
        if (grade == null) continue;
        try {
          const ts = Number(ga.timestamp || 0);
          if (ts && (Date.now() / 1000 - ts) < 4 * 86400) {
            const maxPts = Number(ga.max_points || 100) || 100;
            const pct    = Math.round(Number(grade) / maxPts * 100);
            alerts.push({
              type: 'info',
              msg:  `Graded: ${ga.title || 'Assignment'} — ${grade}/${Math.round(maxPts)} (${pct}%) [${abbrev}]`,
              _synced: true,
            });
          }
        } catch (_) {}
      }
    }
  }

  // Announcements
  for (const upd of (raw.updates || []).slice(0, 5)) {
    const body = (upd.body || '').trim();
    if (body) alerts.push({ type:'info', msg: body.slice(0, 90) + (body.length > 90 ? '…' : ''), _synced:true });
  }

  return {
    today: {
      date:   todayStr,
      agenda: todayAgenda,
      study:  todayStudy,
    },
    week:        Object.values(weekByDate).sort((a, b) => a.date < b.date ? -1 : 1),
    alerts,
    lastUpdated: new Date().toISOString(),
    user:        raw.user || '',
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ ok: false, error: 'POST only' }) };
  }

  const KEY    = process.env.SCHOOLOGY_CONSUMER_KEY;
  const SECRET = process.env.SCHOOLOGY_CONSUMER_SECRET;

  if (!KEY || !SECRET) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Missing Schoology API credentials on server' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { body = {}; }

  const accessToken  = body.access_token;
  const accessSecret = body.access_token_secret;

  if (!accessToken || !accessSecret) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, needs_auth: true, error: 'Not connected — please sign in with Schoology' }),
    };
  }

  try {
    // Resolve user ID
    const user = await get('/users/me', {}, KEY, SECRET, accessToken, accessSecret);
    const uid  = String(user.uid || user.id || 'me');
    const userName = `${user.name_first || ''} ${user.name_last || ''}`.trim();

    const now = Math.floor(Date.now() / 1000);

    // Parallel API calls
    const [assignmentsRaw, gradesRaw, updatesRaw] = await Promise.allSettled([
      get(`/users/${uid}/assignments`, {
        completion_status: 0,
        due_after:  now,
        due_before: now + 14 * 86400,
        limit: 100,
      }, KEY, SECRET, accessToken, accessSecret),

      get(`/users/${uid}/grades`, {}, KEY, SECRET, accessToken, accessSecret),

      get(`/users/${uid}/updates`, { limit: 10 }, KEY, SECRET, accessToken, accessSecret),
    ]);

    function unwrap(result, listKey) {
      if (result.status !== 'fulfilled') { console.warn(result.reason?.message); return []; }
      const v = result.value;
      if (Array.isArray(v)) return v;
      return v[listKey] || v[listKey + 's'] || [];
    }

    const raw = {
      assignments: unwrap(assignmentsRaw, 'assignment'),
      grades:      (gradesRaw.status === 'fulfilled' ? gradesRaw.value.section : null) || [],
      updates:     unwrap(updatesRaw, 'update'),
      user:        userName,
    };

    const data = buildData(raw);

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok:   true,
        msg:  `${raw.assignments.length} assignments synced`,
        data,
      }),
    };

  } catch (err) {
    const isAuthErr = err.message.includes('401') || err.message.includes('403');
    return {
      statusCode: isAuthErr ? 401 : 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok:         false,
        needs_auth: isAuthErr,
        error:      err.message,
      }),
    };
  }
};
