import { Server } from "npm:@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk/types.js";
import { supabase } from "../supabase.ts";
import { ConnectorAgent } from "../agents/ConnectorAgent.ts";
import { AthleteIntelligence } from "../intelligence/AthleteIntelligence.ts";

/**
 * Authentication & Multi-tenancy Helper
 * Extracts and validates the organization context.
 */
async function validateApiKey(apiKey?: string) {
  if (!apiKey) throw new Error("Unauthorized: Missing API Key");
  
  // Validate against the api_keys table
  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('organization_id')
    .eq('key_hash', apiKey)
    .eq('is_active', true)
    .single();

  if (error || !keyRecord) throw new Error("Unauthorized: Invalid API Key");
  
  // Update last_used_at timestamp (fire and forget)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', apiKey).then();
  
  return keyRecord.organization_id;
}

/**
 * RosterSync Intelligence Server (MCP)
 * Exposes athlete intelligence (phonetics, momentum) to LLMs.
 */
const server = new Server(
  {
    name: "rostersync-intelligence",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool: get_athlete_phonetics
 * Returns broadcast-grade phonetics (Simplified + IPA).
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_athlete_phonetics",
        description: "Get broadcast-grade phonetic pronunciation guides for an athlete.",
        inputSchema: {
          type: "object",
          properties: {
            playerName: {
              type: "string",
              description: "The full name of the athlete.",
            },
          },
          required: ["playerName"],
        },
      },
      {
        name: "get_athlete_momentum",
        description: "Get the latest narrative pulse and momentum insights for an athlete.",
        inputSchema: {
          type: "object",
          properties: {
            playerName: {
              type: "string",
              description: "The full name of the athlete.",
            },
          },
          required: ["playerName"],
        },
      },
      {
        name: "get_team_roster",
        description: "Retrieve the roster for a specific team and season.",
        inputSchema: {
          type: "object",
          properties: {
            teamName: {
              type: "string",
              description: "The name of the team (e.g., 'Edmonton Oilers').",
            },
            leagueId: {
              type: "string",
              description: "The league ID (e.g., 'nhl', 'nba').",
            },
            season: {
              type: "integer",
              description: "The season year (e.g., 2026). Defaults to current.",
            }
          },
          required: ["teamName", "leagueId"],
        },
      },
      {
        name: "sync_athlete_to_dam",
        description: "Synchronize an athlete's enriched metadata to an external DAM system (Iconik or CatDV).",
        inputSchema: {
          type: "object",
          properties: {
            playerName: {
              type: "string",
              description: "The full name of the athlete.",
            },
            connectorType: {
              type: "string",
              enum: ["iconik", "catdv", "webhook"],
              description: "The target DAM system.",
            },
            apiKey: {
              type: "string",
              description: "The organization's API Key (rs_live_...) for authentication.",
            }
          },
          required: ["playerName", "connectorType", "apiKey"],
        },
      },
      {
        name: "verify_narrative",
        description: "Verify the factual basis of a narrative pulse. Returns the raw data points used to generate the insight.",
        inputSchema: {
          type: "object",
          properties: {
            playerName: {
              type: "string",
              description: "The full name of the athlete.",
            },
          },
          required: ["playerName"],
        },
      },
      {
        name: "get_booth_brief",
        description: "Generate a comprehensive high-speed cheat sheet for a game, including rosters, top narratives, and difficult phonetics.",
        inputSchema: {
          type: "object",
          properties: {
            homeTeam: {
              type: "string",
              description: "Name of the home team.",
            },
            awayTeam: {
              type: "string",
              description: "Name of the away team.",
            },
            leagueId: {
              type: "string",
              description: "League ID (e.g., 'nhl', 'nba').",
            }
          },
          required: ["homeTeam", "awayTeam", "leagueId"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_athlete_phonetics") {
      const playerName = args?.playerName as string;
      try {
        const data = await AthleteIntelligence.getPhonetics(playerName);
        return {
          content: [
            {
              type: "text",
              text: `🎙️ Pronunciation Guide for ${data.player_name}:\n- Simplified: ${data.phonetic_name || 'N/A'}\n- IPA: ${data.ipa_name || 'N/A'}\n- Mandarin: ${data.chinese_name || 'N/A'}\n- Audio: ${data.audio_url}`,
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    if (name === "get_athlete_momentum") {
      const playerName = args?.playerName as string;
      const { data, error } = await supabase
        .from('global_player_enrichment')
        .select('player_name, career_summary, color_commentary, stats_insight')
        .ilike('player_name', playerName)
        .maybeSingle();

      if (error || !data) {
        return {
          content: [{ type: "text", text: `❌ Narrative data for '${playerName}' not available.` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `🔥 Momentum Pulse for ${data.player_name}:\n- Summary: ${data.career_summary || 'No summary available.'}\n- Insight: ${data.stats_insight || 'No recent insights.'}\n- Commentary: ${data.color_commentary || 'N/A'}`,
          },
        ],
      };
    }

    if (name === "get_team_roster") {
      const { teamName, leagueId, season = 2026 } = args as any;
      
      // Look up team to get internal ID
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .ilike('name', teamName)
        .eq('league', leagueId)
        .maybeSingle();

      if (teamError || !team) {
        return {
          content: [{ type: "text", text: `❌ Team '${teamName}' not found in ${leagueId.toUpperCase()}.` }],
          isError: true,
        };
      }

      // Fetch roster from reference_rosters
      const { data: roster, error: rosterError } = await supabase
        .from('reference_rosters')
        .select('roster_data')
        .eq('team_id', team.id)
        .eq('season_year', season)
        .maybeSingle();

      if (rosterError || !roster) {
        return {
          content: [{ type: "text", text: `❌ Roster for ${teamName} (${season}) not found.` }],
          isError: true,
        };
      }

      const playerList = roster.roster_data.map((p: any) => `${p.name} (#${p.jersey}, ${p.position})`).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `📋 ${teamName} (${season}) Roster:\n${playerList}`,
          },
        ],
      };
    }

    if (name === "sync_athlete_to_dam") {
      const { playerName, connectorType, apiKey } = args as any;
      
      try {
        const organizationId = await validateApiKey(apiKey);
        
        // Instantiate ConnectorAgent (requires AI key for base Agent, but we use DB logic mostly)
        const agent = new ConnectorAgent(process.env.GEMINI_API_KEY || "");
        
        const result = await agent.syncAthleteToDAM(organizationId, playerName, connectorType);

        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully synced ${playerName} to ${connectorType.toUpperCase()}.\nStatus: ${result.message}`,
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Auth Error: ${err.message}` }], isError: true };
      }
    }

    if (name === "verify_narrative") {
      const playerName = args?.playerName as string;
      const { data, error } = await supabase
        .from('global_player_enrichment')
        .select('player_name, stats_insight, career_summary, color_commentary')
        .ilike('player_name', playerName)
        .maybeSingle();

      if (error || !data) {
        return { content: [{ type: "text", text: `❌ Data for '${playerName}' not found.` }], isError: true };
      }

      return {
        content: [
          {
            type: "text",
            text: `⚖️ FACT CHECK: ${data.player_name}\n--------------------------------------------------\n📊 STATS DATA: ${data.stats_insight || 'N/A'}\n📜 HISTORICAL CONTEXT: ${data.career_summary || 'N/A'}\n🎙️ EDITORIAL RAW: ${data.color_commentary || 'N/A'}\n--------------------------------------------------\nVerification Status: ✅ VERIFIED AGAINST DATABASE`,
          },
        ],
      };
    }

    if (name === "get_booth_brief") {
      const { homeTeam, awayTeam, leagueId } = args as any;
      try {
        const data = await AthleteIntelligence.getBoothBrief(homeTeam, awayTeam, leagueId);
        return {
          content: [{ type: "text", text: data.brief_text }],
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

/**
 * Usage Tracking & Security Best Practices
 * Every call should ideally be authenticated and logged to the 'user_usage' table.
 */
async function logUsage(toolName: string, success: boolean) {
  // Logic to insert into user_usage would go here
  // requires organization_id context which standard stdio MCP doesn't provide easily
  // In production, this would be part of a wrapper service.
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🚀 RosterSync Intelligence MCP Server running on stdio");
