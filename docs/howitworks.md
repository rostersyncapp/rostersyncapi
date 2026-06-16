# How It Works: The RosterSync DAM Automation Architecture

RosterSync operates as an automated metadata delivery service that connects professional roster intelligence directly to Digital Asset Management (DAM) systems and media production pipelines.

---

## 1. Data Acquisition & AI Enrichment (The Core Pipeline)

RosterSync's multi-agent data pipeline gathers, verifies, and enriches roster data automatically before it is pushed to customer platforms.

* **Step 1: Raw Extraction (ScoutAgent):** Fetches raw roster data (names, jersey numbers, positions, heights/weights) from official league APIs.
* **Step 2: AI Enrichment (LinguistAgent & Scraping Agents):** Automatically generates broadcast-ready phonetic pronunciations, full IPA guides, Mandarin/Spanish translations, and scrapes biographical histories.
* **Step 3: Normalized Database:** The enriched data is saved to a secure Supabase PostgreSQL instance, adhering to strict data integrity and historical accuracy guidelines (never deleting, only deactivating/updating).

---

## 2. Connected DAM Systems (ConnectorAgent)

RosterSync does not require developers to poll a REST API. Instead, our native connectors actively push data directly to your asset libraries to keep tags current.

* **Iconik Integration:** Direct integration via the Iconik API. Automatically maps, creates, and updates custom fields and dropdown options for assets.
* **Quantum CatDV:** Native integration using CatDV REST APIs to automatically align metadata schemas and push tags directly to media catalog items.
* **Custom Webhooks:** Pushes payload-safe JSON events (e.g. `ping`, `roster_update`) directly to customer-defined endpoints on roster changes, complete with HMAC SHA-256 signatures for validation.

---

## 3. Automation & Synchronization Flow

RosterSync keeps your media production environment automatically aligned with live sports ops.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Scout Agent /  │ ───> │ Supabase DB     │ ───> │ Vercel Webhook  │
│  Enrichment     │      │ (Rosters Table) │      │ (Roster Change) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Enterprise DAM  │ <─── │ ConnectorAgent  │ <─── │   Job Queue     │
│ (Iconik/CatDV)  │      │ (Worker Sync)   │      │  (Enqueued)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. **Change Detection:** Supabase database webhooks fire on inserts or updates to the `reference_rosters` table.
2. **Verification & Scope Matching:** The webhook calls the Vercel backend (`/api/webhooks/roster-change`), which identifies which active DAM connections are configured to sync that specific team, league, or season.
3. **Queue Processing:** The system enqueues a `dam_connector` job for each affected connection.
4. **Active Delivery:** Background worker processes execute the job, calling the respective DAM APIs to update metadata tags without human intervention.

---

## 4. Broadcaster Control Panel (RosterSync Hub)

A clean, high-fidelity user dashboard allows broadcast managers to control the sync flow.

* **Integrations Wizard:** Simple forms to securely enter base URLs and API credentials. Credentials are encrypted at rest via AES-256-GCM.
* **Sync Scope Filters:** Configure each connection to target all leagues or restrict synchronization to specific leagues, teams, or seasons.
* **Custom Field Mapping:** An advanced mapper tool that maps RosterSync metadata fields (e.g., `phonetic_name`, `team_primary_color`) to your DAM's specific custom field IDs.
* **Manual Overrides:** A "Sync Now" trigger to instantly run a full synchronization, alongside a 50-event delivery log modal to inspect payload logs and error codes.

---

## 5. Off-Platform Redundancy

To protect decades of historical archives, RosterSync features automated backups:
* **Nightly Backups:** Compresses and exports the PostgreSQL database.
* **Backblaze B2 Cold Storage:** Backups are securely uploaded to Backblaze B2, enforcing the "3-2-1" backup rule (3 copies, 2 media types, 1 off-site).
