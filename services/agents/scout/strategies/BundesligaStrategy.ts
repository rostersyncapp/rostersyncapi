import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Bundesliga Strategy using ESPN's ger.1 endpoint.
 */
export class BundesligaStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "FC AUGSBURG": "3841",
    "AUGSBURG": "3841",
    "BAYER LEVERKUSEN": "131",
    "BAYERN MUNICH": "132",
    "BORUSSIA DORTMUND": "124",
    "BORUSSIA MONCHENGLADBACH": "268",
    "EINTRACHT FRANKFURT": "125",
    "SC FREIBURG": "126",
    "FREIBURG": "126",
    "TSG HOFFENHEIM": "7911",
    "HOFFENHEIM": "7911",
    "MAINZ 05": "2950",
    "RB LEIPZIG": "11420",
    "1. FC UNION BERLIN": "598",
    "UNION BERLIN": "598",
    "VFB STUTTGART": "134",
    "VFL WOLFSBURG": "138",
    "WERDER BREMEN": "137",
    "FC COLOGNE": "122",
    "HAMBURG SV": "127",
    "FC ST. PAULI": "270",
    "ST. PAULI": "270",
    "1. FC HEIDENHEIM 1846": "6418",
    "HEIDENHEIM": "6418"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[BundesligaStrategy] 🛰️ Fetching Bundesliga roster for ${teamName} (ID: ${finalId})...`);

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
                teamId: teamId,
                height: p.displayHeight || (p.height ? p.height.toString() : undefined),
                weight: p.displayWeight || (p.weight ? p.weight.toString() : undefined)
              });
            }
          }
        }
      }

      console.log(`[BundesligaStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[BundesligaStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
