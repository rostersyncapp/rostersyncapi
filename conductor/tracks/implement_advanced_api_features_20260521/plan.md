# Plan: Implement Advanced API Features

## Phase 1: Athlete Intelligence Endpoints

*   - [ ] Task: Implement `GET /v1/athletes/{playerId}` endpoint.
    *   - [ ] Sub-task: Write tests for athlete profile retrieval.
    *   - [ ] Sub-task: Implement retrieval from `global_player_enrichment` (fallback to basic data if missing).
*   - [ ] Task: Implement `GET /v1/athletes/{playerId}/intelligence` endpoint.
    *   - [ ] Sub-task: Write tests for AI intelligence data retrieval.
    *   - : Implement specifically fetching AI fields (phonetics, translations).

## Phase 2: Broadcast Export Engine

*   - [ ] Task: Implement `GET /v1/teams/{teamIdentifier}/export` endpoint.
    *   - [ ] Sub-task: Write tests for Vizrt (XML) export format.
    *   - [ ] Sub-task: Implement Vizrt XML generation logic.
    *   - [ ] Sub-task: Write tests for Ross Video (JSON) export format.
    *   - [ ] Sub-task: Implement Ross Video mapping.

## Phase 3: Delta Feed & Operations

*   - [ ] Task: Implement `GET /v1/changes` endpoint.
    *   - [ ] Sub-task: Write tests for timestamp-based filtering on `reference_rosters`.
    *   - [ ] Sub-task: Implement delta query logic.
*   - [ ] Task: Implement `POST /v1/athletes/{playerId}/corrections` endpoint.
    *   - [ ] Sub-task: Write tests for correction submission.
    *   - [ ] Sub-task: Implement basic logging/storage for corrections.

## Phase 4: Final Verification

*   - [ ] Task: Conductor - User Manual Verification 'Advanced Features' (Protocol in workflow.md)
