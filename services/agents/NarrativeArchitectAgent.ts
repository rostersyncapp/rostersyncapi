import { SchemaType } from '@google/generative-ai';
import { Agent } from './Agent.ts';

export class NarrativeArchitectAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  protected getTools(): any[] {
    return []; // No tools provided. Strictly focused on writing and translation.
  }

  protected getGenerationConfig(): any {
    return {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          careerSummary: { type: SchemaType.STRING },
          boothHeadline: { type: SchemaType.STRING },
          boothShortScript: { type: SchemaType.STRING },
          deepScoutLeadIn: { type: SchemaType.STRING },
          deepScoutStatStory: { type: SchemaType.STRING },
          deepScoutSummary: { type: SchemaType.STRING },
          hardwareAccolades: { 
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
          },
          broadcastNuggets: { 
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
          },
          broadcastTrivia: { 
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
          },
          narrativeNuggets: {
            type: SchemaType.OBJECT,
            properties: {
              momentum: { type: SchemaType.STRING },
              trivia: { type: SchemaType.STRING },
              tactics: { type: SchemaType.STRING },
              milestone: { type: SchemaType.STRING }
            }
          }
        },
        required: ["careerSummary", "boothHeadline", "boothShortScript", "deepScoutLeadIn", "deepScoutSummary", "hardwareAccolades", "broadcastNuggets", "broadcastTrivia"]
      }
    };
  }

  async writeBroadcastCopy(athleteName: string, rawFacts: any, targetLanguage: string = "EN"): Promise<any> {
    const prompt = `
    You are an Emmy-winning sports broadcast writer. 
    Write "booth-ready" copy for ${athleteName} using ONLY the verified facts provided below.
    Translate the final output to: ${targetLanguage}

    VERIFIED FACTS:
    ${JSON.stringify(rawFacts, null, 2)}

    RULES:
    1. Do not invent new statistics. Rely entirely on the VERIFIED FACTS.
    2. "boothHeadline": A punchy 2-3 word tag (e.g., "The Franchise", "Rookie Sensation").
    3. "boothShortScript": A 15-second transition script for a broadcaster.
    4. "deepScoutStatStory": Combine a stat with a narrative context.
    5. "deepScoutSummary": A bulleted ‘Nugget Sheet’ summarizing the most important facts.
    6. "hardwareAccolades": List the 3-5 most impressive career awards found.
    7. "broadcastNuggets": Create 3 punchy, on-air ready facts about their recent form or current streak.
    8. "broadcastTrivia": Extract the single most surprising historical fact or record.
    `;

    try {
      return await this.callModel(prompt, "NarrativeArchitect.writeBroadcastCopy");
    } catch (error) {
      console.error("[NarrativeArchitect] Failed to write copy:", error);
      throw error;
    }
  }

  async writeBroadcastCopyBatch(athleteFacts: { name: string, facts: any }[], targetLanguage: string = "EN"): Promise<any[]> {
    if (athleteFacts.length === 0) return [];

    const prompt = `
    Generate "booth-ready" broadcast copy for the following athletes using the provided verified facts.
    Translate to: ${targetLanguage}

    DATA:
    ${JSON.stringify(athleteFacts, null, 2)}

    Return a JSON object with a 'results' array. Each result must include:
    fullName, careerSummary, boothHeadline, boothShortScript, deepScoutStatStory, deepScoutSummary, narrativeNuggets.
    `;

    try {
      const parsed = await this.callModel(prompt, "NarrativeArchitect.writeBroadcastCopyBatch");
      return parsed.results || [];
    } catch (error) {
      console.error("[NarrativeArchitect] Batch write copy failed:", error);
      return [];
    }
  }
}
