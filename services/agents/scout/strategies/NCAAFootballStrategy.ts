import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { fetchNCAARosterFromCore, resolveTeamInfo } from '../utils.ts';

/**
 * NCAA Football Strategy using ESPN's Core API.
 */
export class NCAAFootballStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const info = await resolveTeamInfo(leagueId, teamName, teamId);
    const finalId = info?.id || teamId;
    
    console.log(`[NCAAFootballStrategy] 🛰️ Fetching NCAA Football roster for ${teamName} (ID: ${finalId}, Season: ${season}) via Core API...`);

    return await fetchNCAARosterFromCore('football', 'college-football', finalId, season);
  }
}
