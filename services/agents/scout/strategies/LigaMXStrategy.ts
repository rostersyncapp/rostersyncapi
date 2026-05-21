import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Liga MX Strategy using ESPN's mex.1 endpoint.
 */
export class LigaMXStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "AMÉRICA": "227",
    "AMERICA": "227",
    "CLUB AMERICA": "227",
    "ATLAS": "216",
    "ATLAS FC": "216",
    "ATLÉTICO DE SAN LUIS": "15720",
    "ATLETICO SAN LUIS": "15720",
    "CRUZ AZUL": "218",
    "GUADALAJARA": "219",
    "CHIVAS": "219",
    "CLUB GUADALAJARA": "219",
    "FC JUÁREZ": "17851",
    "JUAREZ": "17851",
    "FC JUAREZ": "17851",
    "LEÓN": "228",
    "LEON": "228",
    "CLUB LEON": "228",
    "MAZATLÁN FC": "20702",
    "MAZATLAN": "20702",
    "MONTERREY": "220",
    "RAYADOS": "220",
    "CF MONTERREY": "220",
    "NECAXA": "229",
    "CLUB NECAXA": "229",
    "PACHUCA": "234",
    "TUZOS": "234",
    "CF PACHUCA": "234",
    "PUEBLA": "231",
    "PUEBLA FC": "231",
    "PUMAS UNAM": "233",
    "PUMAS": "233",
    "UNAM": "233",
    "QUERÉTARO": "222",
    "QUERETARO": "222",
    "QUERETARO FC": "222",
    "SANTOS LAGUNA": "225",
    "SANTOS": "225",
    "TIGRES UANL": "232",
    "TIGRES": "232",
    "TIJUANA": "10125",
    "XOLOS": "10125",
    "CLUB TIJUANA": "10125",
    "TOLUCA": "223",
    "DEPORTIVO TOLUCA FC": "223"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[LigaMXStrategy] 🛰️ Fetching Liga MX roster for ${teamName} (ID: ${finalId})...`);

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

      console.log(`[LigaMXStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[LigaMXStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
