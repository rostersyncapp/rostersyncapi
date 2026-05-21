import { Agent } from './Agent.ts';

export class ArchiveAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async researchHistory(athleteName: string, position: string, teamName: string, sport: string): Promise<any> {
    const prompt = `
    You are a sports historian. Research the complete career history and accolades for:
    Athlete: ${athleteName}
    Position: ${position}
    Current/Recent Team: ${teamName}
    Sport: ${sport}

    GOAL: Find stable, historical facts that don't change daily.
    
    REQUIRED DATA:
    1. All major career awards (MVP, All-Star, Championships, All-Conference, Player of the Year, etc.).
    2. Draft history (Year, Round, Pick, Team) or 'Undrafted' status.
    3. Collegiate career highlights if applicable.
    4. "All-time" trivia (e.g., "First player in school history to...", "Holds the record for...").
    5. Historical bio facts (Birthplace, High School, major life milestones).

    RULES:
    - RETURN VALID JSON ONLY.
    - DO NOT write paragraphs.
    - Use this exact schema:
      {
        "hardwareAccolades": string[],
        "draftStatus": string,
        "collegeHighlights": string[],
        "historicalTrivia": string[],
        "bioFacts": string[]
      }
    `;

    try {
      return await this.callModel(prompt, "ArchiveAgent.researchHistory");
    } catch (error) {
      console.error("[ArchiveAgent] ❌ Research failed:", error);
      return {
        hardwareAccolades: [],
        draftStatus: "Unknown",
        collegeHighlights: [],
        historicalTrivia: [],
        bioFacts: []
      };
    }
  }
}
