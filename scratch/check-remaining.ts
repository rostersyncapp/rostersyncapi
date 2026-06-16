import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRemaining() {
  const { data: recentJobs, error } = await supabase
    .from('job_queue')
    .select('updated_at')
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !recentJobs || recentJobs.length < 2) {
    console.log('Not enough completed jobs.');
    return;
  }

  const newest = new Date(recentJobs[0].updated_at).getTime();
  const oldest = new Date(recentJobs[recentJobs.length - 1].updated_at).getTime();
  const diffMs = newest - oldest;
  const jobsDone = recentJobs.length - 1;
  const rateMsPerJob = diffMs / jobsDone;

  const { count: pendingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: processingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');

  const totalRemaining = (pendingCount || 0) + (processingCount || 0);
  const estRemainingMs = (totalRemaining * rateMsPerJob) / 5;
  const estMinutes = Math.floor(estRemainingMs / 60000);
  const estSeconds = Math.round((estRemainingMs % 60000) / 1000);
  
  console.log(`REMAINING_JOBS:${totalRemaining}`);
  console.log(`EST_TIME:${estMinutes}m ${estSeconds}s`);
  console.log(`RATE_PER_JOB:${(rateMsPerJob/1000).toFixed(2)}`);
}

checkRemaining();
