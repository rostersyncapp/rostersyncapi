# Plan: Implement Core Roster Data Endpoints

## Phase 1: Basic Roster Endpoints [checkpoint: 17c570f]

*   - [x] Task: Implement `GET /v1/rosters` endpoint using existing `public.rosters` and/or `public.reference_rosters` tables. d8a4c21
    *   - [x] Sub-task: Write tests for `GET /v1/rosters` endpoint (should return all roster data).
    *   - [x] Sub-task: Implement `GET /v1/rosters` endpoint (fetch all data from `public.rosters` and/or `public.reference_rosters` tables).
*   - [x] Task: Implement `GET /v1/rosters/{teamId}` endpoint using existing `public.rosters` and/or `public.reference_rosters` tables. 7441c8f
    *   - [x] Sub-task: Write tests for `GET /v1/rosters/{teamId}` endpoint (should return roster data for a specific team).
    *   - [x] Sub-task: Implement `GET /v1/rosters/{teamId}` endpoint (fetch data for a specific team).
*   - [x] Task: Conductor - User Manual Verification 'Basic Roster Endpoints' (Protocol in workflow.md) 17c570f

## Phase 2: Advanced Roster Data Endpoints & Filtering [checkpoint: 541753c]

*   - [x] Task: Implement `GET /v1/rosters/players/{playerId}` endpoint.
    *   - [x] Sub-task: Write tests for `GET /v1/rosters/players/{playerId}` endpoint (should return player details).
    *   - [x] Sub-task: Implement `GET /v1/rosters/players/{playerId}` endpoint (fetch player details).
*   - [x] Task: Add filtering to `GET /v1/rosters` endpoint.
    *   - [x] Sub-task: Write tests for `GET /v1/rosters?leagueId={id}` filtering.
    *   - [x] Sub-task: Implement filtering by `leagueId`.
    *   - [x] Sub-task: Write tests for `GET /v1/rosters?position={pos}` filtering.
    *   - [x] Sub-task: Implement filtering by `position`.
*   - [x] Task: Conductor - User Manual Verification 'Advanced Roster Data Endpoints & Filtering' (Protocol in workflow.md) 541753c