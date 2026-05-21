import { Agent } from './Agent.ts';

export class EnvironmentAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async researchEnvironment(teamName: string, sport: string): Promise<any> {
    const prompt = `
    You are a sports venue analyst. Research the venue/stadium environment for the ${teamName} (${sport}).
    
    GOAL: Find static and logistical facts about the home field/arena.
    
    REQUIRED DATA:
    1. Stadium/Arena Name and location.
    2. Playing surface (e.g., Grass, Turf, Hardwood, Ice).
    3. Notable features or recent upgrades (e.g., "New video board", "Retractable roof").
    4. Weather impact (e.g., "Windy due to bay proximity", "Strictly climate controlled").
    5. Capacity and general atmosphere notes.

    RULES:
    - RETURN VALID JSON ONLY.
    - Use this exact schema:
      {
        "venueName": string,
        "surfaceType": string,
        "stadiumFeatures": string[],
        "environmentalFactors": string,
        "capacity": string
      }
    `;

    try {
      return await this.callModel(prompt, "EnvironmentAgent.researchEnvironment");
    } catch (error) {
      console.error("[EnvironmentAgent] ❌ Research failed:", error);
      return {
        venueName: "Unknown",
        surfaceType: "N/A",
        stadiumFeatures: [],
        environmentalFactors: "N/A",
        capacity: "Unknown"
      };
    }
  }
}
