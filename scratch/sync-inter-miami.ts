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

// Overwrite the anon key with the service role key to bypass RLS in script context
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const orgId = '531771bc-58be-468e-9130-35630f3e27f2';
const teamId = '7454ff65-d72c-40d1-830d-f8200e5ccdc7'; // Inter Miami CF
const seasonYear = 2026;

async function syncInterMiami() {
  const { supabase } = await import('../services/supabase.ts');
  const { ConnectorAgent } = await import('../services/agents/ConnectorAgent.ts');

  console.log('🔄 1. Configuring Field Mapping in database: player_name -> inter-miami-fc');
  
  // Delete existing mapping if it exists to prevent duplicates
  await supabase
    .from('field_mappings')
    .delete()
    .eq('organization_id', orgId)
    .eq('connector_type', 'iconik')
    .eq('source_field', 'player_name')
    .eq('target_field', 'inter-miami-fc');

  // Insert the mapping row
  const { error: insertError } = await supabase
    .from('field_mappings')
    .insert({
      organization_id: orgId,
      connector_type: 'iconik',
      source_field: 'player_name',
      target_field: 'inter-miami-fc',
      is_active: true
    });

  if (insertError) {
    console.error('❌ Failed to insert field mapping:', insertError);
    return;
  }
  console.log('✅ Field mapping registered successfully.');

  console.log(`\n📋 2. Fetching Roster for Inter Miami CF (Season ${seasonYear})...`);
  const { data: roster, error: rosterError } = await supabase
    .from('reference_rosters')
    .select('roster_data')
    .eq('team_id', teamId)
    .eq('season_year', seasonYear)
    .maybeSingle();

  if (rosterError || !roster) {
    console.error('❌ Failed to fetch roster:', rosterError);
    return;
  }

  const players = roster.roster_data as Array<{ fullName?: string; name?: string }>;
  console.log(`✅ Found ${players.length} players on the roster.`);

  const agent = new ConnectorAgent('mock-gemini-key');
  let successCount = 0;
  let failCount = 0;

  console.log('\n🚀 3. Starting batch sync to Iconik...');
  for (const player of players) {
    const name = player.fullName || player.name;
    if (!name) continue;

    try {
      const result = await agent.syncAthleteToDAM(orgId, name, 'iconik');
      console.log(`✅ Synced: "${name}" -> Iconik [target: inter-miami-fc] | Response:`, JSON.stringify(result));
      successCount++;
    } catch (err: any) {
      console.error(`❌ Failed to sync "${name}":`, err.message);
      failCount++;
    }
  }

  console.log(`\n✨ Sync complete. Successes: ${successCount}, Failures: ${failCount}`);
}

syncInterMiami().catch(console.error);
