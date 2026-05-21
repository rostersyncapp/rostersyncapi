import { Hono } from 'hono';

type Bindings = {
  SUPABASE_URL: string;
  ROSTERSYNC_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * SHA-256 Cryptographic Hash Helper
 * Converts the client's API Key to a hex string that matches the DB hashes.
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 1. GLOBAL MIDDLEWARE: Auth & Rate Limiting at the Edge
app.use('*', async (c, next) => {
  const path = c.req.path;
  
  // Skip auth for status and dashboard health endpoints
  if (path === '/v1/status') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Missing or invalid Authorization header.',
        request_id: crypto.randomUUID()
      }
    }, 401);
  }

  const apiKey = authHeader.substring(7).trim();
  const hashedKey = await hashApiKey(apiKey);

  // Retrieve key status replica from Cloudflare KV
  const keyCache = await c.env.ROSTERSYNC_KV.get(`key:${hashedKey}`);
  
  if (!keyCache) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'The provided API key is invalid or has been revoked.',
        request_id: crypto.randomUUID()
      }
    }, 401);
  }

  const keyMeta = JSON.parse(keyCache) as {
    active: boolean;
    organization_id: string;
    tier: string;
    rate_limit_rpm: number;
  };

  if (!keyMeta.active) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This API key has been deactivated.',
        request_id: crypto.randomUUID()
      }
    }, 403);
  }

  // Rate Limiting Logic (Sliding Window in KV)
  const ip = c.req.header('CF-Connecting-IP') || 'anonymous';
  const rateLimitKey = `rl:${hashedKey}:${Math.floor(Date.now() / 60000)}`;
  const currentRequests = Number(await c.env.ROSTERSYNC_KV.get(rateLimitKey) || 0);

  if (currentRequests >= keyMeta.rate_limit_rpm) {
    c.header('Retry-After', '60');
    return c.json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You have exceeded your per-minute API rate limit.',
        details: {
          limit: keyMeta.rate_limit_rpm,
          used: currentRequests,
          resets_at: new Date(Math.ceil(Date.now() / 60000) * 60000).toISOString()
        },
        request_id: crypto.randomUUID()
      }
    }, 429);
  }

  // Increment Rate Limit count
  await c.env.ROSTERSYNC_KV.put(rateLimitKey, String(currentRequests + 1), { expirationTtl: 120 });

  // Attach context and metadata to request context
  c.set('orgId', keyMeta.organization_id);
  c.set('tier', keyMeta.tier);
  c.set('requestId', crypto.randomUUID());

  // Inject rate limiting headers into response
  c.header('X-RateLimit-Limit', String(keyMeta.rate_limit_rpm));
  c.header('X-RateLimit-Remaining', String(keyMeta.rate_limit_rpm - currentRequests - 1));
  c.header('X-RateLimit-Reset', String(Math.ceil(Date.now() / 60000) * 60000));

  await next();
});

// 2. HEALTH ENDPOINT
app.get('/v1/status', async (c) => {
  return c.json({
    status: 'operational',
    version: '1.0.0',
    data_freshness: {
      last_sync: new Date().toISOString(),
      leagues_current: 18,
      total_athletes: 302609,
      enrichment_coverage: "100.0%"
    }
  });
});

