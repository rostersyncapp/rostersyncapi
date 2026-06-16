import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function estimateTime() {
  console.log('--- Estimating Remaining Sync Time ---');

  const { data: recentCompleted, error } = await supabase
    .from('job_queue')
    .select('completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error || !recentCompleted || recentCompleted.length < 2) {
    console.log('Not enough completed jobs to calculate velocity.');
    return;
  }

  // Filter out any entries without completed_at
  const times = recentCompleted
    .map(j => j.completed_at ? new Date(j.completed_at).getTime() : 0)
    .filter(t => t > 0);

  if (times.length < 2) {
    console.log('Not enough timestamps.');
    return;
  }

  // Calculate velocity: average duration between the most recent N completions
  const minTime = times[times.length - 1];
  const maxTime = times[0];
  const durationMs = maxTime - minTime;
  const jobsDone = times.length;

  const msPerJob = durationMs / (jobsDone - 1);
  const jobsPerMinute = 60000 / msPerJob;

  // Query remaining count
  const { count: remainingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'processing']);

  const minutesRemaining = (remainingCount || 0) / jobsPerMinute;

  console.log({
    jobsDoneInWindow: jobsDone,
    windowDurationSeconds: durationMs / 1000,
    jobsPerMinute: jobsPerMinute.toFixed(2),
    remainingJobs: remainingCount,
    estimatedMinutesRemaining: minutesRemaining.toFixed(2)
  });
}

estimateTime();
