import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNCAA() {
  console.log('--- Checking NCAA League Seasons ---');

  const { data: seasons, error: sErr } = await supabase
    .from('league_seasons')
    .select('*')
    .ilike('league_id', '%ncaa%');
  console.log('League seasons for NCAA:', seasons, sErr);
}

checkNCAA();
