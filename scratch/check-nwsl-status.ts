import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching NWSL Status from database...');

  // 1. Count reference rosters
  const { data: refRosters, error: refError } = await supabase
    .from('reference_rosters')
    .select('id, season_year, roster_data, teams!inner(name, league)')
    .eq('teams.league', 'nwsl');

  if (refError) {
    console.error('Error fetching reference rosters:', refError);
    return;
  }

  console.log(`Total NWSL Reference Rosters: ${refRosters?.length || 0}`);

  // Count players and how many have height/weight inside the reference rosters
  let totalRefPlayers = 0;
  let refPlayersWithStats = 0;
  const refPlayerNames = new Set<string>();

  for (const roster of refRosters || []) {
    const players = roster.roster_data || [];
    for (const p of players) {
      totalRefPlayers++;
      const name = (p.fullName || p.name || '').trim();
      if (name) {
        refPlayerNames.add(name.toLowerCase());
      }
      if (p.height || p.weight) {
        refPlayersWithStats++;
      }
    }
  }

  console.log(`Total Players in Reference Rosters: ${totalRefPlayers}`);
  console.log(`Players with stats inside Reference Rosters: ${refPlayersWithStats}`);
  console.log(`Unique player names in NWSL Reference Rosters: ${refPlayerNames.size}`);

  // 2. Count rosters in public.rosters
  const { data: rosters, error: rostersError } = await supabase
    .from('rosters')
    .select('id, roster_data')
    .ilike('league', 'nwsl');

  if (rostersError) {
    console.error('Error fetching public rosters:', rostersError);
  } else {
    console.log(`Total NWSL cached rosters in public.rosters: ${rosters?.length || 0}`);
    let publicRosterPlayers = 0;
    for (const r of rosters || []) {
      publicRosterPlayers += (r.roster_data || []).length;
    }
    console.log(`Total Players in public.rosters: ${publicRosterPlayers}`);
  }

  // 3. Check global_player_enrichment for NWSL players
  // Since global_player_enrichment does not have a "league" field, we map using the NWSL player names we collected
  if (refPlayerNames.size > 0) {
    // Let's query global_player_enrichment to see how many of these unique names have height/weight
    const nameList = Array.from(refPlayerNames);
    
    // We can fetch in batches to avoid too large query parameters or pull them all if it's small.
    // Actually, we can count total records in global_player_enrichment or just query
    let matchingEnrichedCount = 0;
    let matchingEnrichedWithStats = 0;

    // Retrieve all enriched players
    let allEnriched: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('global_player_enrichment')
        .select('player_name, height_imperial, weight_imperial')
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching enriched players:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allEnriched = allEnriched.concat(data);
        offset += limit;
      }
    }

    const enrichedMap = new Map<string, any>();
    for (const item of allEnriched) {
      enrichedMap.set(item.player_name.toLowerCase().trim(), item);
    }

    for (const name of nameList) {
      const enriched = enrichedMap.get(name);
      if (enriched) {
        matchingEnrichedCount++;
        if (enriched.height_imperial || enriched.weight_imperial) {
          matchingEnrichedWithStats++;
        }
      }
    }

    console.log(`Matching players in global_player_enrichment: ${matchingEnrichedCount} / ${refPlayerNames.size}`);
    console.log(`Enriched NWSL players with stats in global_player_enrichment: ${matchingEnrichedWithStats}`);
  }
}

main().catch(console.error);
