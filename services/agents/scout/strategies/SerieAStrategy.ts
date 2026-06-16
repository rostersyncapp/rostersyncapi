import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Serie A Strategy using ESPN's ita.1 endpoint.
 */
export class SerieAStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "INTERNAZIONALE": "110",
    "INTER MILAN": "110",
    "INTER": "110",
    "AC MILAN": "103",
    "MILAN": "103",
    "JUVENTUS": "111",
    "NAPOLI": "114",
    "AS ROMA": "104",
    "ROMA": "104",
    "LAZIO": "112",
    "ATALANTA": "105",
    "FIORENTINA": "109",
    "BOLOGNA": "107",
    "TORINO": "239",
    "UDINESE": "118",
    "HELLAS VERONA": "119",
    "VERONA": "119",
    "GENOA": "3263",
    "PARMA": "115",
    "LECCE": "113",
    "CAGLIARI": "2925",
    "COMO": "2572",
    "SASSUOLO": "3997",
    "PISA": "3956",
    "CREMONESE": "4050"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[SerieAStrategy] 🛰️ Fetching Serie A roster for ${teamName} (ID: ${finalId})...`);

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

      console.log(`[SerieAStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[SerieAStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
