import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function fetchAllTeams() {
  const allTeams: any[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('id, external_id, league, name')
      .ilike('league', '%ncaa%')
      .range(offset, offset + limit - 1);
    if (error || !data || data.length === 0) break;
    allTeams.push(...data);
    offset += limit;
  }
  return allTeams;
}

async function fetchAllRosters() {
  const allRosters: any[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('reference_rosters')
      .select('team_id, season_year, league_id')
      .ilike('league_id', '%ncaa%')
      .range(offset, offset + limit - 1);
    if (error || !data || data.length === 0) break;
    allRosters.push(...data);
    offset += limit;
  }
  return allRosters;
}

async function main() {
  const teams = await fetchAllTeams();
  const rosters = await fetchAllRosters();

  console.log(`Total NCAA teams in DB: ${teams.length}`);
  console.log(`Total NCAA reference rosters in DB: ${rosters.length}`);

  const rosterSet = new Set<string>();
  rosters.forEach(r => {
    rosterSet.add(`${r.team_id}_${r.season_year}`);
  });

  const leagueTeams: { [key: string]: any[] } = {};
  teams.forEach(t => {
    if (!leagueTeams[t.league]) leagueTeams[t.league] = [];
    leagueTeams[t.league].push(t);
  });

  const targetSeasons: number[] = [];
  for (let s = 2004; s <= 2026; s++) {
    targetSeasons.push(s);
  }


  console.log('\n--- NCAA COMPLETENESS REPORT (2020-2026) ---');
  for (const league of Object.keys(leagueTeams)) {
    console.log(`\n🏆 League: ${league} (${leagueTeams[league].length} teams)`);
    for (const season of targetSeasons) {
      let missingCount = 0;
      const missingList: string[] = [];
      leagueTeams[league].forEach(t => {
        const hasRoster = rosterSet.has(`${t.id}_${season}`);
        if (!hasRoster) {
          missingCount++;
          if (missingList.length < 5) {
            missingList.push(t.name);
          }
        }
      });
      console.log(`  Season ${season}: ${missingCount} / ${leagueTeams[league].length} teams missing. ${missingCount > 0 ? `Sample missing: ${missingList.join(', ')}` : ''}`);
    }
  }
}

main().catch(console.error);
