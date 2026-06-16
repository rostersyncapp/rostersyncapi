import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function countTeams() {
  const { data: leagues, error } = await supabase
    .from('teams')
    .select('league');

  if (error) {
    console.error(error);
    return;
  }

  const counts: Record<string, number> = {};
  leagues.forEach(t => {
    counts[t.league] = (counts[t.league] || 0) + 1;
  });

  console.log('Team counts per league:', counts);
}

countTeams();
