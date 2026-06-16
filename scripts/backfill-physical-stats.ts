import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 1. Load env variables immediately
dotenv.config();

// 2. CRITICAL RLS BYPASS: Overwrite anon key with service role key before any dynamic imports
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PlayerStats {
  exactName: string;
  hasStats: boolean;
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
  // Dynamically import ScoutAgent and converters to ensure environment variables are populated for RLS bypass
  const { ScoutAgent } = await import('../services/agents/ScoutAgent.ts');
  const {
    convertHeightToMetric,
    convertHeightToImperial,
    convertWeightToMetric,
    convertWeightToImperial,
  } = await import('../services/utils/unit-converters.ts');

  const args = process.argv.slice(2);
  const leagueArg = args.find((_, i) => args[i - 1] === '--league');
  const seasonArg = args.find((_, i) => args[i - 1] === '--season');
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((_, i) => args[i - 1] === '--limit');
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;

  if (!leagueArg) {
    console.error('❌ Error: --league <league_id> is required.');
    console.log('Usage: npx tsx scripts/backfill-physical-stats.ts --league <league> [--season <season>] [--dry-run] [--limit <num>]');
    process.exit(1);
  }

  const targetLeague = leagueArg.toLowerCase();
  const targetSeason = seasonArg ? parseInt(seasonArg, 10) : undefined;

  console.log(`\n🚀 Starting Physical Stats Backfill Script...`);
  console.log(`   League:    ${targetLeague.toUpperCase()}`);
  console.log(`   Season:    ${targetSeason ? targetSeason : 'ALL'}`);
  console.log(`   Dry Run:   ${dryRun ? 'YES (No DB writes)' : 'NO'}`);
  if (limit) console.log(`   Limit:     ${limit} rosters`);

  // 1. Build Case-Insensitive Player Name Map from global_player_enrichment
  console.log('\n🧠 Loading existing player enrichment names to memory map...');
  const allPlayers = new Map<string, PlayerStats>();
  let hasMore = true;
  let offset = 0;
  const fetchPageSize = 5000;

  while (hasMore) {
    const { data, error } = await supabase
      .from('global_player_enrichment')
      .select('player_name, height_imperial, weight_imperial')
      .range(offset, offset + fetchPageSize - 1);

    if (error) {
      console.error('❌ Error loading player names:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data) {
        const hasStats = !!(row.height_imperial || row.weight_imperial);
        allPlayers.set(row.player_name.toLowerCase(), {
          exactName: row.player_name,
          hasStats,
        });
      }
      offset += fetchPageSize;
    }
  }
  console.log(`   Cached ${allPlayers.size} unique players from global_player_enrichment.`);

  // 2. Phase 1: Cached Parse (from public.rosters)
  console.log('\n--- 📂 Phase 1: Cached Parse (public.rosters) ---');
  let rostersQuery = supabase.from('rosters').select('*');
  if (targetLeague) {
    rostersQuery = rostersQuery.ilike('league', targetLeague);
  }
  if (targetSeason) {
    rostersQuery = rostersQuery.eq('season_year', targetSeason.toString());
  }

  const { data: cachedRosters, error: cachedError } = await rostersQuery;
  if (cachedError) {
    console.error('   ❌ Error querying public.rosters:', cachedError);
  } else if (!cachedRosters || cachedRosters.length === 0) {
    console.log('   ℹ️ No cached rosters found matching filters in public.rosters.');
  } else {
    console.log(`   Found ${cachedRosters.length} rosters in public.rosters. Processing...`);
    let phase1Count = 0;

    for (const roster of cachedRosters) {
      const rosterData = roster.roster_data;
      if (!Array.isArray(rosterData)) continue;

      console.log(`   📦 Processing cached roster: ${roster.team_name} (${roster.season_year}) - ${rosterData.length} players`);
      for (const p of rosterData) {
        const rawName = p.originalName || p.fullName || p.name;
        if (!rawName) continue;

        const rawHeight = p.height;
        const rawWeight = p.weight;

        if (!rawHeight && !rawWeight) continue;

        const nameLower = rawName.trim().toLowerCase();
        const existing = allPlayers.get(nameLower);
        const resolvedName = existing ? existing.exactName : rawName.trim();

        // Convert stats
        const normalizedWeight = getNormalizedWeight(rawWeight, (roster.league || targetLeague).toLowerCase());
        const height_imperial = convertHeightToImperial(rawHeight);
        const height_metric = convertHeightToMetric(rawHeight);
        const weight_imperial = convertWeightToImperial(normalizedWeight);
        const weight_metric = convertWeightToMetric(normalizedWeight);

        if (!height_imperial && !weight_imperial) continue;

        // Skip if they already have stats populated in DB
        if (existing?.hasStats) {
          continue;
        }

        phase1Count++;
        if (dryRun) {
          console.log(`      [Dry Run] Would update stats for ${resolvedName}: H=${height_imperial} (${height_metric}), W=${weight_imperial} (${weight_metric})`);
        } else {
          const { error: upsertError } = await supabase
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

          if (upsertError) {
            console.error(`      ❌ Failed to update ${resolvedName}:`, upsertError.message);
          } else {
            allPlayers.set(nameLower, { exactName: resolvedName, hasStats: true });
          }
        }
      }
    }
    console.log(`   ✅ Phase 1 Complete. ${phase1Count} players updated/logged.`);
  }

  // 3. Phase 2: Scout Reparse (public.reference_rosters)
  console.log('\n--- 🛰️ Phase 2: Scout Reparse (public.reference_rosters) ---');

  // Query reference rosters joined with teams table using inner join to filter by league
  let refRostersQuery = supabase
    .from('reference_rosters')
    .select('id, team_id, season_year, roster_data, teams!inner(name, external_id, league)')
    .eq('teams.league', targetLeague);

  if (targetSeason) {
    refRostersQuery = refRostersQuery.eq('season_year', targetSeason);
  }

  const { data: refRosters, error: refError } = await refRostersQuery;

  if (refError) {
    console.error('   ❌ Error querying reference_rosters:', refError);
    process.exit(1);
  }

  const filteredRefRosters = (refRosters || []) as any[];

  if (filteredRefRosters.length === 0) {
    console.log('   ℹ️ No reference rosters found matching filters.');
    return;
  }

  console.log(`   Found ${filteredRefRosters.length} reference rosters in DB.`);

  // Apply limit if specified
  const rostersToProcess = limit ? filteredRefRosters.slice(0, limit) : filteredRefRosters;
  console.log(`   Will evaluate ${rostersToProcess.length} rosters for missing stats...`);

  const scout = new ScoutAgent();
  let phase2Count = 0;
  let rostersFetched = 0;

  for (const roster of rostersToProcess) {
    const teamName = roster.teams.name;
    const teamId = roster.teams.external_id || roster.team_id;
    const season = roster.season_year;
    const existingPlayers = roster.roster_data || [];

    if (!Array.isArray(existingPlayers) || existingPlayers.length === 0) {
      console.log(`   ⚠️ Roster for ${teamName} (${season}) has 0 players. Skipping.`);
      continue;
    }

    // Determine how many players are missing stats
    let missingCount = 0;
    for (const p of existingPlayers) {
      const rawName = p.fullName || p.name;
      if (!rawName) continue;
      const existing = allPlayers.get(rawName.trim().toLowerCase());
      if (!existing || !existing.hasStats) {
        missingCount++;
      }
    }

    console.log(`\n   Evaluating: ${teamName} (${season})`);
    console.log(`      Total roster players: ${existingPlayers.length}`);
    console.log(`      Players missing stats: ${missingCount}`);

    // If there are players missing stats, trigger ScoutAgent fetch
    if (missingCount > 0) {
      console.log(`      🔄 Refetching official roster from ScoutAgent to get physical stats...`);
      rostersFetched++;

      const fetchedRoster = await scout.fetchOfficialRoster(targetLeague, teamName, teamId, season);

      if (!fetchedRoster || fetchedRoster.length === 0) {
        console.log(`      ❌ ScoutAgent returned empty roster for ${teamName}.`);
        continue;
      }

      console.log(`      ✅ ScoutAgent returned ${fetchedRoster.length} players with fresh stats.`);

      // Merging stats back to roster_data array while keeping existing metadata (like translations)
      const mergedRosterData = existingPlayers.map((existingPlayer: any) => {
        const fetchedPlayer = fetchedRoster.find((fp: any) =>
          fp.id === existingPlayer.id ||
          (fp.name && existingPlayer.fullName && fp.name.toLowerCase() === existingPlayer.fullName.toLowerCase()) ||
          (fp.name && existingPlayer.name && fp.name.toLowerCase() === existingPlayer.name.toLowerCase())
        );

        if (fetchedPlayer) {
          return {
            ...existingPlayer,
            height: fetchedPlayer.height || existingPlayer.height,
            weight: fetchedPlayer.weight || existingPlayer.weight,
          };
        }
        return existingPlayer;
      });

      // Update reference_rosters with merged roster data
      if (dryRun) {
        console.log(`      [Dry Run] Would update reference_rosters roster_data for team_id: ${roster.team_id}, season: ${season}`);
      } else {
        const { error: saveError } = await supabase
          .from('reference_rosters')
          .update({
            roster_data: mergedRosterData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roster.id);

        if (saveError) {
          console.error(`      ❌ Failed to update reference_rosters:`, saveError.message);
        } else {
          console.log(`      💾 Saved merged roster_data to reference_rosters.`);
        }
      }

      // Upsert physical stats into global_player_enrichment
      for (const fp of fetchedRoster) {
        if (!fp.height && !fp.weight) continue;

        const nameLower = fp.name.trim().toLowerCase();
        const existing = allPlayers.get(nameLower);
        const resolvedName = existing ? existing.exactName : fp.name.trim();

        // Convert stats
        const normalizedWeight = getNormalizedWeight(fp.weight, targetLeague);
        const height_imperial = convertHeightToImperial(fp.height);
        const height_metric = convertHeightToMetric(fp.height);
        const weight_imperial = convertWeightToImperial(normalizedWeight);
        const weight_metric = convertWeightToMetric(normalizedWeight);

        if (!height_imperial && !weight_imperial) continue;

        // Skip if already has stats in DB
        if (existing?.hasStats) {
          continue;
        }

        phase2Count++;
        if (dryRun) {
          console.log(`      [Dry Run] Would upsert stats for ${resolvedName}: H=${height_imperial} (${height_metric}), W=${weight_imperial} (${weight_metric})`);
        } else {
          const { error: upsertError } = await supabase
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

          if (upsertError) {
            console.error(`         ❌ Failed to update ${resolvedName}:`, upsertError.message);
          } else {
            allPlayers.set(nameLower, { exactName: resolvedName, hasStats: true });
          }
        }
      }

      // Rate limit protection delay/jitter
      if (!dryRun && rostersFetched < rostersToProcess.length) {
        const delay = Math.floor(Math.random() * 1500) + 1000; // 1s to 2.5s delay
        console.log(`      💤 Waiting ${delay}ms before next team...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } else {
      console.log(`      ✅ No players missing stats. Skipping fetch.`);
    }
  }

  console.log(`\n✨ Phase 2 Complete. Processed ${rostersFetched} rosters, updated/logged ${phase2Count} players.`);
}

main().catch(error => {
  console.error('💀 Fatal execution error:', error);
  process.exit(1);
});
