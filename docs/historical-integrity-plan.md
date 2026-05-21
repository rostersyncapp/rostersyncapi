# 🏺 Historical Integrity Implementation Plan

This plan documents the transition from a "Snapshot" database to a "Temporal Stratigraphy" database to support 25 years of sports history safely.

## Phase 1: Excavation (Data Audit)
*   **Objective**: Ensure the "site" is clean before laying the new foundation.
*   **Task 1.1**: Audit `athletes` table for cross-league duplicates and "Unknown" placeholders.
*   **Task 1.2**: Verify Backblaze/Supabase backup health.
*   **Verification**: A "Clean Baseline" report of unique Athlete Identities.

## Phase 2: Bedrock (The Temporal Schema)
*   **Objective**: Implement the Identity-Profile split.
*   **Task 2.1**: Create `athlete_identities` (Permanent) and `athlete_profiles` (Seasonal).
*   **Task 2.2**: Create `team_entities` (Permanent) and `team_branding` (Seasonal).
*   **Task 2.3**: Implement `tstzrange` constraints in PostgreSQL to prevent overlapping histories.
*   **Verification**: SQL schema successfully deployed to a staging branch.

## Phase 3: Translocation (Data Migration)
*   **Objective**: Move existing artifacts into the new strata.
*   **Task 3.1**: Script the translocation of flat records into the new relational structure.
*   **Task 3.2**: Capture "Golden Master" API responses for 100 key athletes to verify zero data loss.
*   **Verification**: Comparison between Legacy and Temporal API outputs shows 100% match.

## Phase 4: Ingestion (Agent Refactor)
*   **Objective**: Update the autonomous "Scouts" to be season-aware.
*   **Task 4.1**: Update `ScoutAgent` to perform "Identity Lookup" vs "Profile Creation."
*   **Task 4.2**: Modify `SyncOrchestrator` to handle "New Season" events by archiving the previous profile.
*   **Verification**: Mock season flip preserves historical layers.

## Phase 5: Exhibition (API & UI)
*   **Objective**: Expose the history to clients.
*   **Task 5.1**: Update REST API to support `?season=YYYY` across all roster endpoints.
*   **Task 5.2**: Update Spotter Board UI with a Season Selector and Historical Branding overrides.
*   **Task 5.3**: Implement the **OpenAI Translator Bridge** (OpenAPI spec generator).
*   **Verification**: Successfully render a 2005 roster with 2005 colors in the GUI and via a ChatGPT Action.

---
*Authored by @code-archaeologist & @project-planner*
