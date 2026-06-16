import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const cutoffDate = '2026-05-01T00:00:00.000Z';
  const { data, error } = await supabase
    .from('global_player_enrichment')
    .select('player_name, last_enriched_at')
    .lt('last_enriched_at', cutoffDate);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Remaining players:");
  for (const row of data || []) {
    console.log(`- ${row.player_name} (Last enriched: ${row.last_enriched_at})`);
  }
}

main();
