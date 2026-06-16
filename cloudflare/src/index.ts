import { Hono } from 'hono';
import { encryptCredentials, decryptCredentials } from './utils/crypto';

type Bindings = {
  SUPABASE_URL: string;
  ROSTERSYNC_KV: KVNamespace;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DAM_ENCRYPTION_KEY?: string;
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
  
  // Skip auth for status, health, and webhook endpoints
  if (path === '/v1/status' || path === '/v1/webhooks/roster-change') {
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

// 4. ATHLETES ENDPOINT (Enriched Profile)
app.get('/v1/athletes/:identifier', async (c) => {
  const identifier = c.req.param('identifier');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    // 1. Try global_player_enrichment by player_id
    const enrichmentIdRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/global_player_enrichment?player_id=eq.${encodeURIComponent(identifier)}&select=*`, { headers });

    if (enrichmentIdRes.ok) {
      const data = await enrichmentIdRes.json() as any[];
      if (data && data.length > 0) {
        return c.json({
          success: true,
          data: data[0],
          meta: {
            request_id: reqId,
            timestamp: new Date().toISOString(),
            tier,
            _source: 'global_player_enrichment',
            match_method: 'player_id'
          }
        });
      }
    }

    // 2. Try global_player_enrichment by player_name (as fallback search)
    const enrichmentNameRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/global_player_enrichment?player_name=ilike.${encodeURIComponent(identifier)}&select=*`, { headers });

    if (enrichmentNameRes.ok) {
      const data = await enrichmentNameRes.json() as any[];
      if (data && data.length > 0) {
        return c.json({
          success: true,
          data: data[0],
          meta: {
            request_id: reqId,
            timestamp: new Date().toISOString(),
            tier,
            _source: 'global_player_enrichment',
            match_method: 'player_name'
          }
        });
      }
    }

    // 3. Fallback to reference_rosters basic data by player ID
    const rosterRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/reference_rosters?roster_data=cs.[{"id":"${identifier}"}]&select=roster_data`, { headers });

    if (rosterRes.ok) {
      const rosterData = await rosterRes.json() as any[];
      if (rosterData && rosterData.length > 0) {
        const player = rosterData[0].roster_data.find((p: any) => p.id === identifier);
        if (player) {
          return c.json({
            success: true,
            data: player,
            meta: {
              request_id: reqId,
              timestamp: new Date().toISOString(),
              tier,
              _source: 'reference_rosters',
              match_method: 'roster_data_id'
            }
          });
        }
      }
    }

    return c.json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Athlete with identifier '${identifier}' was not found in any source.`,
        request_id: reqId
      }
    }, 404);

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

