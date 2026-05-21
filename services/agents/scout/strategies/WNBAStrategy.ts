import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * WNBA Strategy using stats.nba.com (LeagueID=10)
 */
export class WNBAStrategy implements IRosterFetchingStrategy {
  private teamIdMap: Record<string, string> = {
    "ATLANTA DREAM": "1611661330",
    "CHICAGO SKY": "1611661329",
    "CONNECTICUT SUN": "1611661323",
    "DALLAS WINGS": "1611661321",
    "INDIANA FEVER": "1611661325",
    "LAS VEGAS ACES": "1611661319",
    "LOS ANGELES SPARKS": "1611661320",
    "MINNESOTA LYNX": "1611661324",
    "NEW YORK LIBERTY": "1611661313",
    "PHOENIX MERCURY": "1611661317",
    "SEATTLE STORM": "1611661328",
    "WASHINGTON MYSTICS": "1611661322"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const wnbaId = this.teamIdMap[teamName.toUpperCase()];
    if (!wnbaId) {
      console.warn(`[WNBAStrategy] ⚠️ No WNBA ID found for ${teamName}`);
      return [];
    }

    // WNBA uses single year format: 2024
    const seasonStr = season.toString();

    const url = `https://stats.nba.com/stats/commonteamroster?LeagueID=10&Season=${seasonStr}&TeamID=${wnbaId}`;
    
    console.log(`[WNBAStrategy] 🛰️ Fetching ${teamName} (${seasonStr}) from stats.nba.com...`);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.wnba.com/',
          'Origin': 'https://www.wnba.com',
          'Accept': '*/*',
        }
      });

      if (!res.ok) {
        throw new Error(`WNBA API returned ${res.status}`);
      }

      const data = await res.json();
      const rowSet = data.resultSets[0].rowSet;
      const headers = data.resultSets[0].headers;
      
      const nameIdx = headers.indexOf('PLAYER');
      const jerseyIdx = headers.indexOf('NUM');
      const posIdx = headers.indexOf('POSITION');
      const idIdx = headers.indexOf('PLAYER_ID');

      // Validation: Ensure the API returned the requested season
      const returnedSeason = data.parameters?.Season;
      if (returnedSeason && returnedSeason !== seasonStr) {
        console.warn(`[WNBAStrategy] ⚠️ API returned season ${returnedSeason} but requested ${seasonStr}. Probable fallback.`);
        return [];
      }

      return rowSet.map((row: any) => ({
        id: row[idIdx]?.toString() || Math.random().toString(),
        name: row[nameIdx],
        jersey: row[jerseyIdx],
        position: row[posIdx] || 'ATH',
        teamId: wnbaId
      }));

    } catch (err) {
      console.error(`[WNBAStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
