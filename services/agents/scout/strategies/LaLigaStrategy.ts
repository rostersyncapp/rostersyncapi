import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * La Liga Strategy using ESPN's esp.1 endpoint.
 */
export class LaLigaStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "ALAVES": "96",
    "ALAVÉS": "96",
    "ATHLETIC CLUB": "93",
    "ATHLETIC BILBAO": "93",
    "ATLETICO MADRID": "1068",
    "BARCELONA": "83",
    "CELTA VIGO": "85",
    "ELCHE": "3751",
    "ESPANYOL": "88",
    "GETAFE": "2922",
    "GIRONA": "9812",
    "LAS PALMAS": "87",
    "LEVANTE": "1538",
    "MALLORCA": "84",
    "OSASUNA": "97",
    "RAYO VALLECANO": "101",
    "REAL BETIS": "244",
    "REAL MADRID": "86",
    "REAL OVIEDO": "92",
    "REAL SOCIEDAD": "89",
    "SEVILLA": "243",
    "VALENCIA": "94",
    "VILLARREAL": "102"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[LaLigaStrategy] 🛰️ Fetching La Liga roster for ${teamName} (ID: ${finalId})...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);

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

      console.log(`[LaLigaStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[LaLigaStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
