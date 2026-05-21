import { Agent } from './Agent.ts';

export class MomentumAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async researchPulse(athleteName: string, position: string, teamName: string, sport: string): Promise<any> {
    const prompt = `
    You are a sports news analyst. Research the current momentum, recent news, and pulse for:
    Athlete: ${athleteName}
    Position: ${position}
    Team: ${teamName}
    Sport: ${sport}

    GOAL: Find "volatile" data that is true TODAY but might change tomorrow.
    
    REQUIRED DATA:
    1. News from the last 7 days (Trades, rumors, major performances, off-field events).
    2. Current streaks (e.g., "Has scored in 4 straight games", "Currently on a 10-game hitting streak").
    3. Health & Availability (Current injuries, questionable status, recently returned from IL).
    4. "Pulse" Nuggets (Social media buzz, quotes from coaches/teammates, specific tactical changes).

    RULES:
    - RETURN VALID JSON ONLY.
    - DO NOT write paragraphs.
    - Use this exact schema:
      {
        "recentNews": string[],
        "currentStreaks": string[],
        "healthStatus": string,
        "momentumNuggets": string[]
      }
    `;

    try {
      return await this.callModel(prompt, "MomentumAgent.researchPulse");
    } catch (error) {
      console.error("[MomentumAgent] ❌ Research failed:", error);
      return {
        recentNews: [],
        currentStreaks: [],
        healthStatus: "Healthy",
        momentumNuggets: []
      };
    }
  }
}
