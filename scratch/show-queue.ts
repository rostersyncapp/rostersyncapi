import { supabase } from '../services/supabase.ts';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

loadEnv();

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function run() {
  const { data, error } = await supabase
    .from('job_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching job queue:', error);
    return;
  }
  
  console.log('--- JOB QUEUE (Last 10 Jobs) ---');
  if (data.length === 0) {
    console.log('Queue is empty.');
  } else {
    data.forEach(job => {
      console.log(`[Job ID: ${job.id}] Status: ${job.status} | Task: ${job.task_type} | Created: ${job.created_at}`);
      console.log(`Payload: ${JSON.stringify(job.payload, null, 2)}`);
      if (job.error_message) {
        console.log(`Error: ${job.error_message}`);
      }
      console.log('--------------------------------');
    });
  }
}

run().catch(console.error);
