import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data, error } = await supabase
    .from('global_player_enrichment')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Sample row keys and values:", data?.[0]);
}

main();
