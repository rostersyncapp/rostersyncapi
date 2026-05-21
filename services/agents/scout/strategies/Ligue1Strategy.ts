import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Ligue 1 Strategy using ESPN's fra.1 endpoint.
 */
export class Ligue1Strategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "LENS": "175",
    "RC LENS": "175",
    "LILLE": "166",
    "LOSC": "166",
    "LYON": "167",
    "OLYMPIQUE LYONNAIS": "167",
    "MARSEILLE": "176",
    "OLYMPIQUE MARSEILLE": "176",
    "MONACO": "174",
    "AS MONACO": "174",
    "NANTES": "165",
    "FC NANTES": "165",
    "NICE": "2502",
    "OGC NICE": "2502",
    "PARIS SAINT-GERMAIN": "160",
    "PSG": "160",
    "RENNES": "169",
    "STADE RENNAIS": "169",
    "STRASBOURG": "180",
    "RC STRASBOURG": "180",
    "TOULOUSE": "179",
    "LORIENT": "273",
    "FC LORIENT": "273",
    "ANGERS": "7868",
    "SCO ANGERS": "7868",
    "BREST": "6997",
    "STADE BRESTOIS": "6997",
    "LE HAVRE": "3236",
    "HAC": "3236",
    "METZ": "177",
    "FC METZ": "177",
    "AUXERRE": "172",
    "AJ AUXERRE": "172",
    "PARIS FC": "6851",
    "PFC": "6851"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[Ligue1Strategy] 🛰️ Fetching Ligue 1 roster for ${teamName} (ID: ${finalId})...`);

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

      console.log(`[Ligue1Strategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[Ligue1Strategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
