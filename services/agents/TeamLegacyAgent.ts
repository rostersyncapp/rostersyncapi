import { Agent } from './Agent.ts';

export class TeamLegacyAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async researchLegacy(teamName: string, sport: string): Promise<any> {
    const prompt = `
    You are a sports historian. Research the deep historical legacy and trivia for the ${teamName} (${sport}).
    
    GOAL: Find stable, all-time records and unique historical facts.
    
    REQUIRED DATA:
    1. Championships and major titles (All-time count and most recent).
    2. Famous alumni or legendary players/coaches.
    3. Unique team traditions or origins.
    4. "All-time" statistical records held by the franchise.
    5. Rivalry history and significant milestones.

    RULES:
    - RETURN VALID JSON ONLY.
    - Use this exact schema:
      {
        "allTimeChampionships": string,
        "legendaryFigures": string[],
        "uniqueTraditions": string[],
        "franchiseRecords": string[],
        "rivalryContext": string
      }
    `;

    try {
      return await this.callModel(prompt, "TeamLegacyAgent.researchLegacy");
    } catch (error) {
      console.error("[TeamLegacyAgent] ❌ Research failed:", error);
      return {
        allTimeChampionships: "Unknown",
        legendaryFigures: [],
        uniqueTraditions: [],
        franchiseRecords: [],
        rivalryContext: "N/A"
      };
    }
  }
}
