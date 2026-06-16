import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Query Supabase for public tables
  const { data, error } = await supabase
    .rpc('get_tables'); // Or try standard query if RPC exists, otherwise let's just query schemas or use catalog if we can

  if (error) {
    // If no RPC, let's fetch list of schemas/tables by executing a direct query via rest api if possible
    console.error("Direct RPC error:", error.message);
    
    // Let's try executing a select from information_schema.tables if RPC doesn't exist
    // Supabase REST API doesn't allow direct raw SQL query easily unless we query a specific view or RPC.
    // Let's see if we can find existing tables by trying to query them.
  } else {
    console.log("Tables list:", data);
  }
}

main();
