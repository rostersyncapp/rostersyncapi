# DAM-Only Pivot: Implementation Plan

## I. Context

This document describes the shift from RosterSync-as-an-API to RosterSync-as-a-DAM-automation-service.

| Aspect | Before (API Product) | After (DAM-Only Product) |
|--------|---------------------|--------------------------|
| **What you sell** | REST API access to roster data | Auto-sync roster metadata to Iconik/CatDV |
| **Who buys** | Developers, startups | Broadcast production directors, sports ops |
| **How they use it** | `curl` + API key | Dashboard → connect DAM → done |
| **Complexity for user** | Read docs, generate key, write code | Sign up, enter credentials, click Sync |
| **Sales cycle** | Self-serve, low-touch | Still self-serve, but higher perceived value |

**Rationale**: Broadcast teams with DAMs are reachable on LinkedIn, have budget ($500-2k/mo for Iconik/CatDV already), and the pain of manual roster entry is immediate and obvious. Selling "here's an API, figure it out" to the same audience is harder than "connect your DAM and rosters auto-update."

---

## II. MVP Product Definition

### Single Tier MVP

To accelerate the MVP launch and simplify the codebase (no feature-gating logic required), we are launching with a single all-access tier.

| | Pro ($99/mo) |
|---|---|
| **Delivery** | CSV + email + DAM push (Iconik/CatDV) |
| **Leagues** | All 18 leagues |
| **History** | 25-year archive |
| **Data** | Full Enrichment (Name, #, pos, H/W, phonetics, IPA, Mandarin, team colors) |
| **Best for** | Broadcast networks, Power 5, pro teams |

*(Future: A "Pro+" tier will be introduced when advanced features like Broadcast XML exports and MCP integrations are activated).*

### User Journey

```
1. Sign up at rostersync.app (email + password)
2. Free 14-day trial starts, no credit card
3. Dashboard loads → "Connect your DAM" prompt
4. Select Iconik or CatDV → enter base URL + credentials
5. Choose leagues/teams to sync
6. Click "Sync Now" → data appears in their DAM
7. Future roster changes auto-sync (after webhook pipeline is built)
```

**No API keys. No `curl` examples. No rate limit documentation.**

---

## III. Current Features Inventory

Below is every feature in the current codebase, categorized by what happens to it.

### A. Features Removed (Code Kept in Repo, Not Deployed)

These features are fully built but deactivated for the MVP. The code stays in the repo so they can be re-activated later.

| Feature | Location | Lines of Code | Why Deactivated | Future Phase |
|---------|----------|---------------|-----------------|--------------|
| **REST API Gateway** | `cloudflare/src/index.ts` | ~2,217 | Not needed for DAM-only customers | Phase 2 |
| **Health endpoint** | `cloudflare/src/index.ts` | ~12 | Not needed | Phase 2 |
| **Leagues endpoint** | `cloudflare/src/index.ts` | ~50 | Not needed | Phase 2 |
| **Teams endpoint** | `cloudflare/src/index.ts` | ~50 | Not needed | Phase 2 |
| **Rosters endpoint** | `cloudflare/src/index.ts` | ~100 | Not needed | Phase 2 |
| **Rosters by team endpoint** | `cloudflare/src/index.ts` | ~100 | Not needed | Phase 2 |
| **Players endpoint** | `cloudflare/src/index.ts` | ~50 | Not needed | Phase 2 |
| **Athletes endpoint** | `cloudflare/src/index.ts` | ~200 | Not needed | Phase 2 |
| **Athlete Intelligence endpoint** | `cloudflare/src/index.ts` | ~100 | Not needed | Phase 2 |
| **Broadcast export endpoint** | `cloudflare/src/index.ts` | ~200 | Not needed | Phase 3 |
| **Changes/delta endpoint** | `cloudflare/src/index.ts` | ~80 | Not needed | Phase 2 |
| **Corrections endpoint** | `cloudflare/src/index.ts` | ~50 | Not needed | Phase 2 |
| **API key auth middleware** | `cloudflare/src/index.ts` | ~90 | No public API | Phase 2 |
| **Rate limiting middleware** | `cloudflare/src/index.ts` | ~40 | No public API | Phase 2 |
| **Broadcast export format serializers** | `cloudflare/src/index.ts` (inline) | ~200 | Not needed | Phase 3 |
| **Cloudflare tests** | `cloudflare/src/*.test.ts` | ~500 | API not deployed | Phase 2 |
| **MCP Server** | `services/mcp/server.ts` | ~150 | Only needed for AI-native workflows | Phase 4 |
| **OpenAI Bridge** | `services/api/openai-bridge.ts` | ~100 | Only needed for ChatGPT/GPTs | Phase 5 |
| **API authentication in MCP** | `services/mcp/server.ts` (inline) | ~30 | MCP not deployed | Phase 4 |

**Total deactivated: ~3,000+ lines of working code.**

### B. Dashboard Tabs Removed

| Tab | File | Lines | What It Contains | Future Phase |
|-----|------|-------|------------------|--------------|
| **Developer Settings** | `SettingsTabs.tsx` | ~155 (1098-1252) | API Base URL display, API key generation/revocation, API key reveal modal, curl reference, endpoint reference | Phase 2 |
| **API Key Reveal Modal** | `SettingsTabs.tsx` | ~40 (1255-1296) | Warning modal showing generated API key once | Phase 2 |

*(Note: Metadata Field Mapper is being kept, but refactored into an "Advanced Settings" section under Integrations).*

### C. Dashboard Server Actions Removed

| Function | File | Lines | Purpose | Future Phase |
|----------|------|-------|---------|--------------|
| `getApiKeys()` | `actions.ts` | ~20 | List all API keys for the user | Phase 2 |
| `createApiKey()` | `actions.ts` | ~35 | Generate new key, store hash, return raw key | Phase 2 |
| `deleteApiKey()` | `actions.ts` | ~22 | Revoke/delete an API key | Phase 2 |

### D. Dashboard Props Removed

| Prop | File | What Changes |
|------|------|-------------|
| `initialApiKeys` | `SettingsTabs.tsx` (line 70, 112), `page.tsx` (line 64) | Remove prop, remove fetch |

### E. Dashboard State Variables Removed

| Variable | Lines | Purpose |
|----------|-------|---------|
| `activeTab: 'developer'` | Line 114 | Remove developer tab key |
| `apiKeys` | Line 117 | Remove entirely |
| `newKeyName` | Line 118 | Remove entirely |
| `generatedKey` | Line 119 | Remove entirely |
| `showKeyModal` | Line 120 | Remove entirely |
| `creatingKey` | Line 121 | Remove entirely |

### F. Dashboard Handlers Removed

| Handler | Lines | Purpose |
|---------|-------|---------|
| `handleGenerateKey` | 352-370 | Generate new API key |
| `handleDeleteKey` | 372-381 | Revoke API key |

### G. Landing Page Sections Rewritten

| Section | Current Content | New Content |
|---------|----------------|-------------|
| **Hero** | "Real-time Metadata Pipeline" with `GET /v1/athletes` JSON demo | "Auto-sync roster metadata to your DAM" |
| **Feature 01** | On-Demand CSV Export | Keep — CSV download is baseline |
| **Feature 02** | Daily Email Digest | Keep — email is important delivery method |
| **Feature 03** | Google Sheets Auto-Sync | **Remove** — Phase 7 feature |
| **Feature 04** | Direct DAM Push | Keep — this is the core feature now |
| **Feature 05** | Broadcast Polling URL | **Remove** — Phase 3 feature |
| **Pricing** | Sync ($49) and Studio ($149) with API-centric descriptions | Same prices, DAM-centric descriptions |
| **FAQ Question 3** | "What graphics engines and DAM platforms are supported?" | Rewrite to focus on DAM only |
| **FAQ Question 4** | "How do rate limits and API keys work?" | **Remove** — no API keys needed |
| **FAQ Question 6** | "What is included in the athlete metadata?" | Keep, update |
| **Mock Player JSON** | `GET /v1/athletes/nfl-mahomes-15`, `nhl-mcdavid-97`, etc. | **Remove** — replace with DAM connection flow demo |

### H. Docs Archived or Rewritten

| File | Action | Reason |
|------|--------|--------|
| `docs/api-specification.md` | **Archive** (keep in repo, mark as ARCHIVED) | Full REST API spec for Phase 2 re-activation |
| `docs/mcp-strategy.md` | **Archive** | MCP server strategy for Phase 4 |
| `docs/broadcast-integration-guide.md` | **Archive** | Broadcast export docs for Phase 3 |
| `docs/howitworks.md` | **Rewrite** | Currently covers API/MCP/DAM delivery architecture |
| `docs/competitor-analysis.md` | **Keep** (review for DAM-only positioning) | Still relevant strategy doc |
| `docs/dam_only.md` | **Keep** (reference for auto-sync pipeline build) | Contains auto-sync architecture details |
| `docs/critical-infrastructure-fixes.md` | **Keep** | Security ledger, always relevant |
| `docs/team-branding-enrichment-plan.md` | **Keep** | Team branding still used by DAM sync |
| `docs/historical-integrity-plan.md` | **Keep** | Data integrity rules still apply |

---

## IV. Features Kept (With Changes)

### A. Unchanged (No Modifications Needed)

| File | Purpose | Why It Stays |
|------|---------|--------------|
| `services/supabase.ts` | Shared Supabase client | ConnectorAgent, agents, and dashboard all need it |
| `services/ai-utils.ts` | Exponential backoff retry | All agents depend on it |
| `services/leagueData.ts` | ESPN league code mappings | ScoutAgent uses it |
| `services/branding-utils.ts` | Team color normalization | DAM sync may use it |
| `services/IntelligenceCacheService.ts` | Caching layer | Agents use it |
| `services/agents/Agent.ts` | Base agent class | All agents inherit from it |
| `services/agents/ConnectorAgent.ts` | Core DAM sync engine | **This is the product** |
| `services/agents/ScoutAgent.ts` | Fetch rosters from external APIs | Feeds roster data into Supabase |
| `services/agents/LinguistAgent.ts` | AI enrichment (phonetics, translations) | Enriches roster data for DAM sync |
| `services/agents/WikipediaScraperAgent.ts` | Biographical scraping | Feeds enrichment pipeline |
| `services/agents/ResearcherAgent.ts` | AI research | Feeds enrichment |
| `services/agents/ArchiveAgent.ts` | Historical research | Feeds 25-year archive |
| `services/utils/unit-converters.ts` | Height/weight conversion | Used by enrichment |
| `utils/supabase/server.ts` | Next.js server auth client | Dashboard auth |
| `utils/supabase/client.ts` | Browser auth client | Dashboard auth |
| `utils/supabase/middleware.ts` | Next.js middleware | Dashboard auth |
| `utils/season.ts` | Season label formatting | Dashboard UI |
| `middleware.ts` | Dashboard auth guard | Protects `/dashboard/*` |
| `app/auth/actions.ts` | Auth server actions | Signup/login flow |
| `app/login/page.tsx` | Login page | Auth |
| `app/signup/page.tsx` | Signup page | Auth |
| `app/auth/callback/route.ts` | OAuth callback | Auth flow |
| `app/dashboard/layout.tsx` | Dashboard shell | App layout |
| `app/dashboard/page.tsx` | Dashboard overview | Stats cards, activity feed |
| `app/dashboard/activity/page.tsx` | Activity log | User-facing activity |
| `app/dashboard/rosters/page.tsx` | Roster directory | Team browser |
| `app/dashboard/rosters/[teamId]/page.tsx` | Team roster detail | Player table |
| `app/dashboard/rosters/actions.ts` | Roster data fetching | Still needed (roster browser + DAM sync trigger) |
| `scripts/enqueue-roster-jobs.ts` | CLI roster sync trigger | Data pipeline |
| `scripts/run-worker.ts` | CLI enrichment worker | Data pipeline |
| `scripts/run-dam-worker.ts` | CLI DAM worker | Manual/triggered DAM sync |
| `scripts/sync-fifa-world-cup.ts` | FIFA WC sync | Data pipeline |
| `scripts/enrich-fifa.ts` | FIFA enrichment | Data pipeline |

### B. Modified (Dashboard Files)

#### `app/dashboard/settings/SettingsTabs.tsx`

Changes:
- Remove `activeTab: 'developer'` option → keep `'profile' | 'integrations'` (and optionally 'mapper' or move mapper into integrations)
- **Refactor Mapper**: Instead of a standalone tab, move the Metadata Field Mapper into an "Advanced Settings" accordion under the Integrations tab. Pre-populate it with defaults.
- Remove state: `apiKeys`, `newKeyName`, `generatedKey`, `showKeyModal`, `creatingKey`
- Remove handlers: `handleGenerateKey`, `handleDeleteKey`
- Remove tab button: "Developer Settings" (lines 447-456)
- Remove tab content: `{activeTab === 'developer' && (...)}` block (lines 1098-1252)
- Remove API Key Reveal Modal (lines 1255-1296)
- Remove unused interface: `ApiKey` (lines 58-63)

#### `app/dashboard/settings/actions.ts`

Changes:
- Remove `getApiKeys()` (lines ~530-550)
- Remove `createApiKey()` (lines ~552-585)
- Remove `deleteApiKey()` (lines ~587-608)
- Remove unused imports: `generateRandomApiKey`, `hashApiKey` from `./crypto-utils`
  - **But check**: `hashApiKey` may be used elsewhere in the file. If not, remove it.
- Keep: `getFieldMappings`, `saveFieldMappings`, `getDAMConnections`, `saveDAMConnection`, `deleteDAMConnection`, `testDAMConnection`, `getDeliveryLogs`, `triggerDAMSync`

#### `app/dashboard/settings/page.tsx`

Changes:
- Remove `import { ... getApiKeys } from './actions'` (line 4)
- Remove `getApiKeys()` call (lines ~45, ~49)
- Remove `apiKeys` from props passed to `SettingsTabs` (line ~64)

### C. Landing Page (`app/page.tsx`)

Changes:
- **Hero section**: Replace API-centric headline with DAM-centric headline
- **Feature list**: Remove Google Sheets auto-sync (Feature 03) and Broadcast Polling URL (Feature 05). Keep CSV (01), Email (02), DAM Push (04)
- **Pricing cards**: Rewrite Sync and Studio descriptions to remove API mentions
- **FAQ ITEMS**: 
  - Remove Q4 ("How do rate limits and API keys work?")
  - Rewrite Q3 ("What graphics engines and DAM platforms are supported?") to focus on DAM only
  - Keep and rephrase Q2 ("How does automated delivery work?") 
  - Keep and rephrase Q6 ("What is included in the athlete metadata?")
- **MOCK_PLAYERS**: Remove the entire `MOCK_PLAYERS` object (lines 46-227). Replace with brief description or remove the API demo section entirely.

---

## V. New Code to Build

### A. Stripe Billing Integration

**Files to create:**
- `app/api/stripe/checkout/route.ts` — Creates Stripe Checkout session, returns URL
- `app/api/stripe/webhook/route.ts` — Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- `lib/stripe.ts` — Stripe client initialization

**Database changes:**
- Update `profiles` table schema to add `stripe_customer_id` (text), `stripe_subscription_id` (text), and `subscription_status` (text) to track payment and customer portal redirect status.
- Update `subscription_tier` when the Stripe webhook fires.

**Stripe products to create:**
1. `rostersync-pro` — $99/month (Pro tier)

**Flow:**
```
User clicks pricing → Stripe Checkout → Customer enters card →
Stripe webhook → Update profile.subscription_tier →
Dashboard shows new tier
```

**Estimated: 6-8 hours.**

### B. Auto-Sync Pipeline

This enables automatic DAM sync when roster data changes, rather than requiring manual "Sync Now" clicks.

**Components:**
1. **Supabase Database Webhook** — Configured on `reference_rosters` table, fires on INSERT or UPDATE. Configured with a secret key passed in the headers (e.g. `x-supabase-signature`).
2. **Vercel API Route** — `POST /api/webhooks/roster-change` to receive database webhook updates securely (validates the signature).
3. **Scope matching query** — Match roster changes to active DAM connections.
4. **Job enqueue** — Push `dam_connector` jobs to `job_queue`.
5. **Worker processing** — Background queue processing of jobs.

**Files to modify:**
- New Vercel API route: `app/api/webhooks/roster-change/route.ts` (simpler than deploying a separate Cloudflare Worker)
- Or keep the Cloudflare Worker endpoint and deploy it separately (already built pattern)

**Estimated: 4-6 hours.**

### C. CatDV Push Implementation

The core picklist sync logic is already implemented in `ConnectorAgent.ts` (using `resolveCatDVEndpoint`). However, CatDV currently skips missing fields rather than creating them automatically (unlike Iconik).

**Enhancements to build:**
- Implement auto-creation of missing fields in CatDV via `POST /api/v1/fields` (similar to Iconik dropdown creation).
- Add active developer/ops alerting (e.g., Slack webhooks) if jobs fail permanently.
- Configure sandbox/mock environment guidelines for CatDV testing.

**Estimated: 1-2 days (since picklist sync is built, focus is on robustness and field creation).**

---

## VI. Build Steps (Ordered)

### Day 1: Dashboard Cleanup

| Time | Task | Files |
|------|------|-------|
| Morning | Remove Developer Settings tab + API key functions | `SettingsTabs.tsx`, `actions.ts`, `page.tsx` |
| Afternoon | Refactor Metadata Field Mapper into an "Advanced Settings" section under Integrations | `SettingsTabs.tsx` |
| Afternoon | Verify profile tab + integrations tab still work | All settings files |

**Estimated: 3 hours.**

### Day 2: Landing Page Rewrite

| Time | Task | Files |
|------|------|-------|
| Morning | Rewrite hero section for DAM-only | `app/page.tsx` |
| Morning | Remove Google Sheets + Broadcast features from feature list | `app/page.tsx` |
| Morning | Remove MOCK_PLAYERS JSON demo | `app/page.tsx` |
| Afternoon | Rewrite FAQ section | `app/page.tsx` |
| Afternoon | Rewrite pricing descriptions | `app/page.tsx` |

**Estimated: 4 hours.**

### Day 3: Stripe Integration

| Time | Task | Files |
|------|------|-------|
| Morning | Create Stripe client | `lib/stripe.ts` |
| Morning | Create Checkout API route | `app/api/stripe/checkout/route.ts` |
| Afternoon | Create Webhook API route | `app/api/stripe/webhook/route.ts` |
| Afternoon | Update signup flow to offer tier selection | `app/signup/page.tsx` |
| Afternoon | Create Stripe products in Stripe dashboard | Stripe.com |

**Estimated: 6 hours.**

### Day 4: Auto-Sync Webhook

| Time | Task | Files |
|------|------|-------|
| Morning | Create roster-change webhook endpoint | `app/api/webhooks/roster-change/route.ts` |
| Morning | Implement scope matching query | Same file |
| Afternoon | Configure Supabase Database Webhook | Supabase dashboard |
| Afternoon | Test webhook fires → job enqueues → DAM receives | Manual QA |

**Estimated: 4 hours.**

### Day 5: CatDV Enhancements + Testing

| Time | Task | Files |
|------|------|-------|
| Morning | Implement CatDV auto-field creation + Slack error alerting | `services/agents/ConnectorAgent.ts` |
| Afternoon | Sandbox testing & End-to-end verification | All modified files |
| Afternoon | Fix edge cases found during testing | Various |

**Estimated: 6-8 hours.**

### Day 6: Docs + Launch Prep

| Time | Task | Files |
|------|------|-------|
| Morning | Archive API-specific docs (add ARCHIVED header) | `docs/api-specification.md`, `docs/mcp-strategy.md`, etc. |
| Morning | Rewrite `docs/howitworks.md` for DAM-only | `docs/howitworks.md` |
| Afternoon | Deploy to Vercel (stop Cloudflare Worker deploy) | Vercel dashboard |
| Afternoon | Create beta tester invite list | LinkedIn |

**Estimated: 4 hours.**

### Day 7: Go Live

| Time | Task |
|------|------|
| Morning | Final QA pass |
| Afternoon | Deploy, announce to 3 beta testers |
| Afternoon | Message 10 broadcast production directors on LinkedIn |

---

## VII. Future Re-Implementation Roadmap

### Phase 2: Public REST API (Month 3-4)

**Trigger:** A paying customer asks "can I query this roster data programmatically from my own app?"

**Re-activation:**
- Re-deploy `cloudflare/` Worker via `npm run deploy:gateway`
- Re-add Developer Settings tab to dashboard
- Re-add API key generation/revocation
- Re-enable rate limiting and auth middleware

**Effort: ~1 day** (already fully built, tested, and the code is unchanged in the repo).

**Pricing upsell:**
- API access stays included in Studio tier
- Add "Pro" tier at $99/mo for devs who want API-only without DAM

### Phase 3: Broadcast Exports (Month 6+)

**Trigger:** A broadcast station signs up and needs Vizrt/Ross/Chyron XML.

**Re-activation:**
- Re-add Feature 05 to landing page
- Re-enable broadcast export endpoints in Cloudflare Worker
- Add "Broadcast URL" section to dashboard Integrations tab

**Effort: ~1 day** (already fully built in `cloudflare/src/index.ts` — the Vizrt/Ross/Chyron serializers).

**Pricing upsell:**
- Move Studio tier to $199/mo with broadcast support included
- Or add Broadcast Export as a $50/mo add-on

### Phase 4: MCP Server (Month 9+)

**Trigger:** 2027 AI-native newsrooms become real, customers ask for Claude Desktop integration.

**Re-activation:**
- Deploy `services/mcp/server.ts` as a hosted MCP server
- Add "AI Integrations" section to dashboard
- Market as "Your AI agents can now query roster data natively"

**Effort: ~2 days** (server is built, needs hosting/deployment config).

**Pricing upsell:**
- Add "Network" tier at $299/mo with MCP + Momentum + webhook

### Phase 5: OpenAI Bridge (Month 12+)

**Trigger:** Customer asks "can ChatGPT use RosterSync?"

**Re-activation:**
- Serve `services/api/openai-bridge.ts` as a public endpoint
- Add one-page docs for "Connect RosterSync to your Custom GPT"

**Effort: ~1 day** (pure OpenAPI spec, already written).

*(Phase 6: Field Mapper - Cancelled. We decided to keep the mapper UI as an Advanced Setting from Day 1 to support enterprise taxonomies).*

### Phase 7: Google Sheets Sync (On Demand)

**Trigger:** Customer says "can this write to a Google Sheet instead of a DAM?"

**Required build:**
- OAuth flow for Google Sheets
- Sheet writing logic
- Dashboard UI for Sheets connection

**Effort: ~3-4 days** (new work, not already built).

### Phase 8: Developer Portal (Q2 2027)

**Trigger:** 50+ API customers, need self-serve docs and usage dashboards.

**Required build:**
- Public docs site (mintlify or readme.io)
- Usage analytics dashboard
- Rate limit monitoring

**Effort: ~2 weeks.**

---

## VIII. Architecture: Before vs After

### Before (Current)
```
┌──────────────────────────────────────────────────────────┐
│                    rostersync.app                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │           Next.js App (Dashboard + Landing)      │     │
│  │  ├── Profile    │  ├── Integrations  │  ┌────────┐│     │
│  │  ├── Field Map  │  └── Developer     │  │ MCP    ││     │
│  │  └── Roster     │    Settings        │  │ Server ││     │
│  │    Browser      │                    │  └────────┘│     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │       Cloudflare Worker (Public REST API)        │     │
│  │   20 endpoints + Auth + Rate Limiting + Exports   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Supabase Database                    │     │
│  │  rosters │ enrichment │ teams │ leagues │ DAMS   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │        AI Agents (Scout, Linguist, etc.)         │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### After (MVP)
```
┌──────────────────────────────────────────────────────────┐
│                    rostersync.app                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │           Next.js App (Dashboard + Landing)      │     │
│  │  ├── Profile    │  └── Integrations              │     │
│  │  └── Roster     │    (DAM connections only)      │     │
│  │    Browser      │                                │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │          Webhook (Roster Change → DAM Sync)      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Supabase Database                    │     │
│  │  rosters │ enrichment │ teams │ leagues │ DAMS   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │        AI Agents (Scout, Linguist, etc.)         │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Cloudflare Worker (STOPPED, code kept in repo)  │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  MCP Server (STOPPED, code kept in repo)         │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## IX. What Changes for Existing Users

There are no existing users (zero customers). This is a pre-launch pivot. However, if beta testers are onboarded:

| Before Onboarding | After Onboarding | Notes |
|-------------------|------------------|-------|
| Get an API key | Connect a DAM | No API key step |
| Read developer docs | Use the wizard | No docs needed |
| Poll the API | Data auto-arrives | Push not pull |
| PAYG pricing | Fixed monthly | Predictable |

---

## X. Launch Checklist

- [ ] Dashboard: only Profile + Integrations tabs visible
- [ ] Dashboard: Integrations tab shows Iconik, CatDV, Webhook connection forms
- [ ] Dashboard: "Sync Now" button enqueues and delivers
- [ ] Dashboard: Delivery log shows sync history
- [ ] Landing page: DAM-centric hero, no API mentions
- [ ] Landing page: Two features (CSV + Email + DAM Push for Studio)
- [ ] Landing page: FAQ rewritten (no API key/rate limit questions)
- [ ] Stripe: Pro ($99/mo) product created
- [ ] Stripe: Checkout route creates subscription
- [ ] Stripe: Webhook updates `profile.subscription_tier`
- [ ] Signup: 14-day free trial, no credit card
- [ ] Signup: Redirects to dashboard → "Connect your DAM" prompt
- [ ] Iconik: Connection wizard works end-to-end
- [ ] CatDV: Push logic implemented (not stub)
- [ ] Webhook: Roster changes trigger auto-sync
- [ ] Auto-sync: Delivers within 5 minutes of roster change
- [ ] Cloudflare Worker: NOT deployed (API stays dark)
- [ ] Docs: API-specific docs archived with ARCHIVED header
- [ ] Docs: `docs/howitworks.md` rewritten for DAM-only
- [ ] 3 beta testers: Have access and know how to use it
- [ ] LinkedIn: 50 broadcast production directors messaged

---

## XI. Appendices

### A. Files to Delete vs Keep

| Action | Count | Files |
|--------|-------|-------|
| **Delete** (no future use) | 0 | — |
| **Modify** | 6 | `SettingsTabs.tsx`, `actions.ts`, `page.tsx` (settings), `page.tsx` (landing), `docs/howitworks.md` |
| **Create** | 3+ | `lib/stripe.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/webhooks/roster-change/route.ts` |
| **Deactivate** (keep in repo) | Entire directories | `cloudflare/`, `services/mcp/`, `services/api/openai-bridge.ts` |
| **Keep unchanged** | 40+ | All core services, agents, utils, auth, rosters UI, scripts |

### B. Key Design Decisions

1. **Don't delete Cloudflare Worker code.** It took ~2,200 lines of engineering and is already tested. Keep it dormant. When Phase 2 comes, re-deploy is a single command.

2. **Don't fork the repo.** The `cloudflare/` directory is isolated by its own `package.json`. Dashboard changes are ~300 lines of removal in 3 files. Forking creates 2x maintenance for zero benefit.

3. **Keep `PROVIDER_FIELDS` in SettingsTabs.tsx.** Even though we're removing SOURCE_FIELDS (field mapper), the connection form still needs `PROVIDER_FIELDS` to render Iconik/CatDV/Webhook credential fields.

4. **Keep `getDeliveryLogs` and `triggerDAMSync` in actions.ts.** These are DAM features that belong in the Integrations tab, not API features.

5. **Stripe integration should be separate from the Stripe dashboard.** Create products in Stripe's UI, not via code. The code only handles Checkout sessions and webhook events.

6. **Auto-sync should be a Vercel API route, not a Cloudflare Worker.** Keep everything in one deploy target (Vercel) for simplicity. The webhook endpoint is simple enough to not need edge deployment.

7. **Production Worker Hosting**: The persistent worker script `run-dam-worker.ts` requires a node.js environment with persistent execution to poll the `job_queue`. Because Vercel does not support persistent background daemons, the worker will be hosted on Railway/Render. Alternatively, we can adapt the polling logic to run as a serverless cron job that processes a batch of jobs in a 10s window.

### C. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TAM too small (~200-300 broadcast DAMs) | Medium | High | Target NCAA first (366 D1 schools, no DAM needed for CSV/email tier) |
| CatDV API version fragmentation | Medium | Medium | Start with v9 (latest), add version probing as needed |
| Stripe webhook failures | Low | High | Log webhook events, alert on failure, manual reconciliation |
| Auto-sync delivery failures | Medium | Medium | 3 retry attempts + dead-letter queue + dashboard notification |
| Customer setup friction | Low | High | White-glove onboarding for first 10 customers |
| Competitor copies the idea | Low | Medium | The 25-year curated dataset is the moat, not the integration code |
| Webhook route exposure (unauthorized jobs) | Medium | High | Validate request signature (`x-supabase-signature`) in Vercel route |
| Background worker serverless timeout | High | Medium | Decouple persistent polling worker to run on Render/Railway or adapt to serverless cron batches |
