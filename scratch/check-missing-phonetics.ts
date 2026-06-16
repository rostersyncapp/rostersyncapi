import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  console.log("Analyzing database for missing phonetics by league...");

  // 1. Fetch all teams with their league info
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, league');

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return;
  }

  // Map team_id to league name
  const teamLeagueMap = new Map<string, string>();
  for (const team of teams || []) {
    teamLeagueMap.set(team.id, team.league);
  }

  // 2. Fetch all reference rosters to find active players on teams
  const { data: rosters, error: rostersError } = await supabase
    .from('reference_rosters')
    .select('team_id, roster_data');

  if (rostersError) {
    console.error("Error fetching reference rosters:", rostersError);
    return;
  }

  // Gather unique player names grouped by league
  const leaguePlayers = new Map<string, Set<string>>();
  for (const roster of rosters || []) {
    const league = teamLeagueMap.get(roster.team_id);
    if (!league) continue;

    if (!leaguePlayers.has(league)) {
      leaguePlayers.set(league, new Set());
    }

    const players = roster.roster_data || [];
    const nameSet = leaguePlayers.get(league)!;
    for (const p of players) {
      const name = (p.fullName || p.name || '').trim();
      if (name) {
        nameSet.add(name);
      }
    }
  }

  // 3. Fetch all global player enrichments to build a lookup map of player_name -> phonetic_name
  console.log("Loading global player enrichments...");
  let allEnriched: any[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('global_player_enrichment')
      .select('player_name, phonetic_name')
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

  const phoneticMap = new Map<string, string | null>();
  for (const item of allEnriched) {
    const nameKey = item.player_name.toLowerCase().trim();
    phoneticMap.set(nameKey, item.phonetic_name);
  }

  // 4. Calculate status for each league
  console.log("\nResults by League:");
  console.log("------------------------------------------------------------");
  console.log(`${"League".padEnd(25)} | ${"Total Players".padEnd(13)} | ${"Has Phonetic".padEnd(12)} | ${"Missing".padEnd(7)} | ${"Percent".padEnd(7)}`);
  console.log("------------------------------------------------------------");

  for (const [league, playerNames] of Array.from(leaguePlayers.entries())) {
    let hasPhonetic = 0;
    let missingPhonetic = 0;

    for (const name of Array.from(playerNames)) {
      const key = name.toLowerCase().trim();
      const phonetic = phoneticMap.get(key);
      if (phonetic && phonetic.trim().length > 0) {
        hasPhonetic++;
      } else {
        missingPhonetic++;
      }
    }

    const total = playerNames.size;
    const percent = total > 0 ? ((hasPhonetic / total) * 100).toFixed(1) : "0.0";
    console.log(`${league.padEnd(25)} | ${total.toString().padEnd(13)} | ${hasPhonetic.toString().padEnd(12)} | ${missingPhonetic.toString().padEnd(7)} | ${percent}%`);
  }
}

main().catch(console.error);
