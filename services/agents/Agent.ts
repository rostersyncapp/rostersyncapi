import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry } from '../ai-utils.ts';

/**
 * Enterprise Agent Base Class (Exclusively Gemini Powered)
 */
export abstract class Agent {
  private genAI: GoogleGenerativeAI;

  constructor(protected apiKey: string) {
    if (!apiKey) {
      throw new Error("CRITICAL: No Gemini API Key provided to Agent.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // Optional hooks for subclasses to provide specific AI configurations
  protected getTools?(): any[];
  protected getGenerationConfig?(): any;
  protected getSystemInstruction?(): any;

  protected getModelName(): string {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  }

  protected async callModel(prompt: string, context?: string): Promise<any> {
    const modelName = this.getModelName();

    try {
      const modelParams: any = { model: modelName };
      if (this.getTools) modelParams.tools = this.getTools();
      if (this.getGenerationConfig) modelParams.generationConfig = this.getGenerationConfig();
      if (this.getSystemInstruction) modelParams.systemInstruction = this.getSystemInstruction();

      const model = this.genAI.getGenerativeModel(modelParams, { apiVersion: "v1" });
      const result = await withRetry(async () => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }, { maxRetries: 3, initialDelay: 100 }, context);

      return this.extractJSON(result);
    } catch (err) {
      console.error(`[${context}] ❌ GEMINI Call Failed:`, err);
      throw err;
    }
  }

  private extractJSON(text: string): any {
    try {
      const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[1] || match[0]);
      return JSON.parse(text);
    } catch (e) {
      return {};
    }
  }
}
