import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { WikipediaScraperAgent } from '../../WikipediaScraperAgent.ts';

/**
 * MLS Strategy using ESPN's usa.1 endpoint with Wikipedia fallback for historical seasons.
 */
export class MLSStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "ATLANTA UNITED FC": "18418",
    "AUSTIN FC": "20906",
    "CF MONTRÉAL": "9720",
    "CF MONTREAL": "9720",
    "CHARLOTTE FC": "21300",
    "CHICAGO FIRE FC": "182",
    "CHICAGO FIRE": "182",
    "COLORADO RAPIDS": "184",
    "COLUMBUS CREW": "183",
    "D.C. UNITED": "193",
    "DC UNITED": "193",
    "FC CINCINNATI": "18267",
    "FC DALLAS": "185",
    "HOUSTON DYNAMO FC": "6077",
    "HOUSTON DYNAMO": "6077",
    "INTER MIAMI CF": "20232",
    "LA GALAXY": "187",
    "LOS ANGELES GALAXY": "187",
    "LAFC": "18966",
    "LOS ANGELES FC": "18966",
    "MINNESOTA UNITED FC": "17362",
    "NASHVILLE SC": "18986",
    "NEW ENGLAND REVOLUTION": "189",
    "NEW YORK CITY FC": "17606",
    "NEW YORK RED BULLS": "190",
    "RED BULL NEW YORK": "190",
    "ORLANDO CITY SC": "12011",
    "ORLANDO CITY": "12011",
    "PHILADELPHIA UNION": "10739",
    "PORTLAND TIMBERS": "9723",
    "REAL SALT LAKE": "4771",
    "SAN DIEGO FC": "22529",
    "SAN JOSE EARTHQUAKES": "191",
    "SEATTLE SOUNDERS FC": "9726",
    "SPORTING KANSAS CITY": "186",
    "ST. LOUIS CITY SC": "21812",
    "TORONTO FC": "7318",
    "VANCOUVER WHITECAPS FC": "9727",
    "VANCOUVER WHITECAPS": "9727"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    // 1. Fallback to Wikipedia for seasons <= 2003 (missing from ESPN)
    if (season <= 2003 && apiKey) {
      console.log(`[MLSStrategy] 📚 Season ${season} is missing from ESPN. Falling back to Wikipedia...`);
      const scraper = new WikipediaScraperAgent(apiKey);
      const players = await scraper.scrapeRoster(teamName, season);
      
      if (players.length > 0) {
        return players.map((p: any, idx: number) => ({
          id: `wiki-${teamName}-${season}-${idx}`,
          name: p.fullName,
          jersey: p.jerseyNumber || "",
          position: p.position || "ATH",
          teamId: teamId
        }));
      }
      
      console.warn(`[MLSStrategy] ⚠️ Wikipedia scrape returned 0 players for ${teamName} (${season}).`);
    }

    const mappedId = this.teamMap[teamName.toUpperCase()];

    if (!mappedId) {
      console.warn(`[MLSStrategy] ⚠️ No ESPN ID found for ${teamName}. Falling back to teamId: ${teamId}`);
    }

    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/${finalId}/roster?season=${season}`;

    console.log(`[MLSStrategy] 🛰️ Fetching MLS roster for ${teamName} (ID: ${finalId}) via ESPN...`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`ESPN API returned ${res.status}`);
      }

      const data = await res.json();
      const players: RosterPlayer[] = [];

      if (data.athletes && Array.isArray(data.athletes)) {
        for (const group of data.athletes) {
          const items = group.items || [group];
          for (const p of items) {
            if (p.fullName) {
              players.push({
                id: p.id.toString(),
                name: p.fullName,
                jersey: p.jersey,
                position: p.position?.abbreviation || "ATH",
                teamId: teamId
              });
            }
          }
        }
      }

      console.log(`[MLSStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;

    } catch (err) {
      console.error(`[MLSStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
