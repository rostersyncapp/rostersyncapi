import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Let's count players grouped by month of last_enriched_at
  const { data, error } = await supabase
    .from('global_player_enrichment')
    .select('last_enriched_at');
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const timeline: Record<string, number> = {};
  let nullCount = 0;
  
  for (const row of data || []) {
    if (!row.last_enriched_at) {
      nullCount++;
      continue;
    }
    const date = new Date(row.last_enriched_at);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    timeline[yearMonth] = (timeline[yearMonth] || 0) + 1;
  }
  
  console.log("Enrichment counts by month:");
  for (const [month, count] of Object.entries(timeline).sort()) {
    console.log(`- ${month}: ${count} players`);
  }
  console.log(`- Null/Never Enriched: ${nullCount} players`);
}

main();
