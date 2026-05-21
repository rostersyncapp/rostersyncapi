import { supabase } from "../supabase.ts";

/**
 * AthleteIntelligence Service
 * Shared core logic for MCP tools, REST API, and OpenAI Bridge.
 */
export class AthleteIntelligence {
  
  static async getPhonetics(playerName: string) {
    const { data, error } = await supabase
      .from('global_player_enrichment')
      .select('player_name, phonetic_name, ipa_name, chinese_name')
      .ilike('player_name', playerName)
      .maybeSingle();

    if (error || !data) throw new Error(`Athlete '${playerName}' not found.`);

    return {
      ...data,
      audio_url: `https://rostersync.app/api/v1/audio/${data.player_name.toLowerCase().replace(/\s+/g, '-')}.mp3`
    };
  }

  static async getBoothBrief(homeTeam: string, awayTeam: string, leagueId: string) {
    // 1. Fetch Rosters & Enrichment in parallel
    const fetchTeamData = async (name: string) => {
      const { data: team } = await supabase.from('teams').select('id, name').ilike('name', name).eq('league', leagueId).maybeSingle();
      if (!team) return null;

      const { data: roster } = await supabase.from('reference_rosters').select('roster_data').eq('team_id', team.id).eq('season_year', 2026).maybeSingle();
      const playerNames = (roster?.roster_data || []).map((p: any) => p.name);

      const { data: enrichment } = await supabase
        .from('global_player_enrichment')
        .select('player_name, phonetic_name, stats_insight, career_summary')
        .in('player_name', playerNames);

      return { team, enrichment: enrichment || [] };
    };

    const [homeData, awayData] = await Promise.all([
      fetchTeamData(homeTeam),
      fetchTeamData(awayTeam)
    ]);

    if (!homeData || !awayData) throw new Error("One or both teams not found.");

    // 2. Curate "Top Narratives"
    const getTopInsights = (data: any) => data.enrichment
      .filter((e: any) => e.stats_insight)
      .slice(0, 5)
      .map((e: any) => `🔥 ${e.player_name}: ${e.stats_insight}`)
      .join('\n');

    const briefText = `
🏟️ BOOTH BRIEF: ${awayTeam.toUpperCase()} @ ${homeTeam.toUpperCase()}
--------------------------------------------------
🔥 TOP MOMENTUM (HOME):
${getTopInsights(homeData)}

🔥 TOP MOMENTUM (AWAY):
${getTopInsights(awayData)}
--------------------------------------------------
Ready for Broadcast.
    `;

    return { brief_text: briefText };
  }
}
