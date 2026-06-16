'use server'

import { createClient } from '@/utils/supabase/server'

export async function getLeagues() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching leagues:', error)
    return []
  }
  return data ?? []
}

export async function getTeams(leagueId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('teams')
    .select('*')
    .order('name')

  if (leagueId) {
    query = query.eq('league', leagueId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching teams:', error)
    return []
  }
  return data ?? []
}

export async function getRosterWithEnrichment(teamId: string) {
  const supabase = await createClient()

  const [teamResult, rosterResult] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    supabase
      .from('reference_rosters')
      .select('*')
      .eq('team_id', teamId)
      .order('season_year', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (teamResult.error) {
    console.error('Error fetching team:', teamResult.error)
    return null
  }

  const team = teamResult.data
  const rosterData = rosterResult.data?.roster_data ?? []
  const seasonYear = rosterResult.data?.season_year ?? 2026

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const enrichedPlayers = await Promise.all(
    (rosterData as Array<{ id?: string; fullName?: string; name?: string; jersey?: string; jerseyNumber?: string; position?: string }>).map(async (player: any) => {
      const playerName = player.fullName ?? player.name ?? ''
      const { data: enrichment } = await supabaseAdmin
        .from('global_player_enrichment')
        .select('*')
        .eq('player_name', playerName)
        .maybeSingle()

      return {
        id: player.id ?? '',
        fullName: playerName,
        jersey: player.jersey ?? player.jerseyNumber ?? '--',
        position: player.position ?? '',
        phoneticSimplified: enrichment?.phonetic_name ?? null,
        nameMandarin: enrichment?.chinese_name ?? null,
        careerSummary: enrichment?.career_summary ?? null,
      }
    })
  )

  return {
    team,
    seasonYear,
    players: enrichedPlayers,
  }
}

export async function syncTeamRosterToDAMAction(teamId: string, season: number, targetConnectionId?: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Fetch active DAM connections for the user's organization
  let query = supabase
    .from('dam_connections')
    .select('id')
    .eq('organization_id', user.id)
    .eq('active', true);

  if (targetConnectionId) {
    query = query.eq('id', targetConnectionId);
  }

  const { data: connections, error: connError } = await query;

  if (connError) {
    console.error('Error fetching active DAM connections:', connError);
    throw new Error('Failed to fetch active integrations');
  }

  if (!connections || connections.length === 0) {
    throw new Error('No active DAM connections found. Please configure an integration in settings first.');
  }

  // Enqueue a job for each active connection
  const jobs = connections.map(conn => ({
    task_type: 'dam_connector',
    payload: {
      connection_id: conn.id,
      organization_id: user.id,
      team_id: teamId,
      season_year: season,
      sync_type: 'manual_team_sync'
    }
  }));

  const { error: queueError } = await supabase
    .from('job_queue')
    .insert(jobs);

  if (queueError) {
    console.error('Error enqueuing team sync job:', queueError);
    throw new Error('Failed to queue synchronization: ' + queueError.message);
  }

  return { success: true, enqueuedCount: jobs.length };
}

export async function getActiveDAMConnections() {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('dam_connections')
    .select('id, name, provider')
    .eq('organization_id', user.id)
    .eq('active', true);

  if (error) {
    console.error('Error fetching active connections:', error);
    return [];
  }

  return data ?? [];
}
