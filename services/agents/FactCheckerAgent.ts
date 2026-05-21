import { Agent } from './Agent.ts';

export class FactCheckerAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async verifyMove(playerName: string, teamName: string, league: string): Promise<any> {
    console.log(`[FactChecker] Verifying move for ${playerName}...`);

    const prompt = `
    Search for official roster info regarding athlete ${playerName} on the team ${teamName} in the ${league} league.

    Is this player an active member of this team's roster for the current or upcoming season?
    We want to confirm they are officially part of the organization.

    Return a JSON object:
    {
      "isOfficial": boolean,
      "confirmationSource": "URL of roster page or news report",
      "reasoning": "brief explanation"
    }
    `;

    try {
      return await this.callModel(prompt, "FactCheckerAgent.verifyMove");
    } catch (err) {
      console.error("[FactChecker] ❌ Verification failed:", err);
      return { isOfficial: false, reasoning: "Error during verification." };
    }
  }
}
