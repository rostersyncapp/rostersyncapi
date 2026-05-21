import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) must be set.');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function enqueueLeague(leagueId: string, season: number) {
  console.log(`\n--- 🏆 Enqueueing League: ${leagueId.toUpperCase()} (Season ${season}) ---`);

  // Fetch teams from the unified table
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, external_id')
    .eq('league', leagueId);

  if (teamsError || !teams) {
    console.error(`[${leagueId}] ❌ Failed to fetch teams from DB:`, teamsError);
    return;
  }

  console.log(`[${leagueId}] Found ${teams.length} teams. Enqueueing...`);

  const jobsToInsert = teams.map(team => ({
    task_type: 'roster_update',
    payload: {
      league: leagueId,
      team_id: team.external_id || team.id,
      team_name: team.name,
      season: season,
      internal_id: team.id
    }
  }));

  if (jobsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('job_queue')
      .insert(jobsToInsert);

    if (insertError) {
      console.error(`[${leagueId}] ❌ Failed to enqueue jobs:`, insertError);
    } else {
      console.log(`[${leagueId}] ✅ Successfully enqueued ${jobsToInsert.length} jobs.`);
    }
  }
}

export async function main() {
  const now = new Date().toISOString().split('T')[0];
  console.log(`[Enqueuer] 🕒 Starting enqueue run at ${new Date().toLocaleString()}`);

  const argLeague = process.argv[2];
  const argSeason = process.argv[3];

  if (argLeague && argSeason) {
    const leagues = argLeague.split(',').map(l => l.trim()).filter(Boolean);
    const seasons: number[] = [];

    if (argSeason.includes('-')) {
      const [start, end] = argSeason.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end; i++) seasons.push(i);
    } else {
      seasons.push(...argSeason.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)));
    }

    console.log(`[Enqueuer] 🎯 Target run: Leagues=${leagues.join(', ')}, Seasons=${seasons.join(', ')}`);

    for (const league of leagues) {
      for (const season of seasons) {
        await enqueueLeague(league, season);
      }
    }

    console.log(`[Enqueuer] ✅ Targeted enqueue complete.`);
    return;
  }

  // Find active leagues
  const { data: activeLeagues, error } = await supabase
    .from('league_seasons')
    .select('*')
    .lte('season_start_date', now)
    .gte('season_end_date', now);

  if (error) {
    console.error('[Enqueuer] ❌ Error fetching active leagues:', error);
    return;
  }

  if (!activeLeagues || activeLeagues.length === 0) {
    console.log('[Enqueuer] 💤 No active leagues found for today.');
    return;
  }

  for (const league of activeLeagues) {
    try {
      await enqueueLeague(league.league_id, league.current_season_year);
    } catch (err) {
      console.error(`[Enqueuer] ❌ Error enqueueing league ${league.league_id}:`, err);
    }
  }

  console.log(`[Enqueuer] ✅ Run complete. All jobs enqueued. Edge Functions will process them asynchronously.`);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(err => {
    console.error('[Enqueuer] 💀 Fatal error:', err);
    process.exit(1);
  });
}
