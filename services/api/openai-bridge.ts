/**
 * RosterSync OpenAI Bridge Specification (OpenAPI 3.1.0)
 * This specification allows OpenAI GPTs and Assistants to interact with 
 * RosterSync Intelligence tools via "Actions".
 */
export const openAiBridgeSpec = {
  openapi: "3.1.0",
  info: {
    title: "RosterSync Intelligence API",
    description: "Broadcast-grade athlete intelligence, phonetics, and automated DAM synchronization.",
    version: "1.0.0"
  },
  servers: [
    {
      url: "https://api.rostersync.app/v1/ai",
      description: "Production Intelligence Server"
    }
  ],
  paths: {
    "/phonetics": {
      get: {
        operationId: "getAthletePhonetics",
        summary: "Get broadcast-grade phonetics for an athlete",
        parameters: [
          {
            name: "playerName",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Full name of the athlete"
          }
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    player_name: { type: "string" },
                    phonetic_name: { type: "string" },
                    ipa_name: { type: "string" },
                    chinese_name: { type: "string" },
                    audio_url: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/brief": {
      get: {
        operationId: "getBoothBrief",
        summary: "Generate a high-speed game-day cheat sheet",
        parameters: [
          {
            name: "homeTeam",
            in: "query",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "awayTeam",
            in: "query",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "leagueId",
            in: "query",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "A structured brief for the game",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    brief_text: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/sync": {
      post: {
        operationId: "syncToDAM",
        summary: "Synchronize athlete metadata to an external DAM system",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playerName: { type: "string" },
                  connectorType: { type: "string", enum: ["iconik", "catdv", "webhook"] },
                  apiKey: { type: "string" }
                },
                required: ["playerName", "connectorType", "apiKey"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Sync confirmation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-RS-Key"
      }
    }
  },
  security: [
    { ApiKeyAuth: [] }
  ]
};
