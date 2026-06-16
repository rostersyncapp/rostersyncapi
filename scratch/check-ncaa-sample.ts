import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, external_id')
    .eq('league', 'ncaa')
    .limit(1)
    .single();

  if (!team) {
    console.log('No team found');
    return;
  }

  console.log('NCAA Football team:', team);

  const { data: roster } = await supabase
    .from('reference_rosters')
    .select('*')
    .eq('team_id', team.id)
    .eq('season_year', 2026)
    .single();

  console.log('Roster data sample:', roster ? {
    id: roster.id,
    team_id: roster.team_id,
    season: roster.season_year,
    last_sync: roster.last_sync_at,
    playerCount: roster.roster_data?.length,
    firstPlayer: roster.roster_data?.[0]
  } : 'No roster found');
}

runCheck();
