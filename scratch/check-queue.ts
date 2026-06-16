import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function checkQueue() {
  console.log('--- Checking Job Queue ---');

  const { count: pendingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: processingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');

  const { count: completedCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: failedCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  console.log({
    pendingCount,
    processingCount,
    completedCount,
    failedCount
  });

  // Get a few active jobs to see what's running
  const { data: activeJobs } = await supabase
    .from('job_queue')
    .select('*')
    .in('status', ['pending', 'processing'])
    .limit(5);
  console.log('Active jobs samples:', activeJobs);
}

checkQueue();
