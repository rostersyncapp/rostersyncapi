import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, external_id, league')
    .ilike('name', '%clem%');

  console.log('Clemson matches in DB:', teams);
}

runCheck();
