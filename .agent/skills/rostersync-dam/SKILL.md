---
name: rostersync-dam
description: Guidelines, specifications, and API mapping references for external DAM platforms (Iconik, CatDV, Webhooks) handled by the DAMAgent.
---

# RosterSync DAM & Delivery Integrations Skill

This skill defines the integration standards for RosterSync's Tier 3 Digital Asset Management (DAM) connectors, managed by the **DAMAgent**.

## 📁 Reference Material
For detailed specs and schemas of each supported target platform, refer to:
- [Iconik Integration Reference](./resources/iconik.md)
- [CatDV Integration Reference](./resources/catdv.md)
- [Webhook Delivery Reference](./resources/webhooks.md)
- [Frame.io Integration Reference](./resources/frameio.md)
- [Shade Integration Reference](./resources/shade.md)
- [Orange Logic Integration Reference](./resources/orangelogic.md)
- [Axle AI Integration Reference](./resources/axelai.md)
- [Dalet Flex Integration Reference](./resources/daletflex.md)
- [Cantemo Portal Integration Reference](./resources/cantemo.md)
- [Bynder Integration Reference](./resources/bynder.md)

## 🔑 Credential Security
All DAM platforms require credentials. The following security requirements must be strictly followed:
1. **At-Rest Encryption**: Credentials must be encrypted using AES-256-GCM before database persistence (managed via the Cloudflare Web Crypto gateway).
2. **Masking**: Under no circumstances should plain credentials be returned in API responses. Outbound payloads must mask values as `********`.
3. **Tenant Isolation**: Connections must always be isolated via the customer's `organization_id`. Bypassing or cross-tenant fetching is a critical security failure.

## 🔄 Mapping Architecture
Each client has a unique metadata schema. The DAMAgent uses a mapping table `field_mapping` to translate our unified athlete/roster structure to target fields:
- **Unified Schema Field** (e.g. `jersey_number`) ➡️ **Mapped Key** (e.g. `iconik:jerseyNo`, `catdv:UDF_10`).
