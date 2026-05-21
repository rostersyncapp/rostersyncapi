import { fetchNCAARosterFromCore, resolveTeamInfo } from '../utils.ts';

/**
 * NCAA Basketball Strategy using ESPN's Core API.
 */
export class NCAABasketballStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const info = await resolveTeamInfo(leagueId, teamName, teamId);
    const finalId = info?.id || teamId;
    
    console.log(`[NCAABasketballStrategy] 🛰️ Fetching NCAA Mens Basketball roster for ${teamName} (ID: ${finalId}, Season: ${season}) via Core API...`);

    return await fetchNCAARosterFromCore('basketball', 'mens-college-basketball', finalId, season);
  }
}
