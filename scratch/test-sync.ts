import * as fs from 'fs';
import * as path from 'path';

// Manually load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        // Remove surrounding quotes if they exist
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

// Load env
loadEnv();

// CRITICAL: Overwrite the anon key with the service role key for this script context
// to bypass RLS restrictions on global_player_enrichment and other backend tables.
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

console.log('DEBUG: process.env.SUPABASE_URL =', process.env.SUPABASE_URL);
console.log('DEBUG: process.env.SUPABASE_ANON_KEY is service role =', process.env.SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runTestSync() {
  const { isSupabaseConfigured } = await import('../services/supabase.ts');
  console.log('DEBUG: isSupabaseConfigured =', isSupabaseConfigured);

  // Dynamically import the ConnectorAgent so process.env is already populated
  const { ConnectorAgent } = await import('../services/agents/ConnectorAgent.ts');

  const orgId = '531771bc-58be-468e-9130-35630f3e27f2';
  const playerName = 'Stacey Augmon';
  const connectorType = 'iconik';

  console.log(`🚀 Running test sync to ${connectorType} for player "${playerName}"...`);
  
  // Instantiating the ConnectorAgent
  const agent = new ConnectorAgent('mock-agent-key');
  
  try {
    const result = await agent.syncAthleteToDAM(orgId, playerName, connectorType);
    console.log(`\n🎉 Sync Result:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`\n❌ Sync Failed:`, error);
  }
}

runTestSync();
