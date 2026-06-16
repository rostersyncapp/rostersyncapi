# Plan: Implement Advanced API Features

## Phase 1: Athlete Intelligence Endpoints

*   - [x] Task: Implement `GET /v1/athletes/{playerId}` endpoint.
    *   - [x] Sub-task: Write tests for athlete profile retrieval.
    *   - [x] Sub-task: Implement retrieval from `global_player_enrichment` (fallback to basic data if missing).
*   - [x] Task: Implement `GET /v1/athletes/{playerId}/intelligence` endpoint.
    *   - [x] Sub-task: Write tests for AI intelligence data retrieval.
    *   - [x] Sub-task: Implement specifically fetching AI fields (phonetics, translations).

## Phase 2: Broadcast Export Engine

*   - [x] Task: Implement `GET /v1/teams/{teamIdentifier}/export` endpoint.
    *   - [x] Sub-task: Write unit tests for all export combinations (Vizrt/Ross/Chyron x XML/JSON/CSV).
    *   - [x] Sub-task: Implement Vizrt export (XML, JSON, CSV formats including logo URL & AI phonetics).
    *   - [x] Sub-task: Implement Ross Video export (XML, JSON, CSV formats including logo URL & AI phonetics).
    *   - [x] Sub-task: Implement Chyron PRIME export (XML, JSON, CSV formats including logo URL & AI phonetics).
*   - [x] Task: Integrate download capability in RosterSync Hub GUI.
    *   - [x] Sub-task: Add a "Download Roster" button with dropdown options to choose format & type in the matchup dashboard.


## Phase 3: Delta Feed & Operations

*   - [x] Task: Implement `GET /v1/changes` endpoint.
    *   - [x] Sub-task: Write tests for timestamp-based filtering on `reference_rosters`.
    *   - [x] Sub-task: Implement delta query logic.
*   - [x] Task: Implement `POST /v1/athletes/{playerId}/corrections` endpoint.
    *   - [x] Sub-task: Write tests for correction submission.
    *   - [x] Sub-task: Implement basic logging/storage for corrections.

## Phase 4: Final Verification

*   - [x] Task: Conductor - User Manual Verification 'Advanced Features' (Protocol in workflow.md)
