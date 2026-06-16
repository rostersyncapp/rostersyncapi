import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function findLeagues() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('league');

  if (error) {
    console.error(error);
    return;
  }

  const matches: Record<string, number> = {};
  teams.forEach(t => {
    if (t.league && t.league.toLowerCase().includes('ncaa')) {
      matches[t.league] = (matches[t.league] || 0) + 1;
    }
  });

  console.log('NCAA-related leagues in teams table:', matches);
  
  // Let's also print total count
  let sum = 0;
  Object.values(matches).forEach(v => sum += v);
  console.log('Sum of NCAA-related teams:', sum);
}

findLeagues();