// 4.2 ATHLETE INTELLIGENCE ENDPOINT
app.get('/v1/athletes/:id/intelligence', async (c) => {
  const playerId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    // Specifically fetch AI-generated fields
    const fields = 'phonetic_name,ipa_name,chinese_name,career_summary,color_commentary,stats_insight';
    const supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/global_player_enrichment?player_id=eq.${encodeURIComponent(playerId)}&select=${fields}`;
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
          message: `Intelligence data for athlete ID '${playerId}' was not found.`,
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

// 8.2 BROADCAST DYNAMIC EXPORT ENDPOINT
app.get('/v1/teams/:teamIdentifier/export', async (c) => {
  const teamIdentifier = c.req.param('teamIdentifier');
  const format = c.req.query('format'); // vizrt | ross | chyron
  const type = c.req.query('type'); // xml | json | csv
  const season = c.req.query('season'); // defaults to current year
  const leagueFilter = c.req.query('league');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  if (!format || !['vizrt', 'ross', 'chyron'].includes(format.toLowerCase())) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Query parameter 'format' must be 'vizrt', 'ross', or 'chyron'.",
        request_id: reqId
      }
    }, 400);
  }

  if (!type || !['xml', 'json', 'csv'].includes(type.toLowerCase())) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Query parameter 'type' must be 'xml', 'json', or 'csv'.",
        request_id: reqId
      }
    }, 400);
  }

  const seasonYear = season ? parseInt(season) : new Date().getFullYear();
  if (isNaN(seasonYear)) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Query parameter 'season' must be a valid integer year.",
        request_id: reqId
      }
    }, 400);
  }

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    // 1. Resolve Team ID, name, abbrev, logo_url, and branding colors
    let targetTeamId = teamIdentifier;
    let teamName = teamIdentifier;
    let teamAbbrev = teamIdentifier;
    let teamLogoUrl = '';
    let primaryColor = '';
    let secondaryColor = '';

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamIdentifier);

    if (isUuid) {
      const teamRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/teams?id=eq.${targetTeamId}&select=id,name,abbreviation,logo_url,primary_color,secondary_color`, { headers });
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
            message: `Team with ID '${teamIdentifier}' was not found.`,
            request_id: reqId
          }
        }, 404);
      }
      teamName = teamData[0].name;
      teamAbbrev = teamData[0].abbreviation;
      teamLogoUrl = teamData[0].logo_url || '';
      primaryColor = teamData[0].primary_color || '';
      secondaryColor = teamData[0].secondary_color || '';
    } else {
      const nameMatch = encodeURIComponent(`*${teamIdentifier.replace(/-/g, ' ')}*`);
      let teamQuery = `select=id,name,league,abbreviation,logo_url,primary_color,secondary_color&or=(slug.eq.${teamIdentifier.toLowerCase()},abbreviation.eq.${teamIdentifier.toUpperCase()},name.ilike.${nameMatch})`;
      
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

      if (teamData.length > 1 && !leagueFilter) {
        return c.json({
          success: false,
          error: {
            code: 'AMBIGUOUS_IDENTIFIER',
            message: `The identifier '${teamIdentifier}' matches multiple teams. Please specify a 'league' query parameter to disambiguate.`,
            matches: teamData.map(t => ({ id: t.id, name: t.name, league: t.league, abbreviation: t.abbreviation })),
            request_id: reqId
          }
        }, 300);
      }

      targetTeamId = teamData[0].id;
      teamName = teamData[0].name;
      teamAbbrev = teamData[0].abbreviation;
      teamLogoUrl = teamData[0].logo_url || '';
      primaryColor = teamData[0].primary_color || '';
      secondaryColor = teamData[0].secondary_color || '';
    }

    // 2. Fetch Reference Roster Record
    let supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/reference_rosters?team_id=eq.${targetTeamId}&season_year=eq.${seasonYear}&select=*`;
    const supabaseRes = await fetch(supabaseUrl, { headers });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed fetching roster');
    }
    const rosterRecords = await supabaseRes.json() as any[];

    if (!rosterRecords || rosterRecords.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Roster for team '${teamIdentifier}' and season '${seasonYear}' was not found.`,
          request_id: reqId
        }
      }, 404);
    }

    const rosterRecord = rosterRecords[0];
    const rawRoster = rosterRecord.roster_data as any[];

    // 3. Batch Lookup player phonetic names & multilingual fields from global_player_enrichment
    const enrichedPlayersMap = new Map<string, { phonetic_name?: string; ipa_name?: string; chinese_name?: string; hardware_safe_name?: string }>();
    if (rawRoster && rawRoster.length > 0) {
      const playerIds = rawRoster.map(p => p.id).filter(Boolean);
      
      if (playerIds.length > 0) {
        const idsQuery = playerIds.map(id => `"${id}"`).join(',');
        const enrichmentUrl = `${c.env.SUPABASE_URL}/rest/v1/global_player_enrichment?player_id=in.(${idsQuery})&select=player_id,phonetic_name,ipa_name,chinese_name,hardware_safe_name`;
        const enrichmentRes = await fetch(enrichmentUrl, { headers });
        if (enrichmentRes.ok) {
          const enrichments = await enrichmentRes.json() as any[];
          if (enrichments) {
            enrichments.forEach(item => {
              if (item.player_id) {
                enrichedPlayersMap.set(item.player_id, {
                  phonetic_name: item.phonetic_name || '',
                  ipa_name: item.ipa_name || '',
                  chinese_name: item.chinese_name || '',
                  hardware_safe_name: item.hardware_safe_name || ''
                });
              }
            });
          }
        }
      }
    }

    // 4. Merge metadata
    const finalRoster = (rawRoster || []).map(p => {
      const nameParts = (p.name || p.fullName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const enrichment = enrichedPlayersMap.get(p.id);
      const phonetic = enrichment?.phonetic_name || p.name || p.fullName || '';
      const ipa = enrichment?.ipa_name || '';
      const chinese = enrichment?.chinese_name || '';
      const hardwareSafe = enrichment?.hardware_safe_name || p.name || p.fullName || '';

      return {
        id: p.id,
        jersey: p.jersey || p.jerseyNumber || '',
        first_name: firstName,
        last_name: lastName,
        full_name: p.name || p.fullName || '',
        position: p.position || '',
        phonetic_name: phonetic,
        ipa_name: ipa,
        chinese_name: chinese,
        hardware_safe_name: hardwareSafe
      };
    });

    const formatLower = format.toLowerCase();
    const typeLower = type.toLowerCase();

    // 5. Serialize based on format & type
    if (formatLower === 'vizrt') {
      if (typeLower === 'json') {
        const payload = {
          team: {
            id: targetTeamId,
            name: teamName,
            abbreviation: teamAbbrev,
            logo_url: teamLogoUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor
          },
          roster: finalRoster.map(p => ({
            player_id: p.id,
            jersey_number: p.jersey,
            first_name: p.first_name,
            last_name: p.last_name,
            position: p.position,
            phonetic_name: p.phonetic_name,
            ipa_name: p.ipa_name,
            chinese_name: p.chinese_name,
            hardware_safe_name: p.hardware_safe_name,
            is_active: true
          }))
        };
        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_vizrt.json"`
          }
        });
      } else if (typeLower === 'xml') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<tickerfeed version="2.4">\n`;
        xml += `  <team>\n`;
        xml += `    <id>${escapeXml(targetTeamId)}</id>\n`;
        xml += `    <name>${escapeXml(teamName)}</name>\n`;
        xml += `    <abbreviation>${escapeXml(teamAbbrev)}</abbreviation>\n`;
        xml += `    <logo_url>${escapeXml(teamLogoUrl)}</logo_url>\n`;
        xml += `    <primary_color>${escapeXml(primaryColor)}</primary_color>\n`;
        xml += `    <secondary_color>${escapeXml(secondaryColor)}</secondary_color>\n`;
        xml += `  </team>\n`;
        xml += `  <roster>\n`;
        finalRoster.forEach(p => {
          xml += `    <entry>\n`;
          xml += `      <field name="player_id">${escapeXml(p.id)}</field>\n`;
          xml += `      <field name="jersey_number">${escapeXml(p.jersey)}</field>\n`;
          xml += `      <field name="first_name">${escapeXml(p.first_name)}</field>\n`;
          xml += `      <field name="last_name">${escapeXml(p.last_name)}</field>\n`;
          xml += `      <field name="position">${escapeXml(p.position)}</field>\n`;
          xml += `      <field name="phonetic_name">${escapeXml(p.phonetic_name)}</field>\n`;
          xml += `      <field name="ipa_name">${escapeXml(p.ipa_name)}</field>\n`;
          xml += `      <field name="chinese_name">${escapeXml(p.chinese_name)}</field>\n`;
          xml += `      <field name="hardware_safe_name">${escapeXml(p.hardware_safe_name)}</field>\n`;
          xml += `      <field name="is_active">true</field>\n`;
          xml += `    </entry>\n`;
        });
        xml += `  </roster>\n`;
        xml += `</tickerfeed>\n`;
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_vizrt.xml"`
          }
        });
      } else if (typeLower === 'csv') {
        let csv = `player_id,jersey_number,first_name,last_name,position,phonetic_name,ipa_name,chinese_name,hardware_safe_name,is_active,team_name,team_abbreviation,team_logo_url,team_primary_color,team_secondary_color\n`;
        finalRoster.forEach(p => {
          csv += `${escapeCsv(p.id)},${escapeCsv(p.jersey)},${escapeCsv(p.first_name)},${escapeCsv(p.last_name)},${escapeCsv(p.position)},${escapeCsv(p.phonetic_name)},${escapeCsv(p.ipa_name)},${escapeCsv(p.chinese_name)},${escapeCsv(p.hardware_safe_name)},true,${escapeCsv(teamName)},${escapeCsv(teamAbbrev)},${escapeCsv(teamLogoUrl)},${escapeCsv(primaryColor)},${escapeCsv(secondaryColor)}\n`;
        });
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_vizrt.csv"`
          }
        });
      }
    } else if (formatLower === 'ross') {
      if (typeLower === 'json') {
        const payload = {
          team: {
            id: targetTeamId,
            name: teamName,
            abbreviation: teamAbbrev,
            logo_url: teamLogoUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor
          },
          players: finalRoster.map(p => ({
            player_id: p.id,
            jersey: p.jersey,
            first_name: p.first_name,
            last_name: p.last_name,
            position: p.position,
            phonetic_name: p.phonetic_name,
            ipa_name: p.ipa_name,
            chinese_name: p.chinese_name,
            hardware_safe_name: p.hardware_safe_name,
            is_active: true
          }))
        };
        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_ross.json"`
          }
        });
      } else if (typeLower === 'xml') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<Roster>\n`;
        xml += `  <Team>\n`;
        xml += `    <ID>${escapeXml(targetTeamId)}</ID>\n`;
        xml += `    <Name>${escapeXml(teamName)}</Name>\n`;
        xml += `    <Abbreviation>${escapeXml(teamAbbrev)}</Abbreviation>\n`;
        xml += `    <LogoURL>${escapeXml(teamLogoUrl)}</LogoURL>\n`;
        xml += `    <PrimaryColor>${escapeXml(primaryColor)}</PrimaryColor>\n`;
        xml += `    <SecondaryColor>${escapeXml(secondaryColor)}</SecondaryColor>\n`;
        xml += `  </Team>\n`;
        finalRoster.forEach(p => {
          xml += `  <Player jersey="${escapeXml(p.jersey)}">\n`;
          xml += `    <PlayerID>${escapeXml(p.id)}</PlayerID>\n`;
          xml += `    <FirstName>${escapeXml(p.first_name)}</FirstName>\n`;
          xml += `    <LastName>${escapeXml(p.last_name)}</LastName>\n`;
          xml += `    <Position>${escapeXml(p.position)}</Position>\n`;
          xml += `    <PhoneticName>${escapeXml(p.phonetic_name)}</PhoneticName>\n`;
          xml += `    <IPAName>${escapeXml(p.ipa_name)}</IPAName>\n`;
          xml += `    <ChineseName>${escapeXml(p.chinese_name)}</ChineseName>\n`;
          xml += `    <HardwareSafeName>${escapeXml(p.hardware_safe_name)}</HardwareSafeName>\n`;
          xml += `    <IsActive>true</IsActive>\n`;
          xml += `  </Player>\n`;
        });
        xml += `</Roster>\n`;
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_ross.xml"`
          }
        });
      } else if (typeLower === 'csv') {
        let csv = `player_id,jersey,first_name,last_name,position,phonetic_name,ipa_name,chinese_name,hardware_safe_name,is_active,team_name,team_abbrev,team_logo,team_primary_color,team_secondary_color\n`;
        finalRoster.forEach(p => {
          csv += `${escapeCsv(p.id)},${escapeCsv(p.jersey)},${escapeCsv(p.first_name)},${escapeCsv(p.last_name)},${escapeCsv(p.position)},${escapeCsv(p.phonetic_name)},${escapeCsv(p.ipa_name)},${escapeCsv(p.chinese_name)},${escapeCsv(p.hardware_safe_name)},true,${escapeCsv(teamName)},${escapeCsv(teamAbbrev)},${escapeCsv(teamLogoUrl)},${escapeCsv(primaryColor)},${escapeCsv(secondaryColor)}\n`;
        });
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_ross.csv"`
          }
        });
      }
    } else if (formatLower === 'chyron') {
      if (typeLower === 'json') {
        const payload = finalRoster.map(p => ({
          team_id: targetTeamId,
          team_name: teamName,
          team_abbreviation: teamAbbrev,
          team_logo_url: teamLogoUrl,
          team_primary_color: primaryColor,
          team_secondary_color: secondaryColor,
          player_id: p.id,
          jersey_number: p.jersey,
          first_name: p.first_name,
          last_name: p.last_name,
          position: p.position,
          phonetic_name: p.phonetic_name,
          ipa_name: p.ipa_name,
          chinese_name: p.chinese_name,
          hardware_safe_name: p.hardware_safe_name,
          is_active: true
        }));
        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_chyron.json"`
          }
        });
      } else if (typeLower === 'xml') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<root>\n`;
        xml += `  <team_id>${escapeXml(targetTeamId)}</team_id>\n`;
        xml += `  <team_name>${escapeXml(teamName)}</team_name>\n`;
        xml += `  <team_abbreviation>${escapeXml(teamAbbrev)}</team_abbreviation>\n`;
        xml += `  <team_logo_url>${escapeXml(teamLogoUrl)}</team_logo_url>\n`;
        xml += `  <team_primary_color>${escapeXml(primaryColor)}</team_primary_color>\n`;
        xml += `  <team_secondary_color>${escapeXml(secondaryColor)}</team_secondary_color>\n`;
        finalRoster.forEach(p => {
          xml += `  <row>\n`;
          xml += `    <player_id>${escapeXml(p.id)}</player_id>\n`;
          xml += `    <jersey_number>${escapeXml(p.jersey)}</jersey_number>\n`;
          xml += `    <first_name>${escapeXml(p.first_name)}</first_name>\n`;
          xml += `    <last_name>${escapeXml(p.last_name)}</last_name>\n`;
          xml += `    <position>${escapeXml(p.position)}</position>\n`;
          xml += `    <phonetic_name>${escapeXml(p.phonetic_name)}</phonetic_name>\n`;
          xml += `    <ipa_name>${escapeXml(p.ipa_name)}</ipa_name>\n`;
          xml += `    <chinese_name>${escapeXml(p.chinese_name)}</chinese_name>\n`;
          xml += `    <hardware_safe_name>${escapeXml(p.hardware_safe_name)}</hardware_safe_name>\n`;
          xml += `    <is_active>true</is_active>\n`;
          xml += `  </row>\n`;
        });
        xml += `</root>\n`;
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_chyron.xml"`
          }
        });
      } else if (typeLower === 'csv') {
        let csv = `team_id,team_name,team_abbreviation,team_logo_url,team_primary_color,team_secondary_color,player_id,jersey_number,first_name,last_name,position,phonetic_name,ipa_name,chinese_name,hardware_safe_name,is_active\n`;
        finalRoster.forEach(p => {
          csv += `${escapeCsv(targetTeamId)},${escapeCsv(teamName)},${escapeCsv(teamAbbrev)},${escapeCsv(teamLogoUrl)},${escapeCsv(primaryColor)},${escapeCsv(secondaryColor)},${escapeCsv(p.id)},${escapeCsv(p.jersey)},${escapeCsv(p.first_name)},${escapeCsv(p.last_name)},${escapeCsv(p.position)},${escapeCsv(p.phonetic_name)},${escapeCsv(p.ipa_name)},${escapeCsv(p.chinese_name)},${escapeCsv(p.hardware_safe_name)},true\n`;
        });
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${teamAbbrev}_roster_chyron.csv"`
          }
        });
      }
    }

    return c.json({
      success: false,
      error: {
        code: 'UNSUPPORTED_COMBINATION',
        message: 'The requested format/type combination is not supported.',
        request_id: reqId
      }
    }, 400);

  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 8.3 DELTA FEED ENDPOINT
