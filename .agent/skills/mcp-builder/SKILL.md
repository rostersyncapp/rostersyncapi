---
name: mcp-builder
description: Design, author, and architect MCP servers and tools for the RosterSync ecosystem. Targets MCP spec v2024.11.
---

# MCP Builder

You are the expert for building production MCP servers and tools. You design clean, well-documented tool interfaces, apply RosterSync architecture patterns, and follow security best practices.

## Core Directives

1. **Design for AI First:** Tool descriptions must be high-entropy — rich with detail about input/output types, example values, and edge cases so LLMs understand exactly when and how to invoke them.
2. **Architect for Scale:** Follow RosterSync server patterns for the appropriate use case (REST wrapper, search orchestrator, normalizer, or metadata sync).
3. **Secure by Default:** Never expose secrets, internal paths, or stack traces. Sanitize all tool outputs before returning them.

---

## Tool Authoring

### Minimal Tool Definition (TypeScript SDK)

Define the tool and register its handler:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// 1. Tool definition (what the LLM sees)
const tool = {
  name: "get_team_roster",
  description: "Returns the current roster for a given team and season. "
    + "Input: league (nhl|mlb|nba|nfl), team_id (string), season (integer). "
    + "Output: array of player objects with name, position, jersey_number, status.",
  inputSchema: {
    type: "object",
    properties: {
      league: { type: "string", enum: ["nhl", "mlb", "nba", "nfl"] },
      team_id: { type: "string", description: "ESPN team ID, e.g. BOS" },
      season: { type: "integer", description: "Season year, e.g. 2026" },
    },
    required: ["league", "team_id", "season"],
    examples: [{ league: "nhl", team_id: "BOS", season: 2026 }],
  },
};

// 2. Handler registration (server.setRequestHandler must use the SAME name)
server.setRequestHandler(
  CallToolRequestSchema,
  async ({ params }) => {
    const { league, team_id, season } = params;
    // ... tool logic
    return { content: [{ type: "text", text: JSON.stringify(roster) }] };
  }
);
```

Common pitfall: the tool `name` in the definition and the handler registration must match exactly. Case-sensitive.

### Using Zod for Input Validation

```typescript
import { z } from "zod";

const GetTeamRosterSchema = z.object({
  league: z.enum(["nhl", "mlb", "nba", "nfl"]),
  team_id: z.string().min(1),
  season: z.number().int().min(1900).max(2100),
});

// In your handler:
const result = GetTeamRosterSchema.safeParse(params);
if (!result.success) {
  return {
    content: [{ type: "text", text: `Invalid params: ${result.error.message}` }],
    isError: true,
  };
}
```

---

## High-Entropy Description Patterns

The LLM uses the tool description to decide when and how to call your tool. Low-quality descriptions cause mis-invocation and hallucinated params.

**Poor:** `"Gets a roster."`

**Better:** `"Fetches the active roster for a sports team from the RosterSync pipeline. "
  + "Returns up to 60 players with fields: id, full_name, position, jersey_number, "
  + "status (active|injured|reserve), and height_inches. "
  + "Use this when asked about a team's current players, depth chart, or lineup."`

Key elements of a high-entropy description:
- **What it does** — one sentence summarizing the action
- **Input types and constraints** — include enums, ranges, and required vs optional fields
- **Output structure** — describe the shape of the response (array of objects, single value, etc.)
- **When to use it** — help the LLM decide between similar tools
- **Edge cases** — note empty states, rate limits, or partial data scenarios

Add `examples` in the input schema to give the LLM concrete input patterns:

```json
"examples": [
  { "league": "nhl", "team_id": "BOS", "season": 2026 },
  { "league": "mlb", "team_id": "NYY", "season": 2025 }
]
```

---

## RosterSync Architecture Patterns

Reference `docs/mcp-strategy.md` for full context. Apply these patterns:

### Intelligence Server (External B2B)
- **Pattern:** REST Wrapper
- **Key tools:** `get_athlete_phonetics`, `get_team_roster`, `get_athlete_momentum`
- **Tip:** Use caching (Redis or in-memory TTL cache) for high-frequency phonetic lookups to minimize broadcaster latency.

### Sports Web Researcher (Internal)
- **Pattern:** Search Orchestrator
- **Key tools:** `search_recent_sports_news`, `check_injury_status`
- **Tip:** Implement strict rate-limiting and source filtering (ESPN, MLB.com, league-specific sites) to ensure data pedigree.

### Official League Data (Ingestion)
- **Pattern:** Multi-API Normalizer
- **Key tools:** `fetch_raw_roster(league, team)`
- **Tip:** Map chaotic league-specific JSON to the Unified RosterSync Schema inside the MCP tool logic, keeping the ScoutAgent simple.

### DAM Connector (Broadcast)
- **Pattern:** Metadata Sync
- **Key tools:** `update_dam_metadata`, `query_asset_by_phonetic`
- **Tip:** Use atomic updates (or transactional patterns) to prevent partial metadata syncs in Iconik/CatDV.

---

## Security Notes

- **No secrets in logs:** Never log API keys, tokens, or passwords. Sanitize error messages before returning them to the LLM.
- **No internal details in output:** Tool outputs should not include file paths, stack traces, internal variable names, or system details.
- **Validate external URLs:** If a tool fetches external URLs, validate and sanitize all user-provided URLs to prevent SSRF.
- **Rate limiting:** Implement rate limits on tools that call external APIs to prevent abuse and quota exhaustion.
- **Atomic operations:** For tools that write to databases or external systems, use transactions or rollback logic to avoid partial state.

---

> A great builder creates tools that LLMs want to use. Clarity, consistency, and security are your metrics.