import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function verifySync() {
  console.log('--- Verifying Active Savings for NCAA History ---');

  const nowUTC = new Date();
  // Set filter time to 5 minutes ago
  const filterTime = new Date(nowUTC.getTime() - 5 * 60 * 1000).toISOString();
  console.log(`Checking for records synced since: ${filterTime}`);

  const { data: recentHistoricalRosters, error } = await supabase
    .from('reference_rosters')
    .select('team_id, season_year, last_sync_at, roster_data')
    .gt('last_sync_at', filterTime)
    .lt('season_year', 2026)
    .order('last_sync_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching rosters:', error);
    return;
  }

  console.log(`Rosters saved in the last 5 minutes: ${recentHistoricalRosters?.length || 0}`);
  
  if (recentHistoricalRosters && recentHistoricalRosters.length > 0) {
    for (const r of recentHistoricalRosters) {
      // Get team name
      const { data: team } = await supabase
        .from('teams')
        .select('name, league')
        .eq('id', r.team_id)
        .maybeSingle();

      console.log(`- Team: ${team?.name || 'Unknown'} (${team?.league || 'N/A'}), Season: ${r.season_year}, Saved At: ${r.last_sync_at}, Players: ${r.roster_data?.length || 0}`);
    }
  } else {
    console.log('No historical rosters from the active run found yet in the DB.');
  }
}

verifySync();
