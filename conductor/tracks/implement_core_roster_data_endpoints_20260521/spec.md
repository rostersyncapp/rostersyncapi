# Specification: Implement Core Roster Data Endpoints

## 1. Overview

This track focuses on implementing the foundational REST API endpoints for accessing core roster data. These endpoints will expose athlete roster information, allowing for retrieval of all roster entries, filtering by team, and individual player details. This track leverages the existing Cloudflare Worker gateway for authentication and rate limiting, routing requests to the Supabase PostgREST API.

## 2. Goals

*   Implement API endpoints to retrieve all roster entries.
*   Implement API endpoints to retrieve roster entries filtered by team.
*   Implement API endpoints to retrieve details for a specific player.
*   Integrate with existing Supabase backend and Cloudflare Worker gateway.
*   Ensure all implemented endpoints are secure, performant, and adhere to API design principles.

## 3. Scope

### In-Scope
*   API endpoint: `GET /v1/rosters` (retrieve all roster entries).
*   API endpoint: `GET /v1/rosters?leagueId={id}&position={pos}` (retrieve roster entries with filters).
*   API endpoint: `GET /v1/rosters/{teamId}` (retrieve roster entries for a specific team).
*   API endpoint: `GET /v1/rosters/players/{playerId}` (retrieve details for a specific player).
*   Basic error handling for API endpoints (e.g., 404 Not Found, 500 Internal Server Error).
*   Unit tests for all new API endpoint logic.

### Out-of-Scope
*   Authentication and Authorization logic (handled by Cloudflare Worker gateway).
*   Rate limiting (handled by Cloudflare Worker gateway).
*   Advanced search capabilities beyond `leagueId` and `position`.
*   Data ingestion or update mechanisms for roster data.
*   UI/UX development for a frontend consumer.
*   Integration with AI enrichment services (this will be a separate track).

## 4. Technical Details



### 4.2 API Endpoints

All endpoints will be exposed via the Cloudflare Worker gateway. The worker will proxy requests to the Supabase PostgREST API.

#### `GET /v1/rosters`

*   **Description:** Retrieves a list of all roster entries from the `public.rosters` and/or `public.reference_rosters` tables, with optional filtering.
*   **Query Parameters:**
    *   `leagueId` (UUID, optional): Filter by league ID.
    *   `position` (TEXT, optional): Filter by player position.
*   **Response:** Array of roster entry objects.

#### `GET /v1/rosters/{teamId}`

*   **Description:** Retrieves all roster entries for a specific team from the `public.rosters` and/or `public.reference_rosters` tables.
*   **Path Parameters:**
    *   `teamId` (UUID, required): The unique identifier of the team.
*   **Response:** Array of roster entry objects for the specified team.

#### `GET /v1/rosters/players/{playerId}`

*   **Description:** Retrieves detailed information for a specific player from the `public.rosters` and/or `public.global_player_enrichment` tables.
*   **Path Parameters:**
    *   `playerId` (UUID, required): The unique identifier of the player.
*   **Response:** Single roster entry object for the specified player.

## 5. Mock Data (for testing and initial development)

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "player_id": "p1a2y3e4-r5f6-7890-1234-567890abcdef",
    "team_id": "t1e2a3m4-e5f6-7890-1234-567890abcdef",
    "league_id": "l1e2a3g4-u5e6-7890-1234-567890abcdef",
    "name": "John Doe",
    "position": "QB",
    "jersey_number": 10,
    "season_year": 2026,
    "created_at": "2026-05-21T12:00:00Z",
    "updated_at": "2026-05-21T12:00:00Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-2345-67890abcdef0",
    "player_id": "p2l3a4y5-e6r7-8901-2345-67890abcdef0",
    "team_id": "t1e2a3m4-e5f6-7890-1234-567890abcdef",
    "league_id": "l1e2a3g4-u5e6-7890-1234-567890abcdef",
    "name": "Jane Smith",
    "position": "WR",
    "jersey_number": 88,
    "season_year": 2026,
    "created_at": "2026-05-21T12:01:00Z",
    "updated_at": "2026-05-21T12:01:00Z"
  }
]
