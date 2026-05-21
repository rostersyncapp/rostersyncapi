import { Agent } from './Agent.ts';

export class WikipediaScraperAgent extends Agent {
  constructor(apiKey: string) {
    super(apiKey);
  }

  async scrapeRoster(teamName: string, season: number): Promise<any[]> {
    const wikiTeamName = teamName.replace(/\s+/g, '_');
    const targetUrl = `https://en.wikipedia.org/wiki/${season}_${wikiTeamName}_season`;
    
    console.log(`[WikipediaScraperAgent] 🌐 Scraping Wikipedia: ${targetUrl}`);

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (RosterSync; AI-Agent) Gecko/20100101 Firefox/124.0'
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`[WikipediaScraperAgent] ⚠️ Wikipedia page not found: ${targetUrl}`);
          // Fallback: Try to search for the data using the model (Internal Knowledge)
          return await this.fetchFromKnowledge(teamName, season);
        }
        return [];
      }

      const html = await res.text();
      // Try to find squads or roster tables
      const tables = html.match(/<table[^>]*class="wikitable"[^>]*>([\s\S]*?)<\/table>/gi) || [];
      
      if (tables.length === 0) {
        return await this.fetchFromKnowledge(teamName, season);
      }

      // We take the first 3 tables to be safe (often squad is the first or second wikitable)
      const tableContext = tables.slice(0, 3).join('\n\n');

      const prompt = `
      Extract the roster from this Wikipedia HTML for ${teamName} (${season}).
      Format: { "players": [{ "fullName": string, "jerseyNumber": string, "position": string }] }
      HTML Snippet: ${tableContext.substring(0, 25000)}
      `;

      const parsed = await this.callModel(prompt, "WikipediaScraperAgent.parseHTML");
      return parsed.players || [];

    } catch (err) {
      console.error(`[WikipediaScraperAgent] ❌ Scrape failed:`, err);
      return [];
    }
  }

  private async fetchFromKnowledge(teamName: string, season: number): Promise<any[]> {
    console.log(`[WikipediaScraperAgent] 🧠 Falling back to Internal Knowledge for ${teamName} (${season})...`);
    const prompt = `
    Provide the official roster for the ${teamName} during the ${season} Major League Soccer (MLS) season. 
    Include fullName, jerseyNumber (if known), and position (GK, DF, MD, FW).
    Return valid JSON only.
    Format: { "players": [{ "fullName": string, "jerseyNumber": string, "position": string }] }
    `;
    try {
      const parsed = await this.callModel(prompt, "WikipediaScraperAgent.knowledgeFetch");
      return parsed.players || [];
    } catch (err) {
      console.error(`[WikipediaScraperAgent] ❌ Knowledge fetch failed:`, err);
      return [];
    }
  }
}
