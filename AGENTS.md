# RosterSync Agent & Automation Playbook

This file provides context for AI agents (like Jules) to manage the RosterSync data pipeline.

## 🤖 Core Agents (3-Tier Architecture)

### Tier 1: Data Acquisition
- **ScoutAgent**: Fetches raw roster data from external APIs (ESPN, MLB Stats API).
- **WikipediaScraperAgent**: Extracts biographical and historical data from public sources.

### Tier 2: AI Enrichment
- **LinguistAgent**: Performs AI enrichment (phonetics, Mandarin/Spanish translations).
- **MomentumAgent**: Generates real-time "Narrative Pulses" for broadcast context.
- **FactCheckerAgent**: Verifies recent player movements via Google Search.

### Tier 3: Enterprise Delivery (B2B)
- **ConnectorAgent**: Synchronizes enriched metadata to customer DAMs (Iconik, CatDV) and broadcast systems (Ross, Vizrt).
- **MCP Proxy**: Acts as an Intelligence Wrapper, exposing RosterSync tools directly to external AI agents (Claude, Custom Bots).

## 🛡️ Data Integrity Rules (Append-Only)
- **Never Remove**: A player should **never be deleted** from a roster once they have been associated with a team/season. 
- **Status over Deletion**: If a player is no longer on a team (trade, cut, retirement), update their `status` to `deactivated` or `moved` and set `is_active` to `false`.
- **Historical Accuracy**: Preserving every player who was part of a team's history is a core value proposition of RosterSync.

## 🎓 Specialized Skills
Agents working on this repository MUST use the following project-specific skills:
- **`rostersync-api`**: Protocols for DAM integration, field mapping, and secure delivery.
- **`rostersync-mcp`**: Tool definitions and agent chaining for the Intelligence Server.
- **`mcp-troubleshooter`**: Troubleshoot and diagnose MCP server transport, schema, and runtime errors.
- **`mcp-builder`**: Design, author, and architect MCP servers and tools for the RosterSync ecosystem.

## 🛠️ Automation Scripts
Use these scripts to manage the data pipeline from the terminal. For a full list of commands, see [howto.md](./howto.md).

### 1. Enqueuer (`scripts/enqueue-roster-jobs.ts`)
Adds team sync tasks to the `job_queue` table.
- **Usage**: `npx tsx scripts/enqueue-roster-jobs.ts <leagues> <seasons>`
- **Examples**:
  - `npx tsx scripts/enqueue-roster-jobs.ts nhl 2026`
  - `npx tsx scripts/enqueue-roster-jobs.ts mlb 2000-2025`

### 2. Parallel Worker Runner (`scripts/run-worker.ts`)
Invokes the Supabase Edge Function to process the queue with high concurrency (5 parallel streams).
- **Usage**: `npx tsx scripts/run-worker.ts`
- **Output**: 
  - `🔄 [W1] Requesting job...`
  - `✅ [W1] Successfully processed [Team Name] ([Season]).`

## 📋 Hand-off Instructions for Jules
1. **Target**: Sync 2026 NHL Rosters.
2. **Step 1**: Enqueue the jobs: `npx tsx scripts/enqueue-roster-jobs.ts nhl 2026`
3. **Step 2**: Run the worker: `npx tsx scripts/run-worker.ts`
4. **Step 3**: Monitor for "✨ DONE!" and confirm 32 teams were processed.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
