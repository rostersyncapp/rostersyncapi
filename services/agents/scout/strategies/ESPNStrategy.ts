import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { resolveTeamInfo } from '../utils.ts';
import { DB_LEAGUE_TO_ESPN_LEAGUE } from '../../../leagueData.ts';

export class ESPNStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const espnLeague = DB_LEAGUE_TO_ESPN_LEAGUE[leagueId] || leagueId;
    const sport = (leagueId === 'nba' || leagueId === 'wnba' || leagueId === 'ncaa_mb' || leagueId === 'ncaa_wb') ? 'basketball' :
                  (leagueId === 'nfl' || leagueId === 'ncaa_fb') ? 'football' :
                  (leagueId === 'mlb' || leagueId === 'milb') ? 'baseball' :
                  (leagueId === 'nhl') ? 'hockey' : 'soccer';
    
    const info = await resolveTeamInfo(leagueId, teamName, teamId);
    const mappedId = info?.id?.toString();
    if (!mappedId) return [];

    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${espnLeague}/teams/${mappedId}/roster?season=${season}`;
    const res = await fetch(url);
    const data = await res.json();
    const athletes: RosterPlayer[] = [];
    if (data.athletes && Array.isArray(data.athletes)) {
      for (const group of data.athletes) {
        const items = group.items || [group];
        for (const p of items) {
          if (p.fullName) {
            athletes.push({
              id: p.id.toString(),
              name: p.fullName,
              jersey: p.jersey,
              position: p.position?.abbreviation || "ATH",
              teamId: mappedId,
              height: p.displayHeight || (p.height ? p.height.toString() : undefined),
              weight: p.displayWeight || (p.weight ? p.weight.toString() : undefined)
            });
          }
        }
      }
    }
    return athletes;
  }
}
