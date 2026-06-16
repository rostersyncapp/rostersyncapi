import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  console.log('--- Querying exact counts by task_type & status ---');

  const combinations = [
    { type: 'roster_update', status: 'pending' },
    { type: 'roster_update', status: 'processing' },
    { type: 'roster_update', status: 'completed' },
    { type: 'roster_enrichment', status: 'pending' },
    { type: 'roster_enrichment', status: 'processing' },
    { type: 'roster_enrichment', status: 'completed' },
    { type: 'dam_connector', status: 'pending' },
    { type: 'dam_connector', status: 'processing' },
    { type: 'dam_connector', status: 'completed' },
  ];

  for (const comb of combinations) {
    const { count } = await supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('task_type', comb.type)
      .eq('status', comb.status);
    console.log(`${comb.type} [${comb.status}]: ${count}`);
  }
}

runCheck();