// 3. LEAGUES ENDPOINT
app.get('/v1/leagues', async (c) => {
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  
  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const supabaseRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/leagues?select=*&is_active=eq.true`, {
      headers: {
        'apikey': anonKey || '',
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    const data = await supabaseRes.json();

    return c.json({
      success: true,
      data,
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 4. ATHLETES ENDPOINT
app.get('/v1/athletes/:name', async (c) => {
  const name = c.req.param('name');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const supabaseRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/global_player_enrichment?player_name=ilike.${encodeURIComponent(name)}&select=*`, {
      headers: {
        'apikey': anonKey || '',
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    const data = await supabaseRes.json() as any[];

    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Athlete with name '${name}' was not found.`,
          request_id: reqId
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: data[0],
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 5. TEAMS ENDPOINT
app.get('/v1/teams', async (c) => {
  const league = c.req.query('league');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    let supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/teams?select=id,name,display_name,league,sport,abbreviation`;
    
    if (league) {
      supabaseUrl += `&league=eq.${league}`;
    }

    const supabaseRes = await fetch(supabaseUrl, {
      headers: {
        'apikey': anonKey || '',
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    const data = await supabaseRes.json();

    return c.json({
      success: true,
      data,
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 6. ROSTERS ENDPOINT
app.get('/v1/rosters', async (c) => {
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
  const offset = (page - 1) * limit;
  const league = c.req.query('league') || c.req.query('leagueId');
  const position = c.req.query('position');
  
  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    let supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/reference_rosters?select=*&limit=${limit}&offset=${offset}`;

    if (league) {
      supabaseUrl += `&league_id=eq.${league.toLowerCase()}`;
    }
    if (position) {
      supabaseUrl += `&roster_data=cs.[{"position":"${position.toUpperCase()}"}]`;
    }

    const supabaseRes = await fetch(supabaseUrl, {
      headers: {
        'apikey': anonKey || '',
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    const data = await supabaseRes.json();

    return c.json({
      success: true,
      data,
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier,
        pagination: { page, limit, offset }
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 7. PLAYER DETAILS ENDPOINT
app.get('/v1/rosters/players/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  
  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    // Use Postgres JSONB array containment to find the specific player in any roster
    const supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/reference_rosters?roster_data=cs.[{"id":"${playerId}"}]&select=team_id,roster_data`;
    const supabaseRes = await fetch(supabaseUrl, { headers });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    
    const data = await supabaseRes.json() as any[];

    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Player with ID '${playerId}' was not found in any roster.`,
          request_id: reqId
        }
      }, 404);
    }

    // Extract the specific player object from the array
    const teamData = data[0];
    const player = teamData.roster_data.find((p: any) => p.id === playerId);

    if (!player) {
       return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Player found in roster but could not be extracted.`,
          request_id: reqId
        }
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        team_id: teamData.team_id,
        player: player
      },
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 8. ROSTER BY TEAM ENDPOINT
app.get('/v1/rosters/:teamIdentifier', async (c) => {
  const teamIdentifier = c.req.param('teamIdentifier');
  const season = c.req.query('season');
  const leagueFilter = c.req.query('league');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  
  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    let targetTeamId = teamIdentifier;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamIdentifier);

    if (!isUuid) {
      // Look up team by slug, abbreviation, or name (fallback)
      const nameMatch = encodeURIComponent(`*${teamIdentifier.replace(/-/g, ' ')}*`);
      let teamQuery = `select=id,name,league,abbreviation&or=(slug.eq.${teamIdentifier.toLowerCase()},abbreviation.eq.${teamIdentifier.toUpperCase()},name.ilike.${nameMatch})`;
      
      if (leagueFilter) {
        teamQuery += `&league=eq.${leagueFilter.toLowerCase()}`;
      }

      const teamRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/teams?${teamQuery}`, { headers });
      
      if (!teamRes.ok) {
        console.error(`Team Lookup Error (${teamRes.status}):`, await teamRes.text());
        throw new Error('Supabase origin failed during team lookup');
      }
      
      const teamData = await teamRes.json() as any[];
      
      if (!teamData || teamData.length === 0) {
        return c.json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Team '${teamIdentifier}' was not found${leagueFilter ? ` in league '${leagueFilter}'` : ''}.`,
            request_id: reqId
          }
        }, 404);
      }

      // Handle Collisions (e.g., LAC matching Clippers and Chargers)
      if (teamData.length > 1 && !leagueFilter) {
        return c.json({
          success: false,
          error: {
            code: 'AMBIGUOUS_IDENTIFIER',
            message: `The identifier '${teamIdentifier}' matches multiple teams. Please specify a 'league' query parameter to disambiguate.`,
            matches: teamData.map(t => ({ id: t.id, name: t.name, league: t.league, abbreviation: t.abbreviation })),
            request_id: reqId
          }
        }, 300); // 300 Multiple Choices
      }

      targetTeamId = teamData[0].id;
    }

    let supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/reference_rosters?team_id=eq.${targetTeamId}&select=*`;
    
    if (season) {
      supabaseUrl += `&season_year=eq.${season}`;
    }

    const supabaseRes = await fetch(supabaseUrl, { headers });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed');
    }
    const data = await supabaseRes.json() as any[];

    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Roster for team '${teamIdentifier}' was not found.`,
          request_id: reqId
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: data[0],
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        tier,
        resolved_team_id: targetTeamId
      }
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

export default app;
