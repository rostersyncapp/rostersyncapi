import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const timeline: Record<string, number> = {};
  let nullCount = 0;
  let offset = 0;
  const limit = 5000;
  let hasMore = true;

  console.log("Fetching all enrichment timestamps...");

  while (hasMore) {
    const { data, error } = await supabase
      .from('global_player_enrichment')
      .select('last_enriched_at')
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error("Error:", error);
      break;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data) {
        if (!row.last_enriched_at) {
          nullCount++;
          continue;
        }
        const date = new Date(row.last_enriched_at);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timeline[yearMonth] = (timeline[yearMonth] || 0) + 1;
      }
      offset += limit;
    }
  }
  
  console.log("\nEnrichment counts by month:");
  for (const [month, count] of Object.entries(timeline).sort()) {
    console.log(`- ${month}: ${count} players`);
  }
  console.log(`- Null/Never Enriched: ${nullCount} players`);
}

main();
