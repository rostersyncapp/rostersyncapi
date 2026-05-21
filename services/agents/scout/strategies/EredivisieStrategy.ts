import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Eredivisie Strategy using ESPN's ned.1 endpoint.
 */
export class EredivisieStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    // Note: ESPN ned.1 endpoint supports historical rosters via the season param
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/teams/${teamId}/roster?season=${season}`;
    
    console.log(`[EredivisieStrategy] 🛰️ Fetching Eredivisie roster for ${teamName} (ID: ${teamId})...`);

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

      console.log(`[EredivisieStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;

    } catch (err) {
      console.error(`[EredivisieStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
