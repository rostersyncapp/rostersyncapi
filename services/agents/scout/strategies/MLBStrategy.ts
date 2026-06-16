import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { resolveTeamInfo } from '../utils.ts';

const MLB_TEAM_ALIASES: Record<string, string[]> = {
  'Washington Nationals': ['Montreal Expos'],
  'Cleveland Guardians': ['Cleveland Indians'],
  'Miami Marlins': ['Florida Marlins'],
  'Tampa Bay Rays': ['Tampa Bay Devil Rays'],
  'Los Angeles Angels': ['Anaheim Angels', 'Los Angeles Angels of Anaheim'],
};

export class MLBStrategy implements IRosterFetchingStrategy {
  private MLB_STATS_API = 'https://statsapi.mlb.com/api/v1';

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    console.log(`[MLBStrategy] Fetching ${teamName} for ${season} (${leagueId})...`);
    
    // 1. Determine which sportIds to check
    // MLB = 1
    // MiLB = 11 (Triple-A) only per user request
    const sportIds = leagueId === 'mlb' ? [1] : [11];
    
    let officialTeam: any = null;

    for (const sportId of sportIds) {
      const teamsUrl = `${this.MLB_STATS_API}/teams?sportId=${sportId}&season=${season}`;
      const teamsRes = await fetch(teamsUrl);
      const teamsData = await teamsRes.json();
      
      const namesToTry = [teamName, ...(MLB_TEAM_ALIASES[teamName] || [])];
      
      officialTeam = teamsData.teams?.find((t: any) => 
        namesToTry.some(n => 
          t.name.toLowerCase().includes(n.toLowerCase()) || 
          n.toLowerCase().includes(t.teamName.toLowerCase())
        )
      );

      if (officialTeam) {
        console.log(`[MLBStrategy] Found ${teamName} in sportId ${sportId}`);
        break;
      }
    }

    if (!officialTeam) {
      console.warn(`[MLBStrategy] ⚠️ Could not find official MLB ID for ${teamName}`);
      return [];
    }

    const activeId = officialTeam.id;
    console.log(`[MLBStrategy] Map: ${teamName} -> MLB ID ${activeId}`);

    // 2. Fetch the roster
    const url = `${this.MLB_STATS_API}/teams/${activeId}/roster?season=${season}&hydrate=person(height,weight)`;
    const res = await fetch(url);
    const data = await res.json();
    
    return (data.roster || []).map((p: any) => ({
      id: p.person.id.toString(),
      name: p.person.fullName,
      jersey: p.jerseyNumber,
      position: p.position.abbreviation,
      teamId: activeId.toString(),
      height: p.person.height,
      weight: p.person.weight ? p.person.weight.toString() : undefined
    }));
  }
}
