import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';
import { fetchNCAARosterFromCore, resolveTeamInfo } from '../utils.ts';

/**
 * NCAA Womens Basketball Strategy using ESPN's Core API.
 */
export class NCAAWomensBasketballStrategy implements IRosterFetchingStrategy {
  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const info = await resolveTeamInfo(leagueId, teamName, teamId);
    const finalId = info?.id || teamId;
    
    console.log(`[NCAAWomensBasketballStrategy] 🛰️ Fetching NCAA Womens Basketball roster for ${teamName} (ID: ${finalId}, Season: ${season}) via Core API...`);

    return await fetchNCAARosterFromCore('basketball', 'womens-college-basketball', finalId, season);
  }
}
