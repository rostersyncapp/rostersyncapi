# RosterSync API

> Autonomous AI-operated roster data API for broadcast & sports media.

## What Is This?

RosterSync API delivers AI-enriched athlete intelligence — phonetics, translations, and 25-year historical roster data — across 18 leagues via a simple REST API. Built for broadcast networks, TV stations, and sports media platforms.

## Project Structure

```
rostersyncapi/
├── README.md                    ← You are here
├── docs/
│   ├── api-specification.md     ← Full product spec, pricing, endpoints, contracts
│   ├── ui-concepts.md           ← UI/UX direction, design tokens, typography
│   ├── mcp-strategy.md          ← MCP Server integration and pricing strategy
│   ├── howitworks.md            ← Explains REST, DAM, and MCP delivery methods
│   ├── competitor-analysis.md   ← Market positioning vs Sportradar, Stats Perform, etc.
│   ├── critical-infrastructure-fixes.md ← Ledger of security & architectural remediations
│   ├── team-branding-enrichment-plan.md ← Fallback spec and AI self-healing for missing team colors
│   └── mockups/
│       ├── dashboard.png        ← Developer Portal Dashboard
│       ├── api-explorer.png     ← Interactive API Documentation
│       ├── landing-page.png     ← Marketing Landing Page
│       ├── integrations-list.png         ← DAM Integrations List View
│       ├── integrations-provider.png     ← Provider Selection (Step 1)
│       ├── integrations-credentials.png  ← Credentials Form (Step 2)
│       ├── integrations-field-mapping.png ← Field Mapping (Step 3)
│       └── integrations-events-scope.png ← Events & Scope (Step 4)
```

## Key Documents

| Document | Description |
|----------|-------------|
| [API Specification](docs/api-specification.md) | Full product spec: endpoints, response envelope, pagination, pricing, auth, rate limiting, recommendations, and API design review |
| [UI Concepts](docs/ui-concepts.md) | Design direction, mockups, color system, typography scale |
| [Critical Infrastructure & Security Fixes](docs/critical-infrastructure-fixes.md) | Official ledger of architectural & security remediations (Token Leakage, Agent Hardening, Cryptographic Auth) |
| [Team Branding Fallback & AI Enrichment](docs/team-branding-enrichment-plan.md) | Architectural spec for Layered UI Fallbacks, YIQ Contrast Color Formulas, and Asynchronous AI Self-Healing branding loops |

## Quick Links

- **18 Leagues**: NFL, MLB, NHL, NBA, MLS, MiLB, WNBA, NWSL, USL, NCAA, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Liga MX, Eredivisie, IPL
- **Unique Value**: AI phonetics for broadcast talent (no competitor offers this)
- **Pricing**: Free → $1,499/mo Enterprise (Editorial AI tier @ $999/mo)
- **Tech Stack**: Supabase Edge Functions + PostgreSQL + Gemini Flash

## Relationship to RosterSync Dev

This project is the **API service layer** that sits on top of the existing RosterSync data pipeline (`rostersync_dev-1`). The data pipeline handles roster fetching, AI enrichment, and storage. This project wraps that data in a public REST API with auth, rate limiting, and billing.

```
rostersync_dev-1 (Data Pipeline)
    ├── ScoutAgent → fetches rosters
    ├── LinguistAgent → AI enrichment
    └── reference_rosters → data storage
              ↓
rostersyncapi (API Service)        ← THIS PROJECT
    ├── REST endpoints
    ├── API key auth
    ├── Rate limiting
    └── Developer portal
```

## Status

- [x] Product specification complete
- [x] API contract defined (endpoints, envelope, errors, pagination)
- [x] UI/UX concepts created
- [x] Pricing model defined
- [x] Recommendations added (revenue timeline, data quality SLA)
- [ ] Phase 1: Foundation (API endpoints, auth, rate limiting)
- [ ] Phase 2: Features (intelligence endpoints, broadcast exports)
- [ ] Phase 3: Autonomy (monitoring, billing, alerting)
- [x] Phase 4: DAM Native Connectors (ConnectorAgent implemented for Iconik, CatDV, Webhook)
# rostersyncapi
# rostersyncapi
