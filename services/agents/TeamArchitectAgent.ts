import { SchemaType } from '@google/generative-ai';
import { Agent } from './Agent.ts';
import { TeamLegacyAgent } from './TeamLegacyAgent.ts';
import { NarrativePulseAgent } from './NarrativePulseAgent.ts';
import { EnvironmentAgent } from './EnvironmentAgent.ts';
import { IntelligenceCacheService } from '../IntelligenceCacheService.ts';

export class TeamArchitectAgent extends Agent {

  constructor(apiKey: string) {
    super(apiKey);
  }

  protected getTools(): any[] {
    return []; // Writer model without tools for higher fidelity prose
  }

  protected getGenerationConfig(): any {
    return {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          gameNotes: { type: SchemaType.STRING },
          teamTrivia: { type: SchemaType.STRING },
          keyStorylines: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          venueContext: { type: SchemaType.STRING },
          broadcastScript: { type: SchemaType.STRING }
        },
        required: ["gameNotes", "teamTrivia", "keyStorylines", "venueContext", "broadcastScript"]
      }
    };
  }

  async generatePrep(teamName: string, sport: string, rosterContext: string, targetLanguage: string = "EN"): Promise<any> {
    const legacyAgent = new TeamLegacyAgent(this.apiKey);
    const pulseAgent = new NarrativePulseAgent(this.apiKey);
    const envAgent = new EnvironmentAgent(this.apiKey);

    // 1. PHASE 0: Cache Check
    const cached = await IntelligenceCacheService.getTeamCache(teamName, sport);
    const needs = IntelligenceCacheService.getRefreshNeeds(cached, 'team');

    console.log(`[TeamOrchestrator] Cache status for ${teamName}:`, { cached: !!cached, needs });

    // 2. PHASE 1: Parallel Fact Gathering
    let legacyFacts = cached?.legacy;
    let pulseFacts = cached?.pulse;
    let envFacts = cached?.environment;

    const tasks: Promise<void>[] = [];

    if (needs.includes('legacy')) {
      tasks.push((async () => {
        console.log(`[TeamOrchestrator] TeamLegacyAgent dispatching for ${teamName}...`);
        legacyFacts = await legacyAgent.researchLegacy(teamName, sport);
      })());
    }

    if (needs.includes('pulse')) {
      tasks.push((async () => {
        console.log(`[TeamOrchestrator] NarrativePulseAgent dispatching for ${teamName}...`);
        pulseFacts = await pulseAgent.researchPulse(teamName, sport);
      })());
    }

    if (needs.includes('environment')) {
      tasks.push((async () => {
        console.log(`[TeamOrchestrator] EnvironmentAgent dispatching for ${teamName}...`);
        envFacts = await envAgent.researchEnvironment(teamName, sport);
      })());
    }

    await Promise.all(tasks);

    // 3. PHASE 2: Cache Update
    if (needs.length > 0) {
      await IntelligenceCacheService.saveTeamCache(teamName, sport, {
        legacy: legacyFacts,
        pulse: pulseFacts,
        environment: envFacts
      });
    }

    // 4. PHASE 3: Narrative Synthesis
    const combinedResearch = {
      ...legacyFacts,
      ...pulseFacts,
      ...envFacts,
      rosterContext
    };

    const writerPrompt = `
    You are an Emmy-winning sports producer. 
    Synthesize a broadcast Team Prep package for the ${teamName} (${sport}) using the research provided.
    Translate everything to: ${targetLanguage}

    RESEARCH DATA:
    ${JSON.stringify(combinedResearch, null, 2)}

    Required JSON Structure:
    {
      "gameNotes": "Detailed tactical overview of current form and trends",
      "teamTrivia": "3-5 high-impact bullet points of historical facts and records",
      "keyStorylines": ["compelling storyline 1", "storyline 2", "storyline 3"],
      "venueContext": "Rich context on the stadium, playing surface, and environment",
      "broadcastScript": "A punchy, broadcaster-ready 60-second opening monologue"
    }
    `;

    try {
      return await this.callModel(writerPrompt, "TeamArchitectAgent.generatePrep");
    } catch (error) {
      console.error("[TeamArchitectAgent] Failed to synthesize team prep:", error);
      throw error;
    }
  }
}