app.get('/v1/changes', async (c) => {
  const since = c.req.query('since');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';

  let sinceTime: string;

  if (since) {
    const date = new Date(since);
    if (isNaN(date.getTime())) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Query parameter 'since' must be a valid ISO 8601 or date string.",
          request_id: reqId
        }
      }, 400);
    }
    sinceTime = date.toISOString();
  } else {
    // Default to last 24 hours
    sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  try {
    const anonKey = await c.env.ROSTERSYNC_KV.get('config:supabase_anon_key');
    const headers = {
      'apikey': anonKey || '',
      'Content-Type': 'application/json'
    };

    const supabaseUrl = `${c.env.SUPABASE_URL}/rest/v1/reference_rosters?updated_at=gt.${encodeURIComponent(sinceTime)}&select=team_id,league_id,season_year,updated_at`;
    const supabaseRes = await fetch(supabaseUrl, { headers });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Supabase origin failed fetching changes');
    }

    const data = await supabaseRes.json() as any[];

    return c.json({
      success: true,
      data: {
        changes: data.map(item => ({
          team_id: item.team_id,
          league_id: item.league_id,
          season_year: item.season_year,
          updated_at: item.updated_at
        }))
      },
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString(),
        since: sinceTime,
        tier
      }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An error occurred on the Supabase origin server.',
        request_id: reqId
      }
    }, 500);
  }
});

