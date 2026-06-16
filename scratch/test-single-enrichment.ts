import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { LinguistAgent } from '../services/agents/LinguistAgent.ts';

dotenv.config();

// Bypass RLS if service role key is present
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const provider = process.env.AI_PROVIDER || 'gemini';

let aiApiKey = '';
if (provider === 'openrouter') {
  aiApiKey = process.env.OPENROUTER_API_KEY || '';
} else {
  aiApiKey = process.env.GEMINI_API_KEY || '';
}

const supabase = createClient(supabaseUrl, supabaseKey);
const linguist = new LinguistAgent(aiApiKey);

async function main() {
  const targetPlayer = 'Sam Fehoko';
  console.log(`🔍 Checking current DB values for player: "${targetPlayer}"...`);

  // 1. Fetch current record
  const { data: before, error: fetchError } = await supabase
    .from('global_player_enrichment')
    .select('*')
    .eq('player_name', targetPlayer)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching player:", fetchError);
    return;
  }

  if (!before) {
    console.log(`Player "${targetPlayer}" not found. Trying another...`);
    return;
  }

  console.log("\n--- BEFORE ENRICHMENT ---");
  console.log("Phonetic Name:", before.phonetic_name);
  console.log("IPA Name:", before.ipa_name);
  console.log("Chinese Name:", before.chinese_name);
  console.log("Last Enriched At:", before.last_enriched_at);

  // 2. Call LinguistAgent to enrich
  console.log(`\n🧠 Querying AI provider "${provider}" with model "${process.env.OPENROUTER_MODEL || 'default'}"...`);
  const enrichments = await linguist.enrichAthletes([targetPlayer], 'football');

  if (enrichments.length === 0) {
    console.error("No enrichment values returned from AI.");
    return;
  }

  const e = enrichments[0];
  console.log("\n--- AI RESPONSE ---");
  console.log("Phonetic Simplified:", e.phoneticSimplified);
  console.log("IPA Name:", e.phoneticIPA);
  console.log("Mandarin Name:", e.nameMandarin);

  // 3. Upsert back to Supabase
  console.log("\n💾 Saving to database...");
  const { error: upsertError } = await supabase
    .from('global_player_enrichment')
    .upsert({
      player_name: e.fullName,
      phonetic_name: e.phoneticSimplified,
      ipa_name: e.phoneticIPA,
      chinese_name: e.nameMandarin,
      hardware_safe_name: e.displayNameSafe || e.fullName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      last_enriched_at: new Date().toISOString()
    }, { onConflict: 'player_name' });

  if (upsertError) {
    console.error("Upsert failed:", upsertError.message);
    return;
  }

  // 4. Verify save by re-querying
  console.log("\n🔍 Verifying saved record from DB...");
  const { data: after } = await supabase
    .from('global_player_enrichment')
    .select('*')
    .eq('player_name', targetPlayer)
    .maybeSingle();

  if (after) {
    console.log("\n--- AFTER ENRICHMENT (VERIFIED FROM DB) ---");
    console.log("Phonetic Name:", after.phonetic_name);
    console.log("IPA Name:", after.ipa_name);
    console.log("Chinese Name:", after.chinese_name);
    console.log("Last Enriched At:", after.last_enriched_at);
    console.log("\n✅ Test completed successfully!");
  } else {
    console.error("Could not retrieve player after upsert.");
  }
}

main().catch(console.error);
