import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const serviceClient = createClient(supabaseUrl, supabaseKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function compareClients() {
  console.log('--- Comparing Service Role vs Anon read on global_player_enrichment ---');

  // Service role count
  const { count: serviceCount, error: serviceErr } = await serviceClient
    .from('global_player_enrichment')
    .select('player_name', { count: 'exact', head: true });

  if (serviceErr) {
    console.error('Service role count failed:', serviceErr.message);
  } else {
    console.log(`Service role client sees: ${serviceCount} records.`);
  }

  // Anon count
  const { count: anonCount, error: anonErr } = await anonClient
    .from('global_player_enrichment')
    .select('player_name', { count: 'exact', head: true });

  if (anonErr) {
    console.error('Anon count failed:', anonErr.message);
  } else {
    console.log(`Anon client sees: ${anonCount} records.`);
  }
}

compareClients();
