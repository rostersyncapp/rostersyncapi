import { Agent } from './Agent.ts';

export class NarrativePulseAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async researchPulse(teamName: string, sport: string): Promise<any> {
    const prompt = `
    You are a sports news producer. Research the current "pulse" and storylines for the ${teamName} (${sport}) TODAY.
    
    GOAL: Find high-volatility news and current form.
    
    REQUIRED DATA:
    1. News from the last 48 hours (Injuries, trades, press conferences, recent wins/losses).
    2. Current performance trends (e.g., "Won 5 straight", "Offense struggling in the red zone").
    3. Key tactical shifts or coaching decisions recently mentioned.
    4. Top 3 storylines for an upcoming broadcast.

    RULES:
    - RETURN VALID JSON ONLY.
    - Use this exact schema:
      {
        "recentNews": string[],
        "currentForm": string,
        "tacticalNotes": string[],
        "broadcastStorylines": string[]
      }
    `;

    try {
      return await this.callModel(prompt, "NarrativePulseAgent.researchPulse");
    } catch (error) {
      console.error("[NarrativePulseAgent] ❌ Research failed:", error);
      return {
        recentNews: [],
        currentForm: "Unknown",
        tacticalNotes: [],
        broadcastStorylines: []
      };
    }
  }
}
