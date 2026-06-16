import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * NWSL Strategy using ESPN's usa.nwsl endpoint.
 */
export class NWSLStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "ANGEL CITY FC": "21422",
    "ANGEL CITY": "21422",
    "BAY FC": "22187",
    "CHICAGO RED STARS": "10420",
    "HOUSTON DASH": "17346",
    "KANSAS CITY CURRENT": "20907",
    "NJ/NY GOTHAM FC": "15364",
    "GOTHAM FC": "15364",
    "NORTH CAROLINA COURAGE": "15366",
    "NC COURAGE": "15366",
    "ORLANDO PRIDE": "18206",
    "PORTLAND THORNS FC": "15362",
    "PORTLAND THORNS": "15362",
    "RACING LOUISVILLE FC": "20905",
    "RACING LOUISVILLE": "20905",
    "SAN DIEGO WAVE FC": "21423",
    "SAN DIEGO WAVE": "21423",
    "SEATTLE REIGN FC": "15363",
    "SEATTLE REIGN": "15363",
    "UTAH ROYALS FC": "19141",
    "UTAH ROYALS": "19141",
    "WASHINGTON SPIRIT": "15365"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    
    if (!mappedId) {
      console.warn(`[NWSLStrategy] ⚠️ No ESPN ID found for ${teamName}. Falling back to teamId: ${teamId}`);
    }

    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[NWSLStrategy] 🛰️ Fetching NWSL roster for ${teamName} (ID: ${finalId})...`);

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
                teamId: teamId,
                height: p.displayHeight || (p.height ? p.height.toString() : undefined),
                weight: p.displayWeight || (p.weight ? p.weight.toString() : undefined)
              });
            }
          }
        }
      }

      console.log(`[NWSLStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;

    } catch (err) {
      console.error(`[NWSLStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
