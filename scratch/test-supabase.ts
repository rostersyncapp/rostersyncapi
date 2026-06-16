import * as dotenv from 'dotenv';
dotenv.config();

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function test() {
  const { supabase } = await import('../services/supabase.ts');
  const connectionId = '9de2bd9e-f172-473e-bf54-0881e0307cd8';
  
  const { data, error } = await supabase
    .from('dam_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error) {
    console.error('Error fetching connection:', error);
  } else {
    console.log('Successfully fetched connection:', data);
  }
}

test().catch(console.error);
