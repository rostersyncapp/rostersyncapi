# Plan: Implement Core Roster Data Endpoints

## Phase 1: Basic Roster Endpoints

*   - [~] Task: Implement `GET /v1/rosters` endpoint using existing `public.rosters` and/or `public.reference_rosters` tables.
    *   - [~] Sub-task: Write tests for `GET /v1/rosters` endpoint (should return all roster data).
    *   - [ ] Sub-task: Implement `GET /v1/rosters` endpoint (fetch all data from `public.rosters` and/or `public.reference_rosters` tables).
*   - [ ] Task: Implement `GET /v1/rosters/{teamId}` endpoint using existing `public.rosters` and/or `public.reference_rosters` tables.
    *   - [ ] Sub-task: Write tests for `GET /v1/rosters/{teamId}` endpoint (should return roster data for a specific team).
    *   - [ ] Sub-task: Implement `GET /v1/rosters/{teamId}` endpoint (fetch data for a specific team).
*   - [ ] Task: Conductor - User Manual Verification 'Basic Roster Endpoints' (Protocol in workflow.md)

## Phase 2: Advanced Roster Data Endpoints & Filtering

*   - [ ] Task: Implement `GET /v1/rosters/players/{playerId}` endpoint.
    *   - [ ] Sub-task: Write tests for `GET /v1/rosters/players/{playerId}` endpoint (should return player details).
    *   - [ ] Sub-task: Implement `GET /v1/rosters/players/{playerId}` endpoint (fetch player details).
*   - [ ] Task: Add filtering to `GET /v1/rosters` endpoint.
    *   - [ ] Sub-task: Write tests for `GET /v1/rosters?leagueId={id}` filtering.
    *   - [ ] Sub-task: Implement filtering by `leagueId`.
    *   - [ ] Sub-task: Write tests for `GET /v1/rosters?position={pos}` filtering.
    *   - [ ] Sub-task: Implement filtering by `position`.
*   - [ ] Task: Conductor - User Manual Verification 'Advanced Roster Data Endpoints & Filtering' (Protocol in workflow.md)