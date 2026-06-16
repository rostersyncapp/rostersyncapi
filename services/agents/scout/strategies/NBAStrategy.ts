import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * NBA Strategy using stats.nba.com
 * This is much more reliable for historical data than ESPN.
 */
export class NBAStrategy implements IRosterFetchingStrategy {
  private teamIdMap: Record<string, string> = {
    "ATLANTA HAWKS": "1610612737",
    "HAWKS": "1610612737",
    "BOSTON CELTICS": "1610612738",
    "CELTICS": "1610612738",
    "BROOKLYN NETS": "1610612752",
    "NETS": "1610612752",
    "CHARLOTTE HORNETS": "1610612766",
    "HORNETS": "1610612766",
    "CHICAGO BULLS": "1610612741",
    "BULLS": "1610612741",
    "CLEVELAND CAVALIERS": "1610612739",
    "CAVALIERS": "1610612739",
    "CAVS": "1610612739",
    "DALLAS MAVERICKS": "1610612742",
    "MAVERICKS": "1610612742",
    "MAVS": "1610612742",
    "DENVER NUGGETS": "1610612743",
    "NUGGETS": "1610612743",
    "DETROIT PISTONS": "1610612765",
    "PISTONS": "1610612765",
    "GOLDEN STATE WARRIORS": "1610612744",
    "WARRIORS": "1610612744",
    "HOUSTON ROCKETS": "1610612745",
    "ROCKETS": "1610612745",
    "INDIANA PACERS": "1610612746",
    "PACERS": "1610612746",
    "LA CLIPPERS": "1610612747",
    "CLIPPERS": "1610612747",
    "LOS ANGELES CLIPPERS": "1610612747",
    "LOS ANGELES LAKERS": "1610612748",
    "LAKERS": "1610612748",
    "MEMPHIS GRIZZLIES": "1610612763",
    "GRIZZLIES": "1610612763",
    "MIAMI HEAT": "1610612749",
    "HEAT": "1610612749",
    "MILWAUKEE BUCKS": "1610612750",
    "BUCKS": "1610612750",
    "MINNESOTA TIMBERWOLVES": "1610612751",
    "TIMBERWOLVES": "1610612751",
    "T-WOLVES": "1610612751",
    "NEW ORLEANS PELICANS": "1610612740",
    "PELICANS": "1610612740",
    "NEW YORK KNICKS": "1610612753",
    "KNICKS": "1610612753",
    "OKLAHOMA CITY THUNDER": "1610612760",
    "THUNDER": "1610612760",
    "ORLANDO MAGIC": "1610612754",
    "MAGIC": "1610612754",
    "PHILADELPHIA 76ERS": "1610612755",
    "76ERS": "1610612755",
    "SIXERS": "1610612755",
    "PHOENIX SUNS": "1610612756",
    "SUNS": "1610612756",
    "PORTLAND TRAIL BLAZERS": "1610612757",
    "TRAIL BLAZERS": "1610612757",
    "BLAZERS": "1610612757",
    "SACRAMENTO KINGS": "1610612758",
    "SAN ANTONIO SPURS": "1610612759",
    "TORONTO RAPTORS": "1610612761",
    "RAPTORS": "1610612761",
    "UTAH JAZZ": "1610612762",
    "JAZZ": "1610612762",
    "WASHINGTON WIZARDS": "1610612764",
    "WIZARDS": "1610612764"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const nbaId = this.teamIdMap[teamName.toUpperCase()];
    if (!nbaId) {
      console.warn(`[NBAStrategy] ⚠️ No NBA ID found for ${teamName}`);
      return [];
    }

    // Format season: 2026 (representing 2025-26) -> 2025-26
    const startYear = season - 1;
    const seasonEnd = season.toString().slice(-2);
    const seasonStr = `${startYear}-${seasonEnd}`;

    const url = `https://stats.nba.com/stats/commonteamroster?LeagueID=00&Season=${seasonStr}&TeamID=${nbaId}`;
    
    console.log(`[NBAStrategy] 🛰️ Fetching ${teamName} (${seasonStr}) from stats.nba.com...`);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.nba.com/',
          'Origin': 'https://www.nba.com',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!res.ok) {
        throw new Error(`NBA API returned ${res.status}`);
      }

      const data = await res.json();
      
      // NBA Stats API structure: resultSets[0].rowSet is the array of players
      // Indexes: 3=Name, 6=Jersey, 7=Position, 14=PlayerID
      const rowSet = data.resultSets[0].rowSet;
      const headers = data.resultSets[0].headers;
      
      const nameIdx = headers.indexOf('PLAYER');
      const jerseyIdx = headers.indexOf('NUM');
      const posIdx = headers.indexOf('POSITION');
      const idIdx = headers.indexOf('PLAYER_ID');
      const heightIdx = headers.indexOf('HEIGHT');
      const weightIdx = headers.indexOf('WEIGHT');

      // Validation: Ensure the API returned the requested season
      const returnedSeason = data.parameters?.Season;
      if (returnedSeason && returnedSeason !== seasonStr) {
        console.warn(`[NBAStrategy] ⚠️ API returned season ${returnedSeason} but requested ${seasonStr}. Probable fallback.`);
        return [];
      }

      return rowSet.map((row: any) => ({
        id: row[idIdx]?.toString() || Math.random().toString(),
        name: row[nameIdx],
        jersey: row[jerseyIdx],
        position: row[posIdx] || 'ATH',
        teamId: nbaId,
        height: heightIdx !== -1 ? row[heightIdx] : undefined,
        weight: weightIdx !== -1 ? row[weightIdx] : undefined
      }));

    } catch (err) {
      console.error(`[NBAStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
