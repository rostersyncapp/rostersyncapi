import * as dotenv from 'dotenv';
dotenv.config();

// CRITICAL RLS BYPASS: Overwrite anon key with service role key for imported modules
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pollJobs() {
  console.log('🔄 Checking for pending dam_connector jobs in job_queue... (Dynamic Import)');
  
  // Dynamically import ConnectorAgent to ensure the RLS bypass has executed first
  const { ConnectorAgent } = await import('../services/agents/ConnectorAgent.ts');
  const connectorAgent = new ConnectorAgent(process.env.GEMINI_API_KEY || 'placeholder-key');

  while (true) {
    try {
      // Find one pending job
      const { data: job, error: fetchError } = await supabase
        .from('job_queue')
        .select('*')
        .eq('task_type', 'dam_connector')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching job from queue:', fetchError.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      if (!job) {
        // No pending jobs, wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      console.log(`📥 Claiming Job [${job.id}] for connection_id: ${job.payload?.connection_id}`);

      // Claim the job by setting its status to processing
      const { data: claimedJob, error: updateError } = await supabase
        .from('job_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .select()
        .single();

      if (updateError || !claimedJob) {
        console.error(`⚠️ Failed to claim job [${job.id}]:`, updateError?.message || 'Row lock conflict.');
        continue;
      }

      const connectionId = job.payload?.connection_id;
      if (!connectionId) {
        console.error(`❌ Job [${job.id}] is missing connection_id in payload.`);
        await supabase
          .from('job_queue')
          .update({
            status: 'failed',
            error_message: 'Missing connection_id in job payload.',
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        continue;
      }

      try {
        const teamId = job.payload?.team_id;
        const seasonYear = job.payload?.season_year ? Number(job.payload.season_year) : undefined;
        const syncType = job.payload?.sync_type;

        let result;
        if (syncType === 'auto_delta_sync' && teamId && seasonYear) {
          console.log(`🔄 Processing delta sync for Connection [${connectionId}] (team: ${teamId}, season: ${seasonYear})...`);
          result = await connectorAgent.syncRosterToDAM(connectionId, teamId, seasonYear);
        } else {
          console.log(`🔄 Processing full sync for Connection [${connectionId}] (team: ${teamId || 'all'}, season: ${seasonYear || 'all'})...`);
          result = await connectorAgent.syncConnectionToDAM(connectionId, teamId, seasonYear);
        }
        
        console.log(`✅ Connection sync complete: ${result.totalSuccess} succeeded, ${result.totalFailed} failed.`);

        await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            payload: {
              ...job.payload,
              result: {
                success: true,
                total_success: result.totalSuccess,
                total_failed: result.totalFailed,
              },
            },
          })
          .eq('id', job.id);

      } catch (err: any) {
        console.error(`❌ Job [${job.id}] execution failed:`, err.message);

        await supabase
          .from('job_queue')
          .update({
            status: 'failed',
            error_message: err.message,
            finished_at: new Date().toISOString(),
            attempts: (job.attempts || 0) + 1,
          })
          .eq('id', job.id);
      }

    } catch (loopErr: any) {
      console.error('❌ Critical worker loop error:', loopErr.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

console.log('🚀 Starting DAM Connector Worker...');
pollJobs().catch(console.error);
