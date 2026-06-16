import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * NFL Strategy using nflverse data (GitHub)
 * The most reliable source for historical NFL rosters (back to 1920).
 */
export class NFLStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "ARIZONA CARDINALS": "ARI",
    "ATLANTA FALCONS": "ATL",
    "BALTIMORE RAVENS": "BAL",
    "BUFFALO BILLS": "BUF",
    "CAROLINA PANTHERS": "CAR",
    "CHICAGO BEARS": "CHI",
    "CINCINNATI BENGALS": "CIN",
    "CLEVELAND BROWNS": "CLE",
    "DALLAS COWBOYS": "DAL",
    "DENVER BRONCOS": "DEN",
    "DETROIT LIONS": "DET",
    "GREEN BAY PACKERS": "GB",
    "HOUSTON TEXANS": "HOU",
    "INDIANAPOLIS COLTS": "IND",
    "JACKSONVILLE JAGUARS": "JAX",
    "KANSAS CITY CHIEFS": "KC",
    "LAS VEGAS RAIDERS": "LV",
    "OAKLAND RAIDERS": "OAK",
    "LOS ANGELES CHARGERS": "LAC",
    "SAN DIEGO CHARGERS": "SD",
    "LOS ANGELES RAMS": "LAR",
    "ST. LOUIS RAMS": "STL",
    "MIAMI DOLPHINS": "MIA",
    "MINNESOTA VIKINGS": "MIN",
    "NEW ENGLAND PATRIOTS": "NE",
    "NEW ORLEANS SAINTS": "NO",
    "NEW YORK GIANTS": "NYG",
    "NEW YORK JETS": "NYJ",
    "PHILADELPHIA EAGLES": "PHI",
    "PITTSBURGH STEELERS": "PIT",
    "SAN FRANCISCO 49ERS": "SF",
    "SEATTLE SEAHAWKS": "SEA",
    "TAMPA BAY BUCCANEERS": "TB",
    "TENNESSEE TITANS": "TEN",
    "WASHINGTON COMMANDERS": "WAS",
    "WASHINGTON REDSKINS": "WAS",
    "WASHINGTON FOOTBALL TEAM": "WAS"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const nflAbbr = this.teamMap[teamName.toUpperCase()];
    if (!nflAbbr) {
      console.warn(`[NFLStrategy] ⚠️ No NFL abbreviation found for ${teamName}`);
      return [];
    }

    const url = `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${season}.csv`;
    
    console.log(`[NFLStrategy] 🛰️ Fetching NFL ${season} rosters from nflverse...`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`nflverse returned ${res.status}`);
      }

      const csvText = await res.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      const teamIdx = headers.indexOf('team');
      const nameIdx = headers.indexOf('full_name');
      const posIdx = headers.indexOf('position');
      const jerseyIdx = headers.indexOf('jersey_number');
      const idIdx = headers.indexOf('gsis_id');
      const heightIdx = headers.indexOf('height');
      const weightIdx = headers.indexOf('weight');

      const players: RosterPlayer[] = [];
      
      // Standardize search abbreviation (nflverse uses some old ones)
      let searchAbbr = nflAbbr;
      if (searchAbbr === 'ARI') searchAbbr = 'ARZ'; // nflverse legacy
      if (searchAbbr === 'BAL') searchAbbr = 'BLT'; // nflverse legacy
      if (searchAbbr === 'CLE') searchAbbr = 'CLV'; // nflverse legacy
      if (searchAbbr === 'HOU') searchAbbr = 'HST'; // nflverse legacy

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvLine(lines[i]);
        if (row[teamIdx] === nflAbbr || row[teamIdx] === searchAbbr) {
          let rawHeight = row[heightIdx];
          if (rawHeight) {
            const inches = parseInt(rawHeight, 10);
            if (!isNaN(inches) && inches > 30 && inches < 100) {
              const feet = Math.floor(inches / 12);
              const remainingInches = inches % 12;
              rawHeight = `${feet}'${remainingInches}"`;
            }
          }

          players.push({
            id: row[idIdx] || Math.random().toString(),
            name: row[nameIdx],
            jersey: row[jerseyIdx],
            position: row[posIdx] || 'ATH',
            teamId: teamId,
            height: rawHeight || undefined,
            weight: row[weightIdx] || undefined
          });
        }
      }

      console.log(`[NFLStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;

    } catch (err) {
      console.error(`[NFLStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }

  // Simple CSV parser to handle quotes and commas
  private parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}
