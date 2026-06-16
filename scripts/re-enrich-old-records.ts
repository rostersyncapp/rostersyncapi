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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

if (!aiApiKey) {
  console.error(`❌ Error: API key for provider "${provider}" must be set.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const linguist = new LinguistAgent(aiApiKey);

async function main() {
  console.log(`🏁 Starting HIGH-SPEED Parallel Re-enrichment (Pre-May 2026) using ${provider.toUpperCase()}...`);

  // 1. Count how many players qualify
  const cutoffDate = '2026-05-01T00:00:00.000Z';
  const { count, error: countError } = await supabase
    .from('global_player_enrichment')
    .select('*', { count: 'exact', head: true })
    .lt('last_enriched_at', cutoffDate);

  if (countError) {
    console.error("❌ Error counting target players:", countError);
    return;
  }

  console.log(`📊 Found ${count} player records enriched before May 2026.`);

  if (!count || count === 0) {
    console.log("✅ All players are already enriched with Gemini models. Nothing to do!");
    return;
  }

  let processedCount = 0;
  const batchLimit = 125; // Process 125 players concurrently (5 chunks of 25)

  while (processedCount < count) {
    // Fetch a batch of players needing update
    const { data: players, error: fetchError } = await supabase
      .from('global_player_enrichment')
      .select('player_name')
      .lt('last_enriched_at', cutoffDate)
      .limit(batchLimit);

    if (fetchError) {
      console.error("❌ Error fetching batch:", fetchError);
      break;
    }

    if (!players || players.length === 0) {
      console.log("✅ Finished processing all matching players!");
      break;
    }

    const playerNames = players.map(p => p.player_name);
    console.log(`\n🚀 Concurrently processing batch of ${playerNames.length} players (${processedCount + 1} to ${processedCount + playerNames.length} of ${count})...`);

    // Split into 5 concurrent workers of chunk size 25
    const chunkSize = 25;
    const promises = [];
    let workerIdx = 1;

    for (let i = 0; i < playerNames.length; i += chunkSize) {
      const chunk = playerNames.slice(i, i + chunkSize);
      const id = workerIdx++;
      
      promises.push((async () => {
        console.log(`  [Worker ${id}] 🔮 Processing chunk of ${chunk.length} players...`);
        try {
          // Pass chunkSize 25 to LinguistAgent
          const enrichments = await linguist.enrichAthletes(chunk, 'sports', chunkSize);
          
          // Prepare upsert payloads using the original queried name to ensure rows with formatting quirks get updated
          const upsertData = enrichments
            .filter(e => e && e.index !== undefined && e.index >= 0 && e.index < chunk.length)
            .map(e => {
              const originalName = chunk[e.index];
              return {
                player_name: originalName,
                phonetic_name: e.phoneticSimplified || '',
                ipa_name: e.phoneticIPA || '',
                chinese_name: e.nameMandarin || '',
                hardware_safe_name: e.displayNameSafe || (originalName || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                last_enriched_at: new Date().toISOString()
              };
            });

          // Deduplicate upsertData by player_name to avoid Postgres "ON CONFLICT DO UPDATE command cannot affect row a second time" error
          const uniqueUpsertDataMap = new Map<string, any>();
          for (const item of upsertData) {
            uniqueUpsertDataMap.set(item.player_name.toLowerCase(), item);
          }
          const uniqueUpsertData = Array.from(uniqueUpsertDataMap.values());

          const { error: upsertError } = await supabase
            .from('global_player_enrichment')
            .upsert(uniqueUpsertData, { onConflict: 'player_name' });

          if (upsertError) {
            console.error(`  [Worker ${id}] ❌ Failed to upsert chunk:`, upsertError.message);
          } else {
            console.log(`  [Worker ${id}] 💾 Successfully saved ${uniqueUpsertData.length} players.`);
          }
        } catch (err: any) {
          console.error(`  [Worker ${id}] ❌ Error processing chunk:`, err.message || err);
        }
      })());
    }

    // Execute concurrently
    await Promise.all(promises);
    processedCount += playerNames.length;

    // Small delay between batches to allow DB connections to settle
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n✨ High-speed re-enrichment script finished successfully!");
}

main().catch(err => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
