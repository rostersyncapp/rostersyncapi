import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { resolveTeamInfo } from '../utils.ts';

export class NHLStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const info = await resolveTeamInfo(leagueId, teamName, teamId);
    if (!info || !info.id) return [];
    
    // NHL API uses abbreviations like BOS, CHI, etc.
    const teamCode = info.id as string;
    const nhlSeason = `${season - 1}${season}`;
    
    const url = `https://api-web.nhle.com/v1/roster/${teamCode}/${nhlSeason}`;
    console.log(`[NHL] Fetching: ${url}`);
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[NHL] ⚠️ Failed to fetch ${url}: ${res.statusText}`);
        return [];
      }
      
      const data: any = await res.json();
      const athletes: RosterPlayer[] = [];
      const processPlayer = (p: any) => ({
        id: p.id.toString(),
        name: `${p.firstName.default} ${p.lastName.default}`,
        jersey: p.sweaterNumber?.toString() || "00",
        position: p.positionCode || "ATH",
        teamId: teamCode,
        height: p.heightInInches ? `${Math.floor(p.heightInInches / 12)}'${p.heightInInches % 12}"` : undefined,
        weight: p.weightInPounds ? p.weightInPounds.toString() : undefined
      });
      data.forwards?.forEach((p: any) => athletes.push(processPlayer(p)));
      data.defensemen?.forEach((p: any) => athletes.push(processPlayer(p)));
      data.goalies?.forEach((p: any) => athletes.push(processPlayer(p)));
      return athletes;
    } catch (err) {
      console.error(`[NHL] ❌ Error fetching roster:`, err);
      return [];
    }
  }
}