// 8.4 ATHLETE CORRECTIONS ENDPOINT
app.post('/v1/athletes/:id/corrections', async (c) => {
  const id = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  try {
    const body = await c.req.json();
    const { field, correction, reason } = body;

    const allowedFields = ['phonetic_name', 'ipa_name', 'chinese_name', 'hardware_safe_name'];

    if (!field || !allowedFields.includes(field)) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Field must be one of: ${allowedFields.join(', ')}`,
          request_id: reqId
        }
      }, 400);
    }

    if (!correction || typeof correction !== 'string' || correction.trim() === '') {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Correction value must be a non-empty string.",
          request_id: reqId
        }
      }, 400);
    }

    console.log(`[Correction] Athlete: ${id}, Field: ${field}, Value: ${correction}, Reason: ${reason || 'None'}`);

    if (orgId) {
      const serviceRoleKey = await getServiceRoleKey(c);
      const activityUrl = `${c.env.SUPABASE_URL}/rest/v1/activity_logs`;
      await fetch(activityUrl, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: orgId,
          action_type: 'ROSTER_UPDATE',
          description: `Correction submitted for athlete ${id} (${field} -> ${correction})`
        })
      });
    }

    return c.json({
      success: true,
      message: "Correction request logged successfully for review.",
      data: {
        athlete_id: id,
        field,
        correction,
        reason: reason || null
      },
      meta: {
        request_id: reqId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Invalid JSON request body.",
        request_id: reqId
      }
    }, 400);
  }
});

// Helper functions for XML and CSV escaping
function escapeXml(unsafe: string | number | undefined): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(unsafe: string | number | undefined): string {
  if (unsafe === undefined || unsafe === null) return '';
  const str = String(unsafe);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ==========================================
// 9. DAM INTEGRATION ENDPOINTS
// ==========================================

const PROVIDERS = [
  {
    id: 'catdv',
    name: 'CatDV',
    description: 'Quantum CatDV media asset management',
    auth_type: 'basic',
    required_fields: [
      { key: 'base_url', label: 'Server URL', type: 'url', placeholder: 'https://catdv.yourcompany.com' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' }
    ]
  },
  {
    id: 'iconik',
    name: 'Iconik',
    description: 'Backlight Iconik cloud DAM',
    auth_type: 'app_token',
    required_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'a1b2c3d4-...' },
      { key: 'auth_token', label: 'Auth Token', type: 'password' }
    ]
  },
  {
    id: 'webhook',
    name: 'Generic Webhook',
    description: 'Send signed JSON payloads to any HTTPS endpoint',
    auth_type: 'hmac',
    required_fields: [
      { key: 'endpoint_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.yourcompany.com/roster' }
    ]
  }
];

async function getEncryptionKey(c: any): Promise<string> {
  return c.env.DAM_ENCRYPTION_KEY || 
         await c.env.ROSTERSYNC_KV.get('config:dam_encryption_key') || 
         'default-dam-encryption-key-32-chars-long!';
}

async function getServiceRoleKey(c: any): Promise<string> {
  return c.env.SUPABASE_SERVICE_ROLE_KEY || 
         await c.env.ROSTERSYNC_KV.get('config:supabase_service_role_key') || 
         '';
}

async function extractSessionToken(response: Response): Promise<string | null> {
  try {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/JSESSIONID=([^;]+)/i);
      if (match) return match[1];
    }

    const body = await response.json() as any;
    if (body) {
      const token = body.data?.jsessionid || body.jsessionid || body.data?.sessionToken || body.sessionToken;
      if (token) return token;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function resolveCatDVEndpoint(
  baseUrl: string,
  path: string,
  options: RequestInit
): Promise<{ response: Response; resolvedUrl: string; sessionToken: string | null }> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl
    .replace(/\/api\/v1\/(login|session)\/?$/, '')
    .replace(/\/api\/(login|session)\/?$/, '')
    .replace(/\/(login|session)\/?$/, '');

  const candidates = [
    normalizedBaseUrl,
    normalizedBaseUrl.replace(/\/server\/?$/, ''),
    normalizedBaseUrl.endsWith('/') ? normalizedBaseUrl + 'catdv' : normalizedBaseUrl + '/catdv',
  ];

  const pathVariations = [cleanPath];
  if (cleanPath.startsWith('/api/v1/')) {
    const suffix = cleanPath.substring(7); // e.g. /login or /fields
    pathVariations.push(
      `/api/9${suffix}`,
      `/api/8${suffix}`,
      `/api/7${suffix}`,
      `/api${suffix}`,
      `/api/v2${suffix}`
    );
  }

  let lastError: any = null;
  for (const p of pathVariations) {
    for (const base of candidates) {
      const targetUrl = `${base}${p}`;
      try {
        console.log(`[CatDV Probe] Trying URL: ${targetUrl}`);
        const res = await fetch(targetUrl, options);
        if (res.ok) {
          const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
          return { response: res, resolvedUrl: targetUrl, sessionToken };
        }
        if (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503) {
          const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
          return { response: res, resolvedUrl: targetUrl, sessionToken };
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (cleanPath.endsWith('/login') || cleanPath.endsWith('/session')) {
    // Try POST/GET to /session versioned
    const sessionVariations = pathVariations.map(p => p.replace(/\/(login|session)$/, '/session'));
    for (const p of sessionVariations) {
      for (const base of candidates) {
        const targetUrl = `${base}${p}`;
        try {
          console.log(`[CatDV Session Probe] Trying URL: ${targetUrl}`);
          const res = await fetch(targetUrl, options);
          if (res.ok || (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503)) {
            const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
            return { response: res, resolvedUrl: targetUrl, sessionToken };
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    // Try GET to /session?usr=...&pwd=... versioned
    let username = '';
    let password = '';
    const authHeader = (options.headers as any)?.['Authorization'] || (options.headers as any)?.['authorization'];
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const base64Str = authHeader.substring(6);
        const credentialsStr = atob(base64Str);
        const parts = credentialsStr.split(':');
        username = parts[0];
        password = parts.slice(1).join(':');
      } catch (e) {
        // ignore
      }
    }

    if (username && password) {
      const queryVariations = sessionVariations.map(p => `${p}?usr=${encodeURIComponent(username)}&pwd=${encodeURIComponent(password)}`);
      for (const p of queryVariations) {
        for (const base of candidates) {
          const targetUrl = `${base}${p}`;
          try {
            console.log(`[CatDV Query Session Probe] Trying URL: ${targetUrl}`);
            const res = await fetch(targetUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            if (res.ok || (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503)) {
              const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
              return { response: res, resolvedUrl: targetUrl, sessionToken };
            }
          } catch (err) {
            lastError = err;
          }
        }
      }
    }
  }

  throw lastError || new Error(`CatDV resource not found (404) at any of the candidate endpoints under ${baseUrl}`);
}

async function getMaskedCredentials(conn: any, encryptionKey: string): Promise<Record<string, string>> {
  if (!conn.credentials_encrypted || !conn.credentials_iv) {
    return {};
  }
  try {
    const decrypted = await decryptCredentials(conn.credentials_encrypted, conn.credentials_iv, encryptionKey);
    const masked: Record<string, string> = {};
    for (const key in decrypted) {
      masked[key] = '********';
    }
    return masked;
  } catch (err) {
    const providerInfo = PROVIDERS.find(p => p.id === conn.provider);
    const masked: Record<string, string> = {};
    if (providerInfo) {
      providerInfo.required_fields.forEach(f => {
        masked[f.key] = '********';
      });
    }
    return masked;
  }
}

// 9.1 Providers list
app.get('/v1/integrations/providers', async (c) => {
  return c.json({
    success: true,
    data: PROVIDERS
  });
});

// 9.2 Create Connection
app.post('/v1/integrations', async (c) => {
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const body = await c.req.json();
    const { name, provider, credentials, base_url, endpoint_url, field_mapping, events, leagues, teams, active } = body;

    if (!name || !provider || !credentials) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: name, provider, or credentials.', request_id: reqId }
      }, 422);
    }

    const providerInfo = PROVIDERS.find(p => p.id === provider);
    if (!providerInfo) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Unsupported provider: '${provider}'.`, request_id: reqId }
      }, 422);
    }

    for (const field of providerInfo.required_fields) {
      if (!credentials[field.key]) {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Missing required credential field: '${field.key}' for provider '${provider}'.`, request_id: reqId }
        }, 422);
      }
    }

    const encryptionKey = await getEncryptionKey(c);
    const { encrypted, iv } = await encryptCredentials(credentials, encryptionKey);

    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        organization_id: orgId,
        name,
        provider,
        credentials_encrypted: encrypted,
        credentials_iv: iv,
        base_url: base_url || null,
        endpoint_url: endpoint_url || null,
        field_mapping: field_mapping || {},
        events: events || [],
        leagues: leagues || [],
        teams: teams || [],
        active: active !== undefined ? active : false
      })
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Failed to insert connection into Supabase');
    }

    const insertedData = await supabaseRes.json() as any[];
    const connection = insertedData[0];

    const maskedCreds = await getMaskedCredentials(connection, encryptionKey);
    const { credentials_encrypted, credentials_iv, organization_id, ...rest } = connection;

    return c.json({
      success: true,
      data: {
        ...rest,
        credentials: maskedCreds
      },
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    }, 201);

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.3 List Connections
app.get('/v1/integrations', async (c) => {
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error(`Supabase Error (${supabaseRes.status}):`, errorText);
      throw new Error('Failed to retrieve connections from Supabase');
    }

    const data = await supabaseRes.json() as any[];
    const encryptionKey = await getEncryptionKey(c);

    const formattedData = await Promise.all(data.map(async (conn) => {
      const maskedCreds = await getMaskedCredentials(conn, encryptionKey);
      const { credentials_encrypted, credentials_iv, organization_id, ...rest } = conn;
      return {
        ...rest,
        credentials: maskedCreds
      };
    }));

    return c.json({
      success: true,
      data: formattedData,
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.4 Get Connection Details
app.get('/v1/integrations/:id', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const data = await supabaseRes.json() as any[];
    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const connection = data[0];
    const encryptionKey = await getEncryptionKey(c);
    const maskedCreds = await getMaskedCredentials(connection, encryptionKey);
    const { credentials_encrypted, credentials_iv, organization_id, ...rest } = connection;

    return c.json({
      success: true,
      data: {
        ...rest,
        credentials: maskedCreds
      },
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.5 Update Connection
app.patch('/v1/integrations/:id', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const existingRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!existingRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const existingData = await existingRes.json() as any[];
    if (!existingData || existingData.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const existingConnection = existingData[0];
    const body = await c.req.json();
    const updatePayload: Record<string, any> = {};

    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.base_url !== undefined) updatePayload.base_url = body.base_url;
    if (body.endpoint_url !== undefined) updatePayload.endpoint_url = body.endpoint_url;
    if (body.field_mapping !== undefined) updatePayload.field_mapping = body.field_mapping;
    if (body.events !== undefined) updatePayload.events = body.events;
    if (body.leagues !== undefined) updatePayload.leagues = body.leagues;
    if (body.teams !== undefined) updatePayload.teams = body.teams;
    if (body.active !== undefined) updatePayload.active = body.active;
    updatePayload.updated_at = new Date().toISOString();

    const encryptionKey = await getEncryptionKey(c);

    if (body.credentials !== undefined) {
      const provider = existingConnection.provider;
      const providerInfo = PROVIDERS.find(p => p.id === provider);
      
      if (providerInfo) {
        for (const field of providerInfo.required_fields) {
          if (!body.credentials[field.key]) {
            return c.json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: `Missing required credential field: '${field.key}' for provider '${provider}'.`, request_id: reqId }
            }, 422);
          }
        }
      }

      const { encrypted, iv } = await encryptCredentials(body.credentials, encryptionKey);
      updatePayload.credentials_encrypted = encrypted;
      updatePayload.credentials_iv = iv;
    }

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      throw new Error('Failed to update connection');
    }

    const updatedData = await updateRes.json() as any[];
    const updatedConnection = updatedData[0];
    const maskedCreds = await getMaskedCredentials(updatedConnection, encryptionKey);
    const { credentials_encrypted, credentials_iv, organization_id, ...rest } = updatedConnection;

    return c.json({
      success: true,
      data: {
        ...rest,
        credentials: maskedCreds
      },
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.6 Delete Connection
app.delete('/v1/integrations/:id', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const existingRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!existingRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const existingData = await existingRes.json() as any[];
    if (!existingData || existingData.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteRes.ok) {
      throw new Error('Failed to delete connection');
    }

    return c.json({
      success: true,
      message: `Integration connection '${connectionId}' was successfully deleted.`,
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.7 Test Connection
app.post('/v1/integrations/:id/test', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const connRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const data = await connRes.json() as any[];
    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const connection = data[0];
    const encryptionKey = await getEncryptionKey(c);

    let credentials: Record<string, string>;
    try {
      credentials = await decryptCredentials(connection.credentials_encrypted, connection.credentials_iv, encryptionKey);
    } catch (e) {
      return c.json({
        success: false,
        error: { code: 'DECRYPTION_ERROR', message: 'Failed to decrypt credentials for testing.', request_id: reqId }
      }, 400);
    }

    let testSuccess = false;
    let errorMessage = '';

    if (connection.provider === 'iconik') {
      const appId = credentials.app_id;
      const authToken = credentials.auth_token;
      const baseUrl = connection.base_url || 'https://app.iconik.io';

      try {
        const iconikRes = await fetch(`${baseUrl}/api/users/v1/users/`, {
          headers: {
            'App-Id': appId,
            'Auth-Token': authToken,
            'Accept': 'application/json'
          }
        });
        if (iconikRes.ok) {
          testSuccess = true;
        } else {
          errorMessage = `Iconik API returned status ${iconikRes.status}: ${await iconikRes.text()}`;
        }
      } catch (err: any) {
        errorMessage = `Failed to connect to Iconik: ${err.message}`;
      }

    } else if (connection.provider === 'catdv') {
      const baseUrl = connection.base_url;
      const username = credentials.username;
      const password = credentials.password;

      if (!baseUrl) {
        errorMessage = 'CatDV requires a Server URL.';
      } else {
        try {
          const authString = btoa(`${username}:${password}`);
          const authHeader = `Basic ${authString}`;
          const { response: catdvRes } = await resolveCatDVEndpoint(baseUrl, '/api/v1/login', {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });
          if (catdvRes.ok) {
            testSuccess = true;
          } else {
            errorMessage = `CatDV API returned status ${catdvRes.status}: ${await catdvRes.text()}`;
          }
        } catch (err: any) {
          errorMessage = `Failed to connect to CatDV: ${err.message}`;
        }
      }

    } else if (connection.provider === 'webhook') {
      const endpointUrl = connection.endpoint_url;
      if (!endpointUrl) {
        errorMessage = 'Webhook connection requires a Webhook URL.';
      } else {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          const payload = {
            event: 'ping',
            timestamp: new Date().toISOString(),
            connection_id: connection.id
          };

          const secretKey = credentials.secret_key;
          if (secretKey) {
            const encoder = new TextEncoder();
            const payloadBytes = encoder.encode(JSON.stringify(payload));
            const keyBytes = encoder.encode(secretKey);
            const cryptoKey = await crypto.subtle.importKey(
              'raw',
              keyBytes,
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const signatureBuffer = await crypto.subtle.sign(
              'HMAC',
              cryptoKey,
              payloadBytes
            );
            const signatureArray = Array.from(new Uint8Array(signatureBuffer));
            const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
            headers['X-Webhook-Signature'] = signatureHex;
          }

          const webhookRes = await fetch(endpointUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });

          if (webhookRes.ok || webhookRes.status === 200 || webhookRes.status === 204) {
            testSuccess = true;
          } else {
            errorMessage = `Webhook returned status ${webhookRes.status}`;
          }
        } catch (err: any) {
          errorMessage = `Failed to connect to Webhook URL: ${err.message}`;
        }
      }
    }

    const updatePayload: Record<string, any> = {
      active: testSuccess,
      last_error: testSuccess ? null : errorMessage,
      updated_at: new Date().toISOString()
    };

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      console.warn(`Failed to update connection status in Supabase after testing:`, await updateRes.text());
    }

    return c.json({
      success: true,
      data: {
        active: testSuccess,
        last_error: testSuccess ? null : errorMessage
      },
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.8 Trigger Sync
app.post('/v1/integrations/:id/sync', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const connRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const data = await connRes.json() as any[];
    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const connection = data[0];
    if (!connection.active) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot sync inactive integration. Please test connection successfully first.', request_id: reqId }
      }, 400);
    }

    const enqueueRes = await fetch(`${supabaseUrl}/rest/v1/job_queue`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        task_type: 'dam_connector',
        payload: {
          connection_id: connectionId,
          organization_id: orgId,
          sync_type: 'manual_full_sync'
        }
      })
    });

    if (!enqueueRes.ok) {
      throw new Error('Failed to enqueue sync job');
    }

    const jobData = await enqueueRes.json() as any[];
    const job = jobData[0];

    return c.json({
      success: true,
      message: `Manual full sync has been triggered. Job ID: ${job.id}`,
      data: {
        job_id: job.id,
        status: job.status
      },
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.9 Get Deliveries History
app.get('/v1/integrations/:id/deliveries', async (c) => {
  const connectionId = c.req.param('id');
  const reqId = c.get('requestId') || crypto.randomUUID();
  const tier = c.get('tier') || 'free';
  const orgId = c.get('orgId');

  if (!orgId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized access.', request_id: reqId }
    }, 403);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    const connRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?id=eq.${connectionId}&organization_id=eq.${orgId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connRes.ok) {
      throw new Error('Failed to retrieve connection');
    }

    const data = await connRes.json() as any[];
    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Integration connection '${connectionId}' was not found.`, request_id: reqId }
      }, 404);
    }

    const logRes = await fetch(`${supabaseUrl}/rest/v1/dam_delivery_log?connection_id=eq.${connectionId}&order=created_at.desc&limit=100`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!logRes.ok) {
      throw new Error('Failed to retrieve delivery logs');
    }

    const logs = await logRes.json();

    return c.json({
      success: true,
      data: logs,
      meta: { request_id: reqId, timestamp: new Date().toISOString(), tier }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

// 9.10 Supabase Roster Change Webhook
app.post('/v1/webhooks/roster-change', async (c) => {
  const reqId = crypto.randomUUID();
  const signature = c.req.header('x-supabase-signature') || c.req.header('X-Supabase-Signature');
  const secretHeader = c.req.header('x-supabase-secret') || c.req.header('X-Supabase-Secret');
  const webhookSecret = c.env.ROSTER_WEBHOOK_SECRET || c.env.SUPABASE_SERVICE_ROLE_KEY;

  const bodyText = await c.req.text();


  // 1. Signature/Secret Verification
  if (webhookSecret) {
    let verified = false;
    if (signature) {
      try {
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(webhookSecret);
        const dataBytes = encoder.encode(bodyText);
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBytes,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signatureBuffer = await crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          dataBytes
        );
        const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        verified = (signature === expectedSignature);
      } catch (err: any) {
        console.error('[Webhook] HMAC signature verification failed:', err.message);
      }
    } else if (secretHeader) {
      verified = (secretHeader === webhookSecret);
    }

    if (!verified) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature or secret.', request_id: reqId }
      }, 401);
    }
  }

  // 2. Parse payload
  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch (err) {
    return c.json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid JSON payload.', request_id: reqId }
    }, 400);
  }

  const { type, table, record } = payload;

  if (table !== 'reference_rosters') {
    return c.json({
      success: false,
      error: { code: 'BAD_REQUEST', message: `Unsupported table: ${table}`, request_id: reqId }
    }, 400);
  }

  // Ignore DELETE or non-UPSERT actions
  if (type !== 'INSERT' && type !== 'UPDATE') {
    return c.json({
      success: true,
      message: `Ignored webhook action: ${type}`
    });
  }

  if (!record) {
    return c.json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Missing record details.', request_id: reqId }
    }, 400);
  }

  const { team_id, league_id, season_year } = record;

  if (!team_id || !league_id || !season_year) {
    return c.json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Missing team_id, league_id, or season_year in record.', request_id: reqId }
    }, 400);
  }

  try {
    const serviceRoleKey = await getServiceRoleKey(c);
    const supabaseUrl = c.env.SUPABASE_URL;

    // 3. Query active dam_connections that match this roster's scope
    const connRes = await fetch(`${supabaseUrl}/rest/v1/dam_connections?active=eq.true`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connRes.ok) {
      throw new Error(`Failed to query active dam_connections (Status: ${connRes.status})`);
    }

    const connections = await connRes.json() as any[];
    const matchingConnections = connections.filter(conn => {
      // Check league scope
      if (conn.leagues && conn.leagues.length > 0) {
        if (!conn.leagues.includes(league_id)) {
          return false;
        }
      }
      // Check team scope
      if (conn.teams && conn.teams.length > 0) {
        if (!conn.teams.includes(team_id)) {
          return false;
        }
      }
      return true;
    });

    if (matchingConnections.length === 0) {
      return c.json({
        success: true,
        message: 'No matching active DAM connections found for this roster scope.',
        data: { enqueued_jobs: 0 }
      });
    }

    // 4. Enqueue job_queue records
    const enqueuedJobs: string[] = [];
    for (const conn of matchingConnections) {
      const enqueueRes = await fetch(`${supabaseUrl}/rest/v1/job_queue`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          task_type: 'dam_connector',
          payload: {
            connection_id: conn.id,
            organization_id: conn.organization_id,
            team_id: team_id,
            season_year: season_year,
            sync_type: 'auto_delta_sync'
          }
        })
      });

      if (enqueueRes.ok) {
        const jobData = await enqueueRes.json() as any[];
        if (jobData && jobData[0]) {
          enqueuedJobs.push(jobData[0].id);
        }
      } else {
        console.error(`[Webhook] Failed to enqueue job for connection ${conn.id}:`, await enqueueRes.text());
      }
    }

    return c.json({
      success: true,
      message: `Roster change processed. Enqueued ${enqueuedJobs.length} sync jobs.`,
      data: {
        enqueued_jobs: enqueuedJobs.length,
        job_ids: enqueuedJobs
      }
    });

  } catch (err: any) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message || 'An error occurred.', request_id: reqId }
    }, 500);
  }
});

export default app;
