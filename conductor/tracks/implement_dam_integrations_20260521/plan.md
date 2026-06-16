# Plan: Implement DAM Integrations

## Phase 1: Cryptographic Foundation [checkpoint: complete]

*   - [x] Task: Implement Web Crypto AES-256-GCM encryption & decryption helper in `cloudflare/src/utils/crypto.ts`.
    *   - [x] Sub-task: Handle secure key derivation and IV handling.
    *   - [x] Sub-task: Write unit tests verifying correctness of encryption and decryption.

## Phase 2: Connection Management (CRUD) [checkpoint: complete]

*   - [x] Task: Implement Integration Providers list endpoint (`GET /v1/integrations/providers`).
*   - [x] Task: Implement Create Connection endpoint (`POST /v1/integrations`).
    *   - [x] Sub-task: Validate provider-specific required fields.
    *   - [x] Sub-task: Encrypt raw credentials using crypto utility before writing to Supabase.
*   - [x] Task: Implement List Connections endpoint (`GET /v1/integrations`).
    *   - [x] Sub-task: Ensure organization-level isolation.
    *   - [x] Sub-task: Mask sensitive credential fields as `********` in response.
*   - [x] Task: Implement Get Connection Details endpoint (`GET /v1/integrations/{id}`).
*   - [x] Task: Implement Update Connection endpoint (`PATCH /v1/integrations/{id}`).
    *   - [x] Sub-task: Handle credential updates, re-encrypting only if provided.
*   - [x] Task: Implement Delete Connection endpoint (`DELETE /v1/integrations/{id}`).

## Phase 3: Live Verification & Synchronization [checkpoint: complete]

*   - [x] Task: Implement Test Connection endpoint (`POST /v1/integrations/{id}/test`).
    *   - [x] Sub-task: Execute real/mock API calls to verification endpoints for Iconik, CatDV, and Webhooks (using HMAC signature).
    *   - [x] Sub-task: Persist result (`active` status, `last_error` logs) to Supabase connection record.
*   - [x] Task: Implement Trigger Sync endpoint (`POST /v1/integrations/{id}/sync`).
    *   - [x] Sub-task: Enqueue a manual sync task in the `job_queue` table.
*   - [x] Task: Implement Get Deliveries History endpoint (`GET /v1/integrations/{id}/deliveries`).
    *   - [x] Sub-task: Query historical delivery logs from the `dam_delivery_log` table.

## Phase 4: Integration Testing [checkpoint: complete]

*   - [x] Task: Write comprehensive route and middleware integration tests in `cloudflare/src/index.test.ts`.
*   - [x] Task: Verify test passing in the `@cloudflare/vitest-pool-workers` environment.
