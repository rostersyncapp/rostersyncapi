import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { LinguistAgent } from '../services/agents/LinguistAgent.ts';

dotenv.config();

// Bypass RLS if service role key is present
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Use GEMINI_API_KEY since Agent class interfaces directly with official Google SDK
const aiApiKey = process.env.GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

if (!aiApiKey) {
  console.error('❌ Error: GEMINI_API_KEY must be set for enrichment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const linguist = new LinguistAgent(aiApiKey);

async function enrichTable(tableName: string) {
  console.log(`\n🧠 Starting enrichment for table "${tableName}"...`);
  
  const { data: teams, error } = await supabase
    .from(tableName)
    .select('id, country_name, roster_data');

  if (error || !teams) {
    console.error(`❌ Failed to fetch teams from ${tableName}:`, error);
    return;
  }

  console.log(`Found ${teams.length} teams. Scanning for unenriched players...`);

  for (const team of teams) {
    const athletes = team.roster_data || [];
    if (!Array.isArray(athletes) || athletes.length === 0) continue;

    // Find players missing enrichment data
    const missingIntelligence = athletes.filter((a: any) => {
      return !a.isEnriched && (!a.phoneticSimplified || !a.phoneticIPA || !a.nameMandarin);
    });

    if (missingIntelligence.length === 0) {
      console.log(`  ✅ ${team.country_name} is already fully enriched.`);
      continue;
    }

    console.log(`  🔄 Enriching ${missingIntelligence.length} players for ${team.country_name}...`);

    const namesToEnrich = missingIntelligence.map((a: any) => a.fullName);
    const chunkSize = 10;
    const enrichments: any[] = [];
    
    try {
      for (let i = 0; i < namesToEnrich.length; i += chunkSize) {
        const chunk = namesToEnrich.slice(i, i + chunkSize);
        console.log(`    🔮 Processing batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(namesToEnrich.length / chunkSize)} (${chunk.length} players)...`);
        
        const chunkEnrichments = await linguist.enrichAthletes(chunk, 'soccer');
        // Align indexes to the current offset
        const mappedChunk = chunkEnrichments.map(item => ({
          ...item,
          index: Number(item.index) + i
        }));
        
        enrichments.push(...mappedChunk);

        if (i + chunkSize < namesToEnrich.length) {
          console.log(`    💤 Pacing delay: waiting 4 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
      
      let updateCount = 0;
      const updatedAthletes = athletes.map((athlete: any) => {
        const rawName = athlete.fullName || '';
        const athleteIndex = namesToEnrich.indexOf(rawName);
        
        if (athleteIndex === -1) return athlete;

        const e = enrichments.find((item: any) => Number(item.index) === athleteIndex);

        if (e) {
          updateCount++;
          return {
            ...athlete,
            phoneticSimplified: e.phoneticSimplified || athlete.phoneticSimplified,
            phoneticIPA: e.phoneticIPA || athlete.phoneticIPA,
            nameMandarin: e.nameMandarin || athlete.nameMandarin,
            spanishTranslation: e.spanishTranslation || athlete.spanishTranslation,
            isEnriched: true
          };
        }
        return athlete;
      });

      if (updateCount > 0) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({
            roster_data: updatedAthletes,
            updated_at: new Date().toISOString()
          })
          .eq('id', team.id);

        if (updateError) {
          console.error(`    ❌ Failed to save updates for ${team.country_name}:`, updateError.message);
        } else {
          console.log(`    💾 Successfully saved ${updateCount} player enrichments for ${team.country_name}.`);
        }
      }
    } catch (err: any) {
      console.error(`    ❌ Error enriching ${team.country_name}:`, err.message || err);
    }

    // Delay between teams to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  console.log('🏁 Starting FIFA World Cup Enrichment Process...');
  
  await enrichTable('fifaworldcupm');
  await enrichTable('fifaworldcupf');

  console.log('\n✨ FIFA World Cup enrichment complete!');
}

main().catch(err => {
  console.error('💀 Fatal error:', err);
  process.exit(1);
});
