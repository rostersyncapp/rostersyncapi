import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  const { count: totalCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true });

  const { data: firstJobs } = await supabase
    .from('job_queue')
    .select('created_at, task_type, payload')
    .order('created_at', { ascending: true })
    .limit(5);

  const { data: lastJobs } = await supabase
    .from('job_queue')
    .select('created_at, task_type, payload')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log({
    totalCount,
    firstJobs,
    lastJobs
  });
}

runCheck();
