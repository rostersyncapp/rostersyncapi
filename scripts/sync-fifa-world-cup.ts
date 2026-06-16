import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  convertHeightToMetric,
  convertHeightToImperial,
  convertWeightToMetric,
  convertWeightToImperial,
} from '../services/utils/unit-converters.ts';

dotenv.config();

// Bypass RLS if service role key is present
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

interface RosterPlayer {
  id: string;
  fullName: string;
  jerseyNumber: string;
  position: string;
  height: string;
  weight: string;
  heightImperial: string;
  heightMetric: string;
  weightImperial: string;
  weightMetric: string;
}

async function syncLeagueRosters(leagueId: string, season: number, tableName: string) {
  console.log(`\n🌍 Starting sync for ${leagueId.toUpperCase()} (Season ${season}) into table "${tableName}"...`);

  const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/teams`;
  try {
    const teamsRes = await fetch(teamsUrl);
    if (!teamsRes.ok) {
      throw new Error(`Failed to fetch teams: ${teamsRes.statusText}`);
    }
    const teamsData = await teamsRes.json();
    const teamsList = teamsData.sports?.[0]?.leagues?.[0]?.teams;

    if (!teamsList || !Array.isArray(teamsList)) {
      console.log(`⚠️ No teams found in API response for league: ${leagueId}`);
      return;
    }

    console.log(`Found ${teamsList.length} teams. Syncing rosters...`);

    for (const teamEntry of teamsList) {
      const team = teamEntry.team;
      const teamId = team.id;
      const teamName = team.displayName || team.name;
      const abbreviation = team.abbreviation;
      const logoUrl = team.logos?.[0]?.href || '';

      console.log(`  🔄 Fetching roster for ${teamName} (${abbreviation}) [ID: ${teamId}]...`);

      const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/teams/${teamId}/roster?season=${season}`;
      const rosterRes = await fetch(rosterUrl);
      if (!rosterRes.ok) {
        console.error(`    ❌ Failed to fetch roster for ${teamName} (Status: ${rosterRes.status})`);
        continue;
      }

      const rosterData = await rosterRes.json();
      const athletes = rosterData.athletes || [];
      const players: RosterPlayer[] = [];

      for (const group of athletes) {
        const items = group.items || [group];
        for (const p of items) {
          if (p.fullName) {
            const rawHeight = p.displayHeight || (p.height ? p.height.toString() : '');
            const rawWeight = p.displayWeight || (p.weight ? p.weight.toString() : '');

            // Convert heights and weights using standard unit-converters
            const heightImperial = convertHeightToImperial(rawHeight);
            const heightMetric = convertHeightToMetric(rawHeight);
            const weightImperial = convertWeightToImperial(rawWeight);
            const weightMetric = convertWeightToMetric(rawWeight);

            players.push({
              id: p.id.toString(),
              fullName: p.fullName,
              jerseyNumber: p.jersey || '--',
              position: p.position?.abbreviation || 'ATH',
              height: rawHeight,
              weight: rawWeight,
              heightImperial,
              heightMetric,
              weightImperial,
              weightMetric,
            });
          }
        }
      }

      console.log(`    Saving ${players.length} players to database...`);
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert({
          country_name: teamName,
          abbreviation: abbreviation,
          logo_url: logoUrl,
          roster_data: players,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'country_name',
        });

      if (upsertError) {
        console.error(`    ❌ Failed to save ${teamName}:`, upsertError.message);
      } else {
        console.log(`    ✅ Successfully saved ${teamName}.`);
      }

      // Small delay to be polite to ESPN api
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (err: any) {
    console.error(`❌ Error in syncLeagueRosters for ${leagueId}:`, err.message || err);
  }
}

async function main() {
  console.log('🏁 Starting FIFA World Cup Sync Script...');
  
  // Men's World Cup 2026
  await syncLeagueRosters('fifa.world', 2026, 'fifaworldcupm');

  // Women's World Cup 2023 (latest available on ESPN API)
  await syncLeagueRosters('fifa.wwc', 2023, 'fifaworldcupf');

  console.log('\n✨ All sync tasks finished!');
}

main().catch(err => {
  console.error('💀 Fatal error:', err);
  process.exit(1);
});
