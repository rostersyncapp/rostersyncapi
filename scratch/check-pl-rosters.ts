import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeagues() {
  console.log('--- Checking Leagues in leagues table ---');

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('*');

  if (error) {
    console.error('Error fetching leagues:', error);
    return;
  }

  for (const league of (leagues || [])) {
    console.log(`- ID: "${league.id}", Name: "${league.name}"`);
  }
}

checkLeagues();
