import { Agent } from './Agent.ts';

export class ResearcherAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async gatherFacts(athleteName: string, position: string, teamName: string, sport: string, searchHint: string = ""): Promise<any> {
    const hintText = searchHint ? `\nCRITICAL HINT: "${searchHint}". Use this to disambiguate the player.` : "";
    
    const prompt = `
    You are a sports data researcher. Find the most recent, verified facts for:
    Athlete: ${athleteName}
    Position: ${position}
    Team: ${teamName}
    Sport: ${sport}
    ${hintText}

     RULES:
     1. DO NOT write prose or paragraphs. Return raw bullet points and numbers within a JSON structure.
     2. Focus on the current season stats, recent injuries, trades, and major career awards.
     3. Return valid JSON only, using this schema:
        {
          "careerSummaryFacts": string[],
          "awardsList": string[],
          "stats": object,
          "recentNews": string[],
          "verifiedSources": {title: string, uri: string}[]
        }
     4. Ground your findings in official sources.
    `;

    try {
      return await this.callModel(prompt, "ResearcherAgent.gatherFacts");
    } catch (error) {
      console.error("[ResearcherAgent] ❌ Gather facts failed:", error);
      throw error;
    }
  }

  async gatherFactsBatch(athletes: { name: string, position: string }[], teamName: string, sport: string): Promise<any[]> {
    if (athletes.length === 0) return [];

    const athleteList = athletes.map(a => `- ${a.name} (${a.position})`).join('\n');
    const prompt = `
    Gather raw, verified facts for the following athletes on the ${teamName} (${sport}):
    ${athleteList}

    Return a JSON object with a 'results' array containing one object per athlete.
    Each object must have: fullName, careerSummaryFacts (array), awardsList (array), and stats (object).
    `;

    try {
      const parsed = await this.callModel(prompt, "ResearcherAgent.gatherFactsBatch");
      return parsed.results || [];
    } catch (error) {
      console.error("[ResearcherAgent] ❌ Batch gather facts failed:", error);
      return [];
    }
  }
}
