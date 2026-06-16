import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select('action_type');
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const types = new Set(data?.map(d => d.action_type));
  console.log("Distinct action types:", Array.from(types));
}

main();
