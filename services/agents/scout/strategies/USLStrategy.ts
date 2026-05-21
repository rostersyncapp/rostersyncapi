import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * USL Strategy using ESPN's usa.usl.1 endpoint.
 */
export class USLStrategy implements IRosterFetchingStrategy {
  private teamMap: Record<string, string> = {
    "BIRMINGHAM LEGION FC": "19405",
    "BROOKLYN FC": "131579",
    "CHARLESTON BATTERY": "9729",
    "COLORADO SPRINGS SWITCHBACKS FC": "17830",
    "DETROIT CITY FC": "19179",
    "EL PASO LOCOMOTIVE FC": "19407",
    "FC TULSA": "18446",
    "HARTFORD ATHLETIC": "19411",
    "INDY ELEVEN": "17360",
    "LAS VEGAS LIGHTS FC": "18987",
    "LEXINGTON SC": "21822",
    "LOUDOUN UNITED FC": "19410",
    "LOUISVILLE CITY FC": "17832",
    "MIAMI FC": "18159",
    "MONTEREY BAY FC": "21370",
    "NEW MEXICO UNITED": "19408",
    "OAKLAND ROOTS SC": "20687",
    "ORANGE COUNTY SC": "18455",
    "PHOENIX RISING FC": "17850",
    "PITTSBURGH RIVERHOUNDS SC": "17827",
    "RHODE ISLAND FC": "22164",
    "SACRAMENTO REPUBLIC FC": "17828",
    "SAN ANTONIO FC": "18265",
    "SPORTING CLUB JACKSONVILLE": "131578",
    "TAMPA BAY ROWDIES": "17361"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    const mappedId = this.teamMap[teamName.toUpperCase()];
    
    if (!mappedId) {
      console.warn(`[USLStrategy] ⚠️ No ESPN ID found for ${teamName}. Falling back to teamId: ${teamId}`);
    }

    const finalId = mappedId || teamId;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.usl.1/teams/${finalId}/roster?season=${season}`;
    
    console.log(`[USLStrategy] 🛰️ Fetching USL roster for ${teamName} (ID: ${finalId})...`);

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

      console.log(`[USLStrategy] ✅ Found ${players.length} players for ${teamName}`);
      return players;

    } catch (err) {
      console.error(`[USLStrategy] ❌ Failed to fetch ${teamName}:`, err);
      return [];
    }
  }
}
