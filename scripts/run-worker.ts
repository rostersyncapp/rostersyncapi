import * as dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { LinguistAgent } from '../services/agents/LinguistAgent.ts';
import { ScoutAgent } from '../services/agents/ScoutAgent.ts';
import {
  convertHeightToMetric,
  convertHeightToImperial,
  convertWeightToMetric,
  convertWeightToImperial,
} from '../services/utils/unit-converters.ts';

dotenv.config();

// CRITICAL RLS BYPASS: Overwrite anon key with service role key for imported modules
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const provider = process.env.AI_PROVIDER || 'ollama';
let aiApiKey = '';

if (provider === 'gemini') {
  aiApiKey = process.env.GEMINI_API_KEY || '';
} else if (provider === 'openrouter') {
  aiApiKey = process.env.OPENROUTER_API_KEY || '';
} else {
  aiApiKey = 'local-ollama'; // No key needed for local
}

if (provider !== 'ollama' && !aiApiKey) {
  console.error(`Error: AI_PROVIDER is set to ${provider} but no API key was found.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const linguist = new LinguistAgent(aiApiKey);
const workerUrl = `${supabaseUrl}/functions/v1/roster-worker`;

async function checkRosterNeedsSync(teamId: string, season: number, leagueId: string, internalId?: string): Promise<{ shouldSync: boolean; existingRoster: any | null }> {
  // Prefer internalId (UUID) for direct lookup — most reliable path
  const uuidToTry = internalId || (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamId) ? teamId : null);

  if (uuidToTry) {
    const { data: rosterEntry, error } = await supabase
      .from('reference_rosters')
      .select('*')
      .eq('team_id', uuidToTry)
      .eq('season_year', season)
      .maybeSingle();
      
    if (!error && rosterEntry) {
      const isEmpty = !Array.isArray(rosterEntry.roster_data) || rosterEntry.roster_data.length === 0;
      
      if (isEmpty) {
        console.log(`[checkRosterNeedsSync] ⚠️ Roster for ${uuidToTry} (${season}) is EMPTY. Forcing sync.`);
        return { shouldSync: true, existingRoster: null };
      }

      console.log(`[checkRosterNeedsSync] ✅ Found roster for teamId: ${uuidToTry}, season: ${season} (ID: ${rosterEntry.id})`);
      const lastSync = rosterEntry.last_sync_at ? new Date(rosterEntry.last_sync_at) : null;
      const now = new Date();
      const daysSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24) : 999;
      return { shouldSync: daysSinceSync > 7, existingRoster: rosterEntry };
    }
  }

  // Fallback: resolve from external_id in teams table
  const { data: teamData } = await supabase
    .from('teams')
    .select('id')
    .eq('external_id', teamId)
    .eq('league', leagueId)
    .maybeSingle();

  const internalTeamId = teamData?.id;
  if (!internalTeamId) {
    return { shouldSync: true, existingRoster: null };
  }

  const { data: rosterEntry, error } = await supabase
    .from('reference_rosters')
    .select('*')
    .eq('team_id', internalTeamId)
    .eq('season_year', season)
    .maybeSingle();

  if (error) {
    console.error('Error checking roster:', error);
    return { shouldSync: true, existingRoster: null };
  }

  if (!rosterEntry || !Array.isArray(rosterEntry.roster_data) || rosterEntry.roster_data.length === 0) {
    return { shouldSync: true, existingRoster: null };
  }

  const lastSync = rosterEntry.last_sync_at ? new Date(rosterEntry.last_sync_at) : null;
  const now = new Date();
  const daysSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24) : 999;

  const shouldSync = daysSinceSync > 7;

  return { shouldSync, existingRoster: rosterEntry };
}

async function runWorker(workerId: number, league: string | null = null, scoutOnly: boolean = false) {
  let processedCount = 0;
  let emptyRuns = 0;

  console.log(`[W${workerId}] Local Enrichment Worker started${scoutOnly ? ' (SCOUT-ONLY mode)' : ''}.`);

  while (emptyRuns < 2) {
    const jitter = Math.floor(Math.random() * 2000) + 500;
    await new Promise(resolve => setTimeout(resolve, jitter));

    try {
      console.log(`[W${workerId}] Requesting job...`);

      const startTime = Date.now();

      const response = await axios.post(workerUrl, { skipEnrichment: true, league }, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });

      const data = response.data;
      if (data.message === 'No pending roster jobs found.') {
        console.log(`[W${workerId}] 💤 No more jobs.`);
        emptyRuns++;
        continue;
      }

      // Skip "no roster" responses — team didn't exist that season (unless we can fetch it locally)
      let skipDueToNoRoster = false;
      if (data.message && data.message.startsWith('No official roster')) {
        const localCapableLeagues = ['premier-league', 'eng.1', 'la-liga', 'esp.1', 'bundesliga', 'ger.1', 'serie-a', 'ita.1', 'ligue-1', 'fra.1', 'nhl', 'nba'];
        if (localCapableLeagues.includes(data.league?.toLowerCase())) {
          console.log(`[W${workerId}] ⚠️ Cloud returned no roster for ${data.team_name} (${data.season}), but trying local failover...`);
        } else {
          console.log(`[W${workerId}] ⏭️ ${data.team_name} (${data.season}) — no roster exists. Skipping.`);
          skipDueToNoRoster = true;
        }
      }
      if (skipDueToNoRoster) {
        continue;
      }

      const { team_name, season, league: league_id, team_id, internal_id } = data;
      
      let resolvedInternalId = internal_id;
      let resolvedTeamId = team_id;
      if ((!resolvedInternalId || !resolvedTeamId) && team_name && league_id) {
        console.log(`[W${workerId}] 🔍 Resolving team IDs for ${team_name} in ${league_id}...`);
        const { data: teamData } = await supabase
          .from('teams')
          .select('id, external_id')
          .eq('league', league_id)
          .eq('name', team_name)
          .maybeSingle();
        if (teamData) {
          resolvedInternalId = teamData.id;
          resolvedTeamId = teamData.external_id || teamData.id;
          console.log(`[W${workerId}] 🎯 Resolved: internal_id = ${resolvedInternalId}, team_id = ${resolvedTeamId}`);
        }
      }

      let rosterEntry = null;
      let mode = '';

      const { shouldSync, existingRoster } = await checkRosterNeedsSync(resolvedTeamId || '', season, league_id, resolvedInternalId || '');

      if (!shouldSync && existingRoster) {
        rosterEntry = existingRoster;
        mode = 'ENRICH-ONLY (recent)';
        console.log(`[W${workerId}] 📋 Using existing roster (${existingRoster.roster_data.length} players) - skipping sync`);
      } else {
        mode = 'SYNC + ENRICH';
        console.log(`[W${workerId}] 🔄 Syncing fresh data for ${team_name} (${season})...`);
        
        // Prefer existingRoster (already fetched fresh in checkRosterNeedsSync).
        // Only do a second DB lookup if we have no existingRoster at all.
        if (existingRoster) {
          rosterEntry = existingRoster;
        } else {
          const lookupId = resolvedInternalId || resolvedTeamId;
          const { data: syncedRoster } = await supabase
            .from('reference_rosters')
            .select('*')
            .eq('team_id', lookupId)
            .eq('season_year', season)
            .maybeSingle();
          rosterEntry = syncedRoster;
          if (!rosterEntry) console.warn(`[W${workerId}] ⚠️ No roster found for ${team_name} (${season}) — skipping.`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[W${workerId}] ⚡ ${mode}: ${team_name} (${season}) in ${duration}s`);

      // 🕵️‍♂️ LOCAL SCOUT FAILOVER: If the roster is still empty or missing after sync (likely due to Cloud IP block or cloud sync gap),
      // perform a local sync from this machine.
      const isEmptyRoster = !rosterEntry || !Array.isArray(rosterEntry.roster_data) || rosterEntry.roster_data.length === 0;
      if (isEmptyRoster) {
        console.log(`[W${workerId}] 🕵️‍♂️ Roster entry is missing or empty. Attempting LOCAL SCOUT bypass...`);
        const scout = new ScoutAgent();
        const localRoster = await scout.fetchOfficialRoster(league_id, team_name, resolvedTeamId || '', season);
        
        if (localRoster && localRoster.length > 0) {
          console.log(`[W${workerId}] ✅ LOCAL SCOUT SUCCESS: Found ${localRoster.length} players for ${team_name}.`);
          if (rosterEntry) {
            // Update existing entry
            const { data: updatedRoster, error: saveError } = await supabase
              .from('reference_rosters')
              .update({ roster_data: localRoster, last_sync_at: new Date().toISOString() })
              .eq('id', rosterEntry.id)
              .select()
              .single();
            if (!saveError && updatedRoster) {
              rosterEntry = updatedRoster;
            } else {
              console.error(`[W${workerId}] ❌ Failed to update reference_rosters:`, saveError);
            }
          } else {
            // Insert new entry
            const lookupId = resolvedInternalId || resolvedTeamId;
            const { data: insertedRoster, error: saveError } = await supabase
              .from('reference_rosters')
              .insert({
                team_id: lookupId,
                season_year: season,
                league_id: league_id,
                roster_data: localRoster,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            if (!saveError && insertedRoster) {
              rosterEntry = insertedRoster;
            } else {
              console.error(`[W${workerId}] ❌ Failed to insert reference_rosters:`, saveError);
            }
          }
        } else {
          console.warn(`[W${workerId}] ❌ LOCAL SCOUT also returned EMPTY for ${team_name}. Possible source gap.`);
        }
      }


      if (!scoutOnly && rosterEntry && Array.isArray(rosterEntry.roster_data)) {
        const athletes = rosterEntry.roster_data;
        const missingIntelligence = athletes.filter((a: any) => {
          const name = a.fullName || a.name;
          return name && (
            !a.phoneticIPA || 
            !a.nameMandarin || 
            !a.spanishTranslation || 
            !a.phoneticSimplified
          );
        });

        if (missingIntelligence.length > 0) {
          console.log(`[W${workerId}] 🧠 Found ${missingIntelligence.length} athletes needing enrichment...`);
          
          const namesToEnrich = missingIntelligence.map((a: any) => a.fullName || a.name);
          const enrichments = await linguist.enrichAthletes(namesToEnrich, league_id);
          
          console.log(`[W${workerId}] 📡 AI returned ${enrichments.length} enrichments. First 2:`, JSON.stringify(enrichments.slice(0, 2), null, 2));

          let updateCount = 0;
          const updatedAthletes = athletes.map((athlete: any) => {
            const rawName = athlete.fullName || athlete.name || '';
            const athleteIndex = namesToEnrich.indexOf(rawName);
            
            if (athleteIndex === -1) return athlete;

            const e = enrichments.find((item: any) => Number(item.index) === athleteIndex);

            if (e) {
              updateCount++;
              // Merge all properties from the enrichment object
              return { ...athlete, ...e, isEnriched: true };
            }
            return athlete;
          });

          if (updateCount > 0) {
            // SAFETY GUARD: Never overwrite a populated roster with fewer players
            const originalCount = athletes.length;
            if (originalCount > 0 && updatedAthletes.length < originalCount * 0.5) {
              console.error(`[W${workerId}] ⛔ BLOCKED: Would shrink roster from ${originalCount} to ${updatedAthletes.length}. Skipping save.`);
            } else {
              console.log(`[W${workerId}] 💾 Attempting DB Update for ${team_name} (ID: ${rosterEntry.id})...`);
              const { error: updateError, count } = await supabase
                .from('reference_rosters')
                .update({ 
                  roster_data: updatedAthletes, 
                  updated_at: new Date().toISOString(),
                  last_sync_at: shouldSync ? new Date().toISOString() : rosterEntry.last_sync_at
                }, { count: 'exact' })
                .eq('id', rosterEntry.id);
              
              if (updateError) {
                console.error(`[W${workerId}] ❌ DB Update Error for ${team_name}:`, updateError);
              } else if (count === 0) {
                console.error(`[W${workerId}] ⚠️ DB Update Warning: 0 rows affected for ${team_name} (ID: ${rosterEntry.id})`);
              } else {
                console.log(`[W${workerId}] ✨ Successfully saved ${updateCount} enrichments for ${team_name} (ID: ${rosterEntry.id})`);
              }
            }
          }
        } else {
          console.log(`[W${workerId}] ✅ ${team_name} already fully enriched`);
        }
      }

      // 💾 Upsert physical stats to global_player_enrichment for all players in this roster
      if (rosterEntry && Array.isArray(rosterEntry.roster_data)) {
        try {
          const athletes = rosterEntry.roster_data;
          
          // Fetch existing player names first for case-insensitive lookup
          const { data: enrichmentNames } = await supabase
            .from('global_player_enrichment')
            .select('player_name');
          const nameMap = new Map<string, string>();
          if (enrichmentNames) {
            for (const row of enrichmentNames) {
              nameMap.set(row.player_name.toLowerCase(), row.player_name);
            }
          }

          for (const athlete of athletes) {
            const rawName = athlete.fullName || athlete.name;
            if (!rawName) continue;
            
            const rawHeight = athlete.height;
            const rawWeight = athlete.weight;
            if (!rawHeight && !rawWeight) continue;

            const nameLower = rawName.trim().toLowerCase();
            const resolvedName = nameMap.get(nameLower) || rawName.trim();

            const normalizedWeight = getNormalizedWeight(rawWeight, league_id);
            const height_imperial = convertHeightToImperial(rawHeight);
            const height_metric = convertHeightToMetric(rawHeight);
            const weight_imperial = convertWeightToImperial(normalizedWeight);
            const weight_metric = convertWeightToMetric(normalizedWeight);

            if (!height_imperial && !weight_metric) continue;

            await supabase
              .from('global_player_enrichment')
              .upsert({
                player_name: resolvedName,
                height_imperial,
                height_metric,
                weight_imperial,
                weight_metric,
                last_enriched_at: new Date().toISOString(),
              }, {
                onConflict: 'player_name',
              });
          }
          console.log(`[W${workerId}] 💾 Saved physical stats to global_player_enrichment for ${team_name} players.`);
        } catch (enrichErr: any) {
          console.error(`[W${workerId}] ⚠️ Failed to upsert physical stats:`, enrichErr.message);
        }
      }

      processedCount++;
      console.log(`[W${workerId}] ✅ Finished: ${team_name} (${season})`);

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error(`[W${workerId}] ❌ Error: ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return processedCount;
}

function getNormalizedWeight(weightStr: string | number | undefined, league: string): string {
  if (weightStr === undefined || weightStr === null) return '';
  const str = weightStr.toString().trim().toLowerCase();
  if (!str) return '';
  
  if (str.endsWith('lbs') || str.endsWith('lb') || str.endsWith('kg') || str.endsWith('kilos')) {
    return str;
  }
  
  const US_LEAGUES = ['mlb', 'milb', 'nhl', 'nba', 'wnba', 'nfl', 'ncaa', 'ncaa_fb', 'ncaa_mb', 'ncaa_wb'];
  if (US_LEAGUES.includes(league)) {
    return `${str} lbs`;
  } else {
    return `${str} kg`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const concurrencyArg = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
  const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg) : 1;

  const leagueIdx = args.indexOf('--league');
  const league = leagueIdx > -1 ? args[leagueIdx + 1].toLowerCase() : null;

  const scoutOnly = args.includes('--scout-only');

  console.log('🚀 Starting LOCAL Parallel Enrichment Worker...');
  console.log(`🔗 Cloud Target (Sync Only): ${workerUrl}`);
  console.log(`⚡ Concurrency: ${CONCURRENCY} streams`);
  if (scoutOnly) {
    console.log(`🛡️ mode: SCOUT-ONLY (bypassing AI enrichment)`);
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i + 1, league, scoutOnly));
  const results = await Promise.all(workers);
  const total = results.reduce((a, b) => a + b, 0);

  console.log(`\n✨ DONE! Processed ${total} teams.`);
}

main().catch(console.error);
