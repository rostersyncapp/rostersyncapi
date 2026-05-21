import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * Premier League Strategy using ESPN's eng.1 endpoint.
 */
export class PremierLeagueStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "AFC BOURNEMOUTH": "349",
    "ARSENAL": "359",
    "ASTON VILLA": "362",
    "BRENTFORD": "337",
    "BRIGHTON & HOVE ALBION": "331",
    "BURNLEY": "379",
    "CHELSEA": "363",
    "CRYSTAL PALACE": "384",
    "EVERTON": "368",
    "FULHAM": "370",
    "LEEDS UNITED": "357",
    "SUNDERLAND": "366",
    "IPSWICH TOWN": "373",
    "LEICESTER CITY": "375",
    "LIVERPOOL": "364",
    "LUTON TOWN": "389",
    "MANCHESTER CITY": "382",
    "MANCHESTER UNITED": "360",
    "NEWCASTLE UNITED": "361",
    "NOTTINGHAM FOREST": "393",
    "SHEFFIELD UNITED": "398",
    "SOUTHAMPTON": "376",
    "TOTTENHAM HOTSPUR": "367",
    "WEST HAM UNITED": "371",
    "WOLVERHAMPTON WANDERERS": "380"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[PremierLeagueStrategy] 🛰️ Fetching Premier League roster for ${teamName} (ID: ${finalId})...`);

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

      console.log(`[PremierLeagueStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;
    } catch (err) {
      console.error(`[PremierLeagueStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
