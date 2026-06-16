import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function clearQueue() {
  console.log('--- Clearing Pending Roster Enrichment Jobs ---');

  // Count before
  const { count: countBefore } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('task_type', 'roster_enrichment')
    .eq('status', 'pending');

  console.log(`Found ${countBefore} pending roster enrichment jobs.`);

  if (countBefore && countBefore > 0) {
    const { data, error } = await supabase
      .from('job_queue')
      .delete()
      .eq('task_type', 'roster_enrichment')
      .eq('status', 'pending')
      .select();

    if (error) {
      console.error('Error deleting jobs:', error);
    } else {
      console.log(`Successfully deleted ${data?.length || 0} pending roster enrichment jobs from the queue.`);
    }
  } else {
    console.log('No pending roster enrichment jobs to delete.');
  }
}

clearQueue();
