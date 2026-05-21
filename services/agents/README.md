# RosterSync AI Agent Architecture

This directory contains specialized AI agents designed to handle the research, creative writing, and data verification needs of the RosterSync platform. 

By moving away from monolithic prompts, we use a **Subagent Architecture** that isolates concerns, reduces hallucinations, and prevents "tool-use distraction."

## 🚀 Core Principles

1.  **Separation of Concerns**: Data gathering (Researcher) is strictly separated from creative prose generation (Narrative Architect).
2.  **Tool Isolation**: Only "Researcher" agents are granted access to Google Search. This ensures that creative writing agents do not hallucinate "new" facts by misinterpreting search results.
3.  **Strict Schemas**: Every agent uses a JSON schema to ensure type-safety and reliable integration with the frontend.
4.  **Batch Processing**: Most agents support batch operations to optimize token usage and reduce latency.

---
## 🤖 Agent Directory

### 1. ResearcherAgent
*   **Purpose**: Deep-dive factual research.
*   **Tools**: Google Search.
*   **Output**: Raw, bulleted facts and numbers in JSON.
*   **Key Methods**: `gatherFacts()`, `gatherFactsBatch()`.

### 2. NarrativeArchitectAgent
*   **Purpose**: Creative writing, tone management, and broadcast scripts.
*   **Tools**: None (Safe for high-fidelity prose).
*   **Output**: "Booth-ready" scripts, headlines, and transition copy.
*   **Key Methods**: `writeBroadcastCopy()`, `writeBroadcastCopyBatch()`.

### 3. LinguistAgent
*   **Purpose**: Centralized linguistic logic.
*   **Tasks**: Simplified Phonetics, IPA, Spanish/Mandarin translations, and Hardware-safe name generation.
*   **Key Methods**: `enrichAthletes()`.

### 4. TeamArchitectAgent
*   **Purpose**: High-level team synthesis.
*   **Tasks**: Game notes, team trivia, storylines, and stadium/venue context.
*   **Key Methods**: `generatePrep()`.

### 5. FactCheckerAgent
*   **Purpose**: Guardrail for data integrity.
*   **Tools**: Google Search.
*   **Tasks**: Verifying if a roster move (trade, injury, signing) is 100% official before a database update.
*   **Key Methods**: `verifyMove()`.

### 6. ScoutAgent (Non-AI)
*   **Purpose**: Standardized Data Fetching.
*   **Tasks**: Interfaces with MLB Stats API, NHL API, and ESPN APIs to fetch live roster states.

### 7. SupportAgent
*   **Purpose**: Help center and documentation assistant.
*   **Tasks**: Analyzes user questions and provides technical support using a specific system prompt.
*   **Location**: `supabase/functions/gemini-chat/SupportAgent.ts`

### 8. DataStewardAgent (Hybrid)
*   **Purpose**: Centralized data formatting and normalization.
*   **Tasks**: Cleans names, formats jersey numbers, removes accents, and prepares hardware-safe names.
*   **Key Methods**: `normalizePlayerName()`, `toSafeName()`, `fixNameCase()`, `formatJerseyNumber()`, `extractJSON()`.

### 9. ExportAgent (Procedural)
*   **Purpose**: Format transformation and broadcast system compatibility.
*   **Tasks**: Converts internal roster data into specialized formats like Ross XML, Vizrt JSON, and various CSV styles.
*   **Key Methods**: `generate()`.


---

## 🛠 Usage & Orchestration

The agents are designed to be orchestrated by a "Master" function in `services/gemini.ts`. 

### Pattern: Sequential Orchestration
To perform a **Deep Scout**, we run a sequential pipeline:

```typescript
// 1. Initialize
const researcher = new ResearcherAgent(apiKey);
const architect = new NarrativeArchitectAgent(apiKey);

// 2. Research (Search enabled)
const rawFacts = await researcher.gatherFacts(name, pos, team, sport);

// 3. Narrative (Search disabled, uses rawFacts)
const copy = await architect.writeBroadcastCopy(name, rawFacts, "ES");

// 4. Return combined result
return { ...copy, stats: rawFacts.stats };
```

---

## 🧪 Development Guidelines

*   **Prompt Tuning**: If an agent's tone needs changing, only modify the prompt in its specific class. Do not add research instructions to a Narrative agent.
*   **Model Selection**: All agents currently utilize `gemini-2.0-flash` for the best balance of speed and reasoning.
*   **Error Handling**: Always wrap agent calls in `try/catch` blocks within the orchestrator to provide meaningful fallbacks to the UI.
