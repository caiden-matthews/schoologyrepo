// netlify/functions/custom-events.js
// API endpoints for custom event CRUD operations (create, list, delete)
// Syncs custom events from frontend to Supabase backend for cross-device persistence

const { extractUserId } = require('./_oauth.js');
const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// Initialize Supabase client using service key (backend-only secrets)
// SERVICE_KEY allows full database access; anon key is restricted by RLS
function getSupabaseClient() {
  const projectUrl = process.env.SUPABASE_PROJECT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!projectUrl || !serviceKey) {
    throw new Error('Supabase credentials not configured in environment');
  }

  return createClient(projectUrl, serviceKey);
}

/**
 * Extract Bearer token from Authorization header
 * Format: "Bearer <token>"
 */
function getTokenFromHeaders(headers) {
  const auth = headers['authorization'] || headers['Authorization'] || '';
  if (!auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.slice(7); // Remove "Bearer " prefix
}

/**
 * POST /api/custom-events
 * Create a new custom event
 * Body: { title, event_date, time_val, time_display, subject, event_type, note }
 */
async function handlePost(event) {
  try {
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing authorization token' }),
      };
    }

    const userId = extractUserId(token);
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.title || !body.event_date) {
      return {
        statusCode: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: title, event_date' }),
      };
    }

    const supabase = getSupabaseClient();

    // Insert into custom_events table
    const { data, error } = await supabase
      .from('custom_events')
      .insert({
        user_id: userId,
        title: body.title,
        event_date: body.event_date,
        time_val: body.time_val || null,
        time_display: body.time_display || null,
        subject: body.subject || null,
        event_type: body.event_type || null,
        note: body.note || null,
      })
      .select('id, created_at');

    if (error) {
      console.error(`[custom-events] INSERT failed for user ${userId.substring(0, 8)}...`, error);
      return {
        statusCode: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database unavailable, check back soon' }),
      };
    }

    console.log(`[custom-events] Event created for user ${userId.substring(0, 8)}...`);

    return {
      statusCode: 201,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        id: data[0].id,
        created_at: data[0].created_at,
      }),
    };
  } catch (err) {
    console.error('[custom-events] POST error:', err.message);
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

/**
 * GET /api/custom-events
 * List all custom events for the authenticated user
 */
async function handleGet(event) {
  try {
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing authorization token' }),
      };
    }

    const userId = extractUserId(token);
    const supabase = getSupabaseClient();

    // Query custom_events for this user, ordered by date
    const { data, error } = await supabase
      .from('custom_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });

    if (error) {
      console.error(`[custom-events] SELECT failed for user ${userId.substring(0, 8)}...`, error);
      return {
        statusCode: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database unavailable, check back soon' }),
      };
    }

    console.log(`[custom-events] Retrieved ${data.length} events for user ${userId.substring(0, 8)}...`);

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        events: data || [],
      }),
    };
  } catch (err) {
    console.error('[custom-events] GET error:', err.message);
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

/**
 * DELETE /api/custom-events
 * Delete a custom event (must be owned by user)
 * Body: { event_id }
 */
async function handleDelete(event) {
  try {
    const token = getTokenFromHeaders(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing authorization token' }),
      };
    }

    const userId = extractUserId(token);
    const body = JSON.parse(event.body || '{}');

    if (!body.event_id) {
      return {
        statusCode: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required field: event_id' }),
      };
    }

    const supabase = getSupabaseClient();

    // Verify ownership: check that the event exists and belongs to this user
    const { data: existingEvent, error: checkError } = await supabase
      .from('custom_events')
      .select('id')
      .eq('id', body.event_id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingEvent) {
      return {
        statusCode: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Event not found or not owned by user' }),
      };
    }

    // Delete the event
    const { error: deleteError } = await supabase
      .from('custom_events')
      .delete()
      .eq('id', body.event_id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`[custom-events] DELETE failed for user ${userId.substring(0, 8)}...`, deleteError);
      return {
        statusCode: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database unavailable, check back soon' }),
      };
    }

    console.log(`[custom-events] Event deleted for user ${userId.substring(0, 8)}...`);

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('[custom-events] DELETE error:', err.message);
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

/**
 * Handle preflight CORS requests
 */
async function handleOptions() {
  return {
    statusCode: 200,
    headers: cors,
    body: '',
  };
}

/**
 * Main Netlify Function handler
 */
exports.handler = async (event) => {
  const method = event.httpMethod.toUpperCase();

  // Handle preflight
  if (method === 'OPTIONS') {
    return handleOptions();
  }

  // Route to appropriate handler
  if (method === 'POST') {
    return handlePost(event);
  } else if (method === 'GET') {
    return handleGet(event);
  } else if (method === 'DELETE') {
    return handleDelete(event);
  } else {
    return {
      statusCode: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
};
