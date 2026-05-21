# Specification: Advanced API Features (Intelligence, Integrations, Delta Feed)

## 1. Athlete Intelligence
Expose AI-enriched athlete data including phonetics, translations, and narratives.

### 1.1 `GET /v1/athletes/{id}`
Returns the core profile of an athlete.
- **Source:** `global_player_enrichment` table (using name lookup for now if ID is not available, or joining from roster data).
- **Fallback:** If not found in enrichment table, return basic info from `reference_rosters`.

### 1.2 `GET /v1/athletes/{id}/intelligence`
Returns specifically the AI-generated data.
- **Fields:** `phonetic_name`, `ipa_name`, `chinese_name`, `career_summary`, `color_commentary`, `stats_insight`.

## 2. Broadcast Integrations
Generate data formats compatible with industry-standard broadcast graphic engines.

### 2.1 `GET /v1/teams/{teamIdentifier}/export?format={format}&season={year}`
- **Formats:** `vizrt` (XML), `ross` (JSON), `chyron` (JSON/CSV).
- **Logic:** Fetch the team roster for the specified season and map fields to the legacy structure required by the requested format.
- **Phonetics:** Include `phonetic_name` in the export payload.

## 3. Delta Feed
Allow consumers to poll for changes rather than full datasets.

### 3.1 `GET /v1/changes?since={timestamp}`
- **Source:** `reference_rosters` table filtered by `updated_at > {timestamp}`.
- **Response:** List of team IDs/leagues that have been updated since the provided timestamp.

## 4. Athlete Corrections
Enable feedback loop for data accuracy.

### 4.1 `POST /v1/athletes/{id}/corrections`
- **Payload:** `{ "field": "phonetic_name", "correction": "New Value", "reason": "..." }`
- **Action:** For now, log the correction request. (Future: Store in a `corrections` table for human/AI review).
