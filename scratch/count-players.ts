import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { count, error } = await supabase
    .from('global_player_enrichment')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error("Error fetching count:", error);
    return;
  }
  
  console.log(`Total players in global_player_enrichment: ${count}`);
}

main();
