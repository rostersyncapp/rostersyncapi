# 🚀 Hybrid Infrastructure & Split-Auth Strategy

This plan documents the technical blueprint for the **Split-Auth** strategy (Supabase for core data + Cloudflare for high-speed edge delivery).

## Phase 1: The Secure Core (Supabase)
*   **Task 1.1**: Deploy the `api_keys` and `organizations` tables with strict RLS policies.
*   **Task 1.2**: Set up the **Supabase Vault** to store DAM credentials for CatDV/Iconik.
*   **Task 1.3**: Configure Webhooks to trigger on any change to the `api_keys` table.
*   **Verification**: A user can log in via Next.js and only see their own organization's data.

## Phase 2: The Edge Shield (Cloudflare)
*   **Task 2.1**: Initialize the `rostersync-edge-gateway` Worker.
*   **Task 2.2**: Configure **Cloudflare KV** to store active API keys and cached roster snapshots.
*   **Task 2.3**: Implement the "Auth Middleware" in the Worker to validate the `Authorization` header against KV.
*   **Verification**: Requests with an invalid key are rejected by Cloudflare in <20ms.

## Phase 3: The Pulse (Sync Engine)
*   **Task 3.1**: Create a Supabase Edge Function that receives `api_key` webhooks.
*   **Task 3.2**: Implement the "Push-to-Edge" logic to update Cloudflare KV whenever a key is created, rotated, or revoked.
*   **Task 3.3**: Set up a daily "Consistency Check" cron job to ensure KV and Postgres are perfectly in sync.
*   **Verification**: Creating a key in the Dashboard makes it instantly usable on the Edge.

## Phase 4: The Delivery Layer
*   **Task 4.1**: Route `/v1/teams/{id}/roster` to fetch from Supabase but **cache** the result in Cloudflare KV for 60 seconds.
*   **Task 4.2**: Deploy the **OpenAPI Bridge** (OpenAI Translator) as a Cloudflare Worker for global low-latency.
*   **Verification**: Broadcaster graphics systems receive roster JSON in <50ms globally.

## Phase 5: Disaster Recovery (Backblaze B2)
To ensure the 25-year archive is never lost, we maintain a "3-2-1" backup strategy.

*   **Task 5.1**: Automated nightly SQL dumps and JSON exports from Supabase.
*   **Task 5.2**: Off-platform storage in **Backblaze B2** (Cold Storage).
*   **Task 5.3**: **KV Snapshotting**: Capture a JSON export of all Cloudflare KV keys/values during the nightly backup to ensure Edge-Origin consistency.
*   **Verification**: A successful "Dry Run" restoration of a historical roster from a Backblaze archive.

---
*Authored by @backend-specialist & @project-planner*
