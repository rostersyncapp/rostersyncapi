import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function confirmRosters() {
  console.log('--- Confirming NCAA Rosters in Database ---');

  // Fetch all NCAA teams
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('id, name, league')
    .ilike('league', '%ncaa%');

  if (tErr || !teams) {
    console.error('Error fetching teams:', tErr);
    return;
  }

  const ncaaTeamIds = new Set(teams.map(t => t.id));
  console.log(`Total NCAA teams defined in 'teams' table: ${teams.length}`);

  // Fetch all 2026 rosters (selectively paginated or simple fetch if total count is low)
  const { count: totalRosters2026 } = await supabase
    .from('reference_rosters')
    .select('*', { count: 'exact', head: true })
    .eq('season_year', 2026);

  console.log(`Total 2026 rosters in reference_rosters table (all leagues): ${totalRosters2026}`);

  // Fetch all 2026 rosters in chunks of 1000
  const allRosters: any[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('reference_rosters')
      .select('team_id, roster_data')
      .eq('season_year', 2026)
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) {
      break;
    }
    allRosters.push(...data);
    offset += limit;
  }

  console.log(`Successfully fetched ${allRosters.length} rosters for 2026.`);

  // Filter to NCAA teams
  const ncaaRosters = allRosters.filter(r => ncaaTeamIds.has(r.team_id));
  console.log(`NCAA rosters found for 2026: ${ncaaRosters.length}`);

  let validRosterCount = 0;
  let emptyRosterCount = 0;
  let totalPlayers = 0;

  ncaaRosters.forEach(r => {
    const players = Array.isArray(r.roster_data) ? r.roster_data : [];
    if (players.length > 0) {
      validRosterCount++;
      totalPlayers += players.length;
    } else {
      emptyRosterCount++;
    }
  });

  console.log({
    totalNcaaTeams: teams.length,
    rosterRowsFound: ncaaRosters.length,
    validRostersWithPlayers: validRosterCount,
    emptyRosters: emptyRosterCount,
    totalAthletesIngested: totalPlayers
  });

  // Teams completely missing rosters
  const teamsWithRosters = new Set(ncaaRosters.map(r => r.team_id));
  const missingTeams = teams.filter(t => !teamsWithRosters.has(t.id));
  console.log(`NCAA Teams missing reference_roster rows: ${missingTeams.length}`);
  if (missingTeams.length > 0) {
    console.log('Sample missing teams:', missingTeams.slice(0, 5));
  }
}

confirmRosters();
