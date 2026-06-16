import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  console.log('--- Checking global_player_enrichment ---');
  
  const { count, error } = await supabase
    .from('global_player_enrichment')
    .select('*', { count: 'exact', head: true });
  console.log('Total players in global_player_enrichment:', count, error);

  // Check if any refer to NCAA teams or if there are any players at all
  if (count && count > 0) {
    const { data: samples } = await supabase
      .from('global_player_enrichment')
      .select('*')
      .limit(10);
    console.log('Sample players in global_player_enrichment:', samples);
  }
}

runCheck();
