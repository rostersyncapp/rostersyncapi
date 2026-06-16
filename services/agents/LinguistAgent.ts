import { Agent } from './Agent.ts';

export interface LinguisticEnrichment {
  index: number;              // AI-returned index for mapping
  fullName: string;           // Standard Unified Key
  displayNameSafe: string;    // Standard Frontend Key
  phoneticSimplified: string; // Standard UI Key
  phoneticIPA: string;        // Standard Pro Key
  nameMandarin: string;       // Standard AI Key
  spanishTranslation: string; // Standard Broadcast Key
}

/**
 * Rebuilt LinguistAgent (Archaeologist Mode)
 * Simple. Fast. Standardized.
 */
export class LinguistAgent extends Agent {
  async enrichAthletes(names: string[], sport: string, customChunkSize: number = 10): Promise<LinguisticEnrichment[]> {
    if (names.length === 0) return [];

    const chunkSize = customChunkSize;
    const allResults: LinguisticEnrichment[] = [];

    for (let i = 0; i < names.length; i += chunkSize) {
      const chunk = names.slice(i, i + chunkSize);
      const prompt = `### TASK: ATHLETE LINGUISTIC ENRICHMENT
Generate phonetic and translated data for the following athletes. 

### RULES:
1. **index**: Return the exact index number provided in the list (0, 1, 2...).
2. **phoneticSimplified**: Breakdown the name into capitalized phonemes for easy broadcast reading (e.g., "Ranjitsingh" -> "RAN-jit-sing"). Do NOT just copy the name.
3. **phoneticIPA**: Provide the precise International Phonetic Alphabet transcription.
4. **nameMandarin**: Provide a transliteration into Simplified Chinese characters.
5. **spanishTranslation**: Provide the name as it would appear in a Spanish-language broadcast.
6. **JSON**: Return ONLY a JSON object with a "results" array.

### ATHLETES:
${chunk.map((n, idx) => `${idx}. ${n}`).join('\n')}

### OUTPUT FORMAT:
{"results":[{"index":0,"fullName":"...","phoneticSimplified":"...","phoneticIPA":"...","nameMandarin":"...","spanishTranslation":"..."}]}`;

      let retries = 3;
      while (retries > 0) {
        try {
          const batchId = `Batch-${Math.floor(i / chunkSize) + 1}`;
          const response = await this.callModel(prompt, batchId);
          const results = response.results || [];
          allResults.push(...results);
          
          // No cooldown for Local Ollama
          
          break; // Success!
        } catch (err: any) {
          if (err.message.includes('Too Many Requests') || err.message.includes('429')) {
            console.log(`🟡 Batch Rate Limited. Retrying in 20s... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 20000));
            retries--;
          } else {
            console.error(`❌ Batch Failed: ${err.message}`);
            break; // Non-retryable error
          }
        }
      }
    }

    return allResults;
  }
}
