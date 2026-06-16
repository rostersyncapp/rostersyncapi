import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  console.log('--- Checking rosters table for NCAA ---');
  
  const { data: ncaaRosters, error } = await supabase
    .from('rosters')
    .select('id, team_name, league, season_year, athlete_count')
    .ilike('league', '%ncaa%');
  
  console.log('NCAA rosters found in rosters table:', ncaaRosters, error);
}

runCheck();
