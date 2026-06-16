import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRosters() {
  console.log('--- Checking all 2026 (2025-26) rosters for name fields ---');

  const { data: rosters, error } = await supabase
    .from('reference_rosters')
    .select('id, team_id, league_id, season_year, roster_data')
    .eq('season_year', 2026);

  if (error) {
    console.error('Error fetching rosters:', error);
    return;
  }

  console.log(`Found ${rosters?.length ?? 0} rosters in total for season 2026.`);
  let teamsWithMissingNames = 0;

  for (const roster of (rosters || [])) {
    const { data: team } = await supabase
      .from('teams')
      .select('name, display_name')
      .eq('id', roster.team_id)
      .maybeSingle();

    const teamName = team?.display_name || team?.name || 'Unknown';
    if (!Array.isArray(roster.roster_data)) {
      console.log(`❌ Team ${teamName} (${roster.league_id}): roster_data is not an array.`);
      continue;
    }

    let missingNameCount = 0;
    const samplePlayersWithNoName: any[] = [];
    
    for (const player of roster.roster_data) {
      const name = player.fullName ?? player.name;
      if (!name || name.trim() === '') {
        missingNameCount++;
        if (samplePlayersWithNoName.length < 3) {
          samplePlayersWithNoName.push(player);
        }
      }
    }

    if (missingNameCount > 0) {
      teamsWithMissingNames++;
      console.log(`❌ Team: ${teamName} (${roster.league_id}) - ${missingNameCount} / ${roster.roster_data.length} players have NO name.`);
      console.log('Samples:', JSON.stringify(samplePlayersWithNoName, null, 2));
    }
  }

  console.log(`\nScan complete. Teams with missing player names: ${teamsWithMissingNames} out of ${rosters?.length ?? 0}`);
}

checkRosters();
