---
name: rostersync-api
description: Specialized patterns for the RosterSync REST API, DAM Connectors (Iconik/CatDV), and enterprise metadata delivery. Use when implementing Tier 3 ConnectorAgent logic or modifying delivery pipelines.
---

# RosterSync API & Connector Skill

This skill defines the delivery protocols for the RosterSync platform, focusing on the **ConnectorAgent** (Tier 3).

## 🔗 Delivery Protocols

### 1. DAM Integration (Iconik/CatDV)
- **Authentication:** Never store plain-text credentials. Use the **Supabase Vault** (`vault.secrets`) to retrieve encrypted API keys at runtime.
- **Field Mapping:** Always reference the `field_mappings` table to translate RosterSync's Unified Schema to the customer's specific metadata schema.
- **Idempotency:** Use `update_id` in DAM metadata to prevent duplicate entries for the same roster update.

### 2. Broadcast Graphics (Ross/Vizrt)
- **Format:** Deliver data in JSON format optimized for the specific graphics engine (e.g., Vizrt DataPool).
- **Latency:** Tier 3 updates for graphics must trigger within <500ms of a Tier 2 enrichment event.

## 🛠️ Security & RLS
- **Isolation:** Every API request must be validated against the `organization_id`.
- **Scopes:** Ensure `ConnectorAgent` tokens only have `write` access to the specific customer's organization data.
