# RosterSync API - Broadcast Roster API Service

## Product Overview

| Aspect | Value |
|--------|-------|
| **Product Name** | RosterSync API |
| **Brand** | rostersync.app |
| **Mission** | Autonomous AI-operated roster data API for broadcast & sports media |
| **Target Customers** | Broadcast networks, TV stations, sports betting apps, media platforms |
| **Unique Value** | 25-year historical data + AI phonetics for on-air talent (no competitor offers this) |
| **Launch Scope** | 18 leagues (North American + International Soccer + Cricket) |

### League Coverage (18 Leagues)

#### North American (10)

| ID | League | Sport | Region |
|----|--------|-------|-------|
| nba | NBA | Basketball | North America |
| wnba | WNBA | Basketball | North America |
| nfl | NFL | Football | North America |
| mlb | MLB | Baseball | North America |
| milb | MiLB | Baseball | North America |
| nhl | NHL | Hockey | North America |
| mls | MLS | Soccer | North America |
| nwsl | NWSL | Soccer | North America |
| usl | USL | Soccer | North America |
| ncaa-football | NCAA Football | Football | North America |

#### International Soccer (7)

| ID | League | Sport | Region |
|----|--------|-------|-------|
| bundesliga | Bundesliga | Soccer | Germany |
| serie-a | Serie A | Soccer | Italy |
| la-liga | La Liga | Soccer | Spain |
| premier-league | Premier League | Soccer | England |
| liga-mx | Liga MX | Soccer | Mexico |
| eredivisie | Eredivisie | Soccer | Netherlands |
| ligue-1 | Ligue 1 | Soccer | France |

#### Cricket (1)

| ID | League | Sport | Region |
|----|--------|-------|-------|
| ipl | IPL | Cricket | India |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **API Gateway** | Supabase Edge Functions + Kong | Rate limiting, API key auth |
| **Database** | Supabase PostgreSQL | Keep existing schema, add API keys table |
| **AI Agents** | Google Gemini 2.0 Flash | Already integrated (~500K tokens/mo = ~$1)
| **Auth** | Supabase Auth + API Key Manager | API keys with rate limits |
| **Hosting** | Vercel or Cloudflare Workers | Edge deploy for low latency |
| **Monitoring** | Langfuse + Custom dashboards | AI ops Observability |
| **Task Queue** | In-house job_queue (keep) | Already built |

---

## Infrastructure & Costs

### Recommended Stack

| Component | Provider | Plan | Monthly Cost |
|-----------|----------|------|--------------|
| **Database** | Supabase | Free (start) | $0 |
| **API Hosting** | Cloudflare Workers | Free | $0 |
| **AI (Gemini 2.0 Flash)** | Google AI Studio | Usage-based (~500K tokens) | ~$1/mo |
| **Domain/SSL** | Cloudflare | Registrar + proxied | ~$20/mo |
| **Monitoring** | Uptime Robot | Free | $0 |
| **Optional: Email** | Resend | Free tier | $0 |
| **Backup** | Backblaze B2 | Free Tier (10GB) | $0 |
| **Total** | | | **~$20/mo** |

### Cost at Scale

| Scale | Customers | Infrastructure | Profit Margin |
|-------|------------|----------------|---------------|
| **Launch** | 0-3 | ~$25/mo | Negative |
| **Breakeven** | 3-4 | ~$50/mo | ~$3K/mo |
| **Growth** | 10 | ~$200/mo | ~$13K/mo |
| **Scale** | 25 | ~$600/mo | ~$40K/mo |

---

## Pricing Structure

### Base Tiers

| Tier | Price | Calls/mo | Leagues | History | Support |
|------|-------|----------|---------|---------|---------|---------|
| **Free** | $0 | 100 | All 18 | Current | - |
| **Starter** | $199/mo | 5K | All 18 | Current | Email |
| **Pro** | $499/mo | 25K | All 18 | 5 years | Email |
| **Editorial AI** | $999/mo | 75K | All 18 | 10 years | Priority Email |
| **Enterprise** | $1,499/mo | Unlimited | All 18 | 25 years | Dedicated |

### Add-Ons (Monthly)

| Add-On | Price | Description |
|--------|-------|-------------|
| **AI Phonetics** | +$200/mo | Pronunciation guides (IPA + simplified) |
| **AI Translations** | +$150/mo | Spanish/Mandarin translations |
| **Broadcast Exports** | +$300/mo | Vizrt, Ross, Chyron, ICONIK formats |
| **Webhook Push** | +$300/mo | Real-time custom webhook notifications (any HTTP endpoint) |
| **DAM Connectors** | +$500/mo | Native DAM integrations (Iconik, CatDV) + generic webhook |
| **MCP Server Access** | +$400/mo | For Pro tier customers who want AI-native access (Included in Editorial/Enterprise) |
| **Historical Deep** | +$500/mo | Full 25-year archive |

### Example Customer Contracts

| Customer Type | Package | Add-Ons | Monthly |
|-------------|---------|---------|---------|
| Indie developer | Starter | - | $199 |
| Local TV affiliate | Pro | AI Phonetics | $699 |
| Sports betting app | Enterprise | Webhook Push | $1,799 |
| National network | Enterprise | All add-ons | $2,950 |
| Digital Media House| Editorial AI | AI Translations | $1,149 |
| Custom broadcast partner | Custom | Everything | $10K-25K |

---

## AI Agent Architecture (Autonomous Operations)

| Agent | Role | Trigger | Autonomy Level |
|-------|------|---------|----------------|
| **ScoutAgent** | Fetch rosters from ESPN/MLB/NHL APIs | Cron (hourly) | Fully autonomous |
| **SyncOrchestrator** | Compare, detect changes, queue enrichment | After ScoutAgent | Fully autonomous |
| **LinguistAgent** | AI phonetics, translations | On new athlete | Fully autonomous |
| **CacheAgent** | Invalidate stale cache | Daily cron | Fully autonomous |
| **AlertAgent** | Monitor health, alert on failures | Continuous | Alerts human only |
| **BillingAgent** | Usage tracking, rate limiting | Daily + on-request | Alerts only |
| **SupportAgent** | Auto-respond to API issues | On webhook | Mostly autonomous |

### Autonomous Behaviors

- **Self-healing**: Exponential backoff retry (3 attempts, then alert)
- **Auto-scaling**: Supabase auto-scales; set alerts for >80% usage
- **Incident response**: AlertAgent notifies via email/Slack
- **Billing enforcement**: Hard blocks when limit reached

---

## API Specification

### Core Endpoints

```
GET  /v1/status                           - API health + data freshness
GET  /v1/leagues                          - List all supported leagues
GET  /v1/leagues/{id}/teams              - Teams in a league
GET  /v1/teams/{id}                      - Team details
GET  /v1/teams/{id}/roster               - Current roster (default: current season)
GET  /v1/teams/{id}/roster?season=2025   - Specific season roster
GET  /v1/teams/{id}/history              - All historical rosters (paginated)
GET  /v1/teams/{id}/export?format=vizrt  - Broadcast export (vizrt, ross, chyron)
GET  /v1/athletes/{id}                   - Athlete profile + AI enrichment
GET  /v1/athletes/{id}/intelligence      - AI phonetics, translations, narratives
POST /v1/athletes/{id}/corrections       - Submit data correction
GET  /v1/changes?since={timestamp}       - Delta feed (roster changes)
POST /v1/keys/rotate                     - Rotate API key
```

### Authentication

- **Header**: `Authorization: Bearer {api_key}`
- **Rate limiting**: Per-tier limits enforced (429 on exceed)
- **API keys**: Managed in `api_keys` table with `rate_limit`, `tier`, `active`
- **Key scoping**: `read` (default) or `read-write` (for webhook/correction endpoints)
- **IP allowlisting**: Optional for Enterprise tier

### Response Envelope (All Endpoints)

Every successful response wraps data in a consistent envelope:

```json
{
  "success": true,
  "data": {
    "id": "nhl-8474567",
    "full_name": "Connor McDavid",
    "phonetic_simplified": "CON-or mik-DAY-vid",
    "phonetic_ipa": "/ˈkɒnər məkˈdeɪvɪd/",
    "name_mandarin": "康纳·麦克戴维",
    "position": "C",
    "jersey_number": 97,
    "status": "active",
    "is_active": true
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-05-08T12:00:00Z",
    "tier": "pro"
  }
}
```

### Error Format

All errors use a standardized shape. Internal details (stack traces, DB errors) are never exposed.

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your monthly API call limit.",
    "details": {
      "limit": 5000,
      "used": 5001,
      "resets_at": "2026-06-01T00:00:00Z"
    },
    "request_id": "req_abc123"
  }
}
```

| Error Code | HTTP Status | When |
|------------|-------------|------|
| `INVALID_API_KEY` | 401 | Missing or invalid key |
| `FORBIDDEN` | 403 | Valid key, insufficient scope |
| `RESOURCE_NOT_FOUND` | 404 | Team/athlete/league not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Monthly or per-minute limit hit |
| `VALIDATION_ERROR` | 422 | Bad query params (e.g., invalid season) |
| `INTERNAL_ERROR` | 500 | Our fault — request_id for support |

### Pagination

**Cursor-based** for large datasets (history, athlete lists). **Offset** for small bounded sets (leagues, teams).

```
GET /v1/teams/{id}/history?cursor=eyJzZWFzb24iOjIwMjB9&limit=10
```

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "next_cursor": "eyJzZWFzb24iOjIwMTB9",
    "has_more": true,
    "total_count": 25
  },
  "meta": {
    "request_id": "req_def456"
  }
}
```

### Rate Limit Headers

Included on **every** response so clients can self-throttle:

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4832
X-RateLimit-Reset: 1717200000
```

On 429 responses, also include:

```
Retry-After: 3600
```

### Health Endpoint

```
GET /v1/status
```

```json
{
  "status": "operational",
  "version": "1.0.0",
  "data_freshness": {
    "last_sync": "2026-05-08T15:00:00Z",
    "leagues_current": 18,
    "total_athletes": 250000,
    "enrichment_coverage": "97.2%"
  }
}
```

### Version Deprecation Policy

```
Version Lifecycle:
├── v1 launches → "current"
├── v2 launches → v1 becomes "deprecated" (6-month sunset)
├── Sunset date → v1 returns 410 Gone
└── Customer notification: 90 days before sunset via email
```

---

## Implementation Timeline (90 Days)

### Phase 1: Foundation (Days 1-30)

| Week | Tasks |
|------|-------|
| 1-2 | New Supabase project, schema updates (`api_keys`, `usage_logs`) |
| 3 | API key auth logic, rate limiting middleware |
| 4 | Core REST endpoints (leagues, teams, roster) |

### Phase 2: Features (Days 31-60)

| Week | Tasks |
|------|-------|
| 5-6 | AI enrichment endpoints (phonetics, translations) |
| 7 | Broadcast export formats (Vizrt, Ross, Chyron) |
| 8 | Usage dashboard (customer self-serve) |

### Phase 3: Autonomy (Days 61-90)

| Week | Tasks |
|------|-------|
| 9 | AlertAgent, monitoring dashboards |
| 10 | BillingAgent, usage tracking |
| 11-12 | Testing, documentation, beta launch |

---

## Phase 4: DAM Integration (Post-Launch)

### Overview

| Aspect | Value |
|--------|-------|
| **Name** | DAM Native Connectors |
| **Purpose** | Push roster changes directly into broadcast DAM systems via native API adapters |
| **Architecture** | Connector Adapter Pattern — RosterSync authenticates with each DAM natively |
| **Launch Providers** | Iconik, CatDV, Generic Webhook |
| **Future Providers** | Wedia, Bynder (post-launch) |
| **Trigger** | Real-time: player added, status changed, metadata updated, team updated |
| **Target** | Broadcast production teams using DAM systems |
| **Field Mapping** | Manual — customer maps RosterSync fields to their DAM metadata fields |

### Pricing

| Add-On | Price | Description |
|-------|-------|-------------|
| **DAM Connectors** | +$500/mo | Native integrations with Iconik, CatDV, + generic webhook |

### Customer Use Cases

| Use Case | Description |
|---------|-------------|
| Auto-update player headshots | When roster changes, push new headshot URLs to Iconik/CatDV |
| Auto-update metadata | Push player metadata for searchable DAM fields |
| Team logo updates | Push team logo changes to DAM assets |
| Broadcast graphics | Trigger graphics template updates |

### Architecture

```
ScoutAgent → SyncOrchestrator → job_queue → ConnectorAgent → Adapter Router
                                  ↑                              ↓
                          dam_connections (registry)     ┌───────────────┐
                                                        │ CatDV Adapter │
                                                        │ Iconik Adapter│
                                                        │ Generic Webhook│
                                                        └───────────────┘
```

### Adapter Interface

Each provider implements the same contract:

```typescript
interface DAMAdapter {
  type: 'catdv' | 'iconik' | 'webhook';

  // Validate credentials before saving
  testConnection(credentials: DecryptedCredentials): Promise<ConnectionTestResult>;

  // Push athlete metadata to DAM
  pushAthleteMetadata(athlete: AthletePayload, config: AdapterConfig): Promise<DeliveryResult>;

  // Push team metadata to DAM
  pushTeamMetadata(team: TeamPayload, config: AdapterConfig): Promise<DeliveryResult>;
}
```

### Provider Authentication Models

| Provider | Auth Model | Credentials Stored |
|----------|-----------|-------------------|
| **CatDV** | Session-based (HTTP Basic → session token) | `base_url`, `username`, `password` |
| **Iconik** | Static App Token | `app_id`, `auth_token` |
| **Generic Webhook** | HMAC-SHA256 signed payload | `endpoint_url`, `secret_key` |

### Database Schema

```sql
-- User Profiles (Auth-linked)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  booth_mode_enabled BOOLEAN DEFAULT false, -- Optimization for iPad/Booth view
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- API Keys (Multi-tenancy Security)
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DAM Integration Connections
CREATE TABLE public.dam_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection identity
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('catdv', 'iconik', 'webhook')),

  -- Encrypted credentials (AES-256-GCM)
  credentials_encrypted BYTEA NOT NULL,
  credentials_iv BYTEA NOT NULL,

  -- Configuration
  base_url TEXT,                               -- DAM instance URL (null for webhook)
  endpoint_url TEXT,                           -- Only for 'webhook' provider
  field_mapping JSONB DEFAULT '{}',            -- RosterSync field → DAM field mapping
  events TEXT[] DEFAULT '{}'::text[],          -- Which events trigger sync

  -- Sync scope
  leagues TEXT[] DEFAULT '{}'::text[],         -- Which leagues to sync (empty = all)
  teams UUID[] DEFAULT '{}'::uuid[],           -- Specific teams (empty = all in leagues)

  -- State
  active BOOLEAN DEFAULT false,                -- Must pass connection test to activate
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dam_connections_customer ON dam_connections(customer_id);
CREATE INDEX idx_dam_connections_active ON dam_connections(active) WHERE active = true;

-- Delivery Log (shared by all connector types)
CREATE TABLE public.dam_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES dam_connections(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'dead_letter')),
  attempts INTEGER DEFAULT 0,
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_dam_delivery_log_connection ON dam_delivery_log(connection_id);
CREATE INDEX idx_dam_delivery_log_status ON dam_delivery_log(status) WHERE status != 'delivered';
```

### Field Mapping (Manual Configuration)

Customers manually map RosterSync fields to their DAM's metadata field identifiers:

```json
{
  "athlete.full_name": "clip.name",
  "athlete.jersey_number": "clip.userFields.U1",
  "athlete.position": "clip.userFields.U2",
  "athlete.phonetic_simplified": "clip.userFields.U3",
  "athlete.team_name": "clip.userFields.U4",
  "athlete.headshot_url": "clip.posterUrl"
}
```

#### Available RosterSync Source Fields

| Field Key | Description | Example |
|-----------|-------------|---------|
| `athlete.full_name` | Full display name | "Connor McDavid" |
| `athlete.first_name` | First name | "Connor" |
| `athlete.last_name` | Last name | "McDavid" |
| `athlete.jersey_number` | Jersey number | 97 |
| `athlete.position` | Position code | "C" |
| `athlete.phonetic_simplified` | Broadcast phonetic | "CON-or mik-DAY-vid" |
| `athlete.phonetic_ipa` | IPA transcription | "/ˈkɒnər məkˈdeɪvɪd/" |
| `athlete.name_mandarin` | Mandarin transliteration | "康纳·麦克戴维" |
| `athlete.name_spanish` | Spanish rendering | "Connor McDavid" |
| `athlete.birth_date` | Date of birth | "1997-01-13" |
| `athlete.nationality` | Country code | "CAN" |
| `athlete.height` | Height | "6'1\"" |
| `athlete.weight` | Weight | "190 lbs" |
| `athlete.headshot_url` | Headshot image URL | "https://..." |
| `team.name` | Team name | "Edmonton Oilers" |
| `team.abbreviation` | Team abbreviation | "EDM" |
| `league` | League ID | "nhl" |
| `season` | Season year | 2026 |
| `status` | Player roster status | "active", "injured", "deactivated", "moved" |
| `is_active` | Boolean flag for current active status | true |

#### DAM-Specific Target Fields

**CatDV:** `clip.name`, `clip.userFields.U1`–`clip.userFields.U99`, `clip.posterUrl`, `clip.notes`, `clip.bin`

**Iconik:** Customer provides their metadata view field UUIDs (e.g., `views.{view_id}.fields.{field_id}`)

### Supported Events

| `player.added` | New player in roster |
| `player.status_changed` | Player status changed (active, injured, deactivated) |
| `player.updated` | Player metadata changed (name, number, position, etc.) |
| `team.updated` | Team metadata changed |
| `roster.updated` | Full roster sync completed |

### Data Integrity: The "Never Remove" Policy

RosterSync follows an **append-only data integrity policy**. Once a player is associated with a team's roster for a specific season, they are **never deleted** from that record, even if they are traded, cut, or retired.

- **Trades/Cuts**: If a player leaves a team mid-season, their `status` is updated to `deactivated` or `moved`, and `is_active` is set to `false`. They remain in the historical roster for that team/season to preserve broadcast record accuracy.
- **Dual Association**: A player may appear on multiple team rosters in the same season (e.g., following a trade). Both records are preserved.
- **Filtering**: By default, `/v1/teams/{id}/roster` returns the full list of athletes associated with the team for that season. Clients can filter by `is_active=true` to get the current game-day roster.

### Payload Schema (Internal — Adapter Input)

```json
{
  "event": "player.status_changed",
  "event_id": "evt_abc123",
  "timestamp": "2026-04-28T12:00:00Z",
  "data": {
    "athlete": {
      "id": "nhl-8474567",
      "external_ids": { "espn": "8474567" },
      "full_name": "Connor McDavid",
      "first_name": "Connor",
      "last_name": "McDavid",
      "position": "C",
      "jersey_number": 97,
      "birth_date": "1997-01-13",
      "nationality": "CAN",
      "height": "6'1\"",
      "weight": "190 lbs",
      "phonetic_simplified": "CON-or mik-DAY-vid",
      "phonetic_ipa": "/ˈkɒnər məkˈdeɪvɪd/",
      "name_mandarin": "康纳·麦克戴维",
      "headshot_url": "https://a.espncdn.com/..."
    },
    "team": { "id": "nhl-OIL", "name": "Edmonton Oilers", "abbreviation": "EDM" },
    "league": "nhl",
    "season": 2026,
    "changes": { "updated": ["status", "is_active"] }
  }
}
```

### API Endpoints

```
GET    /v1/integrations/providers          - List supported DAM providers + required credential fields
POST   /v1/integrations                    - Create new DAM connection
GET    /v1/integrations                    - List customer's connections
GET    /v1/integrations/{id}               - Get connection details (credentials masked)
PATCH  /v1/integrations/{id}               - Update connection config
DELETE /v1/integrations/{id}               - Delete connection + destroy credentials
POST   /v1/integrations/{id}/test          - Test connection with stored credentials
POST   /v1/integrations/{id}/sync          - Trigger manual full sync
GET    /v1/integrations/{id}/deliveries    - Delivery history
```

#### Provider Discovery Response

```json
{
  "success": true,
  "data": [
    {
      "id": "catdv",
      "name": "CatDV",
      "description": "Quantum CatDV media asset management",
      "auth_type": "basic",
      "required_fields": [
        { "key": "base_url", "label": "Server URL", "type": "url", "placeholder": "https://catdv.yourcompany.com" },
        { "key": "username", "label": "Username", "type": "text" },
        { "key": "password", "label": "Password", "type": "password" }
      ]
    },
    {
      "id": "iconik",
      "name": "Iconik",
      "description": "Backlight Iconik cloud DAM",
      "auth_type": "app_token",
      "required_fields": [
        { "key": "app_id", "label": "App ID", "type": "text", "placeholder": "a1b2c3d4-..." },
        { "key": "auth_token", "label": "Auth Token", "type": "password" }
      ]
    },
    {
      "id": "webhook",
      "name": "Generic Webhook",
      "description": "Send signed JSON payloads to any HTTPS endpoint",
      "auth_type": "hmac",
      "required_fields": [
        { "key": "endpoint_url", "label": "Webhook URL", "type": "url", "placeholder": "https://hooks.yourcompany.com/roster" }
      ]
    }
  ]
}
```

### Security — Credential Management

| Layer | Implementation |
|-------|---------------|
| **At Rest** | AES-256-GCM encryption of credential JSON blobs in `dam_connections` |
| **Key Management** | Encryption key stored in Supabase Vault (never in database) |
| **In Transit** | TLS 1.3 for all API calls to DAM systems |
| **In Memory** | Decrypt only at delivery time in Edge Function, never cache plaintext |
| **In Logs** | Credentials never logged, even at DEBUG level |
| **Payload Signing** | HMAC-SHA256 in `X-Webhook-Signature` header (generic webhook only) |
| **TLS Enforcement** | Reject non-HTTPS `base_url` and `endpoint_url` values |
| **API Key Auth** | Customer's RosterSync API key in `Authorization` header for all `/v1/integrations` endpoints |

#### Encryption Flow

```
Customer submits credentials via HTTPS
  → Edge Function receives plaintext
  → Generate random 12-byte IV
  → Encrypt JSON blob with AES-256-GCM using Vault key
  → Store (encrypted_blob, iv) in dam_connections
  → Plaintext never touches disk

On delivery:
  → ConnectorAgent reads (encrypted_blob, iv)
  → Decrypt in Edge Function memory
  → Authenticate with DAM API
  → Zero plaintext after request completes
```

### Delivery Pipeline

| Step | Implementation |
|------|----------------|
| Detect change | SyncOrchestrator generates delta |
| Queue | Insert into `job_queue` with `task_type = 'dam_connector'` |
| Route | ConnectorAgent reads `dam_connections` for matching customer + events |
| Decrypt | Decrypt credentials in memory |
| Adapt | Route to CatDV/Iconik/Webhook adapter |
| Push | Adapter authenticates with DAM API and pushes mapped metadata |
| Retry | 3 attempts with exponential backoff |
| Log | Record in `dam_delivery_log` |

### Retry Strategy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 2 minutes |
| Dead-letter | Alert AlertAgent, set `status = 'dead_letter'` |

### Self-Serve Features (Integrations UI)

| Feature | Implementation |
|---------|----------------|
| Add connection | 4-step wizard: Provider → Credentials → Field Mapping → Events & Scope |
| Test connection | Validates credentials against DAM API before activation |
| Manual sync | Trigger full roster push to DAM on demand |
| View delivery logs | Success/failure history per connection |
| Pause/activate | Toggle connection active state |
| Update credentials | Re-enter credentials without re-doing field mapping |
| Delete connection | Cascade-deletes encrypted credentials immediately |

### Monitoring

| Metric | Target |
|--------|--------|
| Delivery success rate | 95%+ |
| Average delivery time | <5 seconds |
| Failed delivery alerts | AlertAgent notified |
| Credential test success | Must pass before activation |

### ConnectorAgent (New Autonomous Agent)

| Aspect | Value |
|--------|-------|
| **Role** | Process `dam_connector` jobs from `job_queue` |
| **Trigger** | After SyncOrchestrator detects roster changes |
| **Autonomy** | Fully autonomous — retries, logs, alerts on failure |
| **Dependencies** | Supabase Vault (encryption key), DAM adapter modules |

### Timeline

| Week | Tasks |
|------|-------|
| 13 | `dam_connections` table, encryption utilities, provider config |
| 14 | `/v1/integrations` CRUD endpoints |
| 15 | Iconik adapter + CatDV adapter |
| 16 | Integrations UI (list view + 4-step wizard) |
| 17 | ConnectorAgent delivery engine, retry logic, delivery logging |
| 18 | Testing, documentation, beta |

### Post-Launch: Ongoing

- ConnectorAgent runs on new roster changes (autonomous)
- AlertAgent notifies on failed deliveries after retry exhaustion
- SupportAgent handles connection configuration issues
- Future: Add Wedia + Bynder adapters (minimal effort per adapter)

| Metric | Target (90 days) |
|--------|-------------------|
| **Beta customers** | 3-5 |
| **Paid customers** | 5-10 |
| **Monthly revenue** | $10K-25K |
| **API uptime** | 99.5% |
| **Incidents requiring human** | <5/mo |

---

## Revenue Projections

| Scenario | Customers | Revenue |
|----------|-----------|---------|
| **Conservative** | 5 ent ($5K) + 10 pro ($1.5K) | $40K/mo |
| **Target** | 10 ent + 20 pro | $80K/mo |
| **Optimistic** | 20 ent + 30 pro | $160K/mo |

---

## Competitive Positioning

| Provider | Pricing | Positioning |
|----------|---------|-------------|
| **TheSportsDB** | $9-20/mo | Indie dev |
| **DataFeeds** | $100-600/mo per sport | SMB/Mid-market |
| **Sportradar** | $10K-100K+/yr | Enterprise |
| **RosterSync API** | $0-1,499/mo | Indie to Enterprise |

RosterSync API positions between DataFeeds (cheap) and Sportradar (enterprise pricing), with unique AI phonetics for broadcast talent that no competitor offers.

---

## Recommendations

### 1. Realistic Revenue Timeline

The 90-day projections assume rapid enterprise adoption, but enterprise sales cycles typically run 3-6 months per deal. A more grounded trajectory:

| Timeline | Customers | Projected MRR | Notes |
|----------|-----------|---------------|-------|
| **Month 1-3** | 1-2 Starter, 0-1 Pro | $200-$700 | Beta period, gathering feedback |
| **Month 4-6** | 3-5 Starter, 2-3 Pro | $1,500-$2,500 | First case studies published |
| **Month 7-9** | 5-8 Starter, 3-5 Pro, 1 Enterprise | $3,000-$5,500 | Enterprise pipeline maturing |
| **Month 10-12** | 8-12 Starter, 5-8 Pro, 2-3 Enterprise | $5,000-$10,000 | Repeatable sales motion |
| **Year 2** | 15+ Starter, 10+ Pro, 5+ Enterprise | $15,000-$40,000 | Word-of-mouth + integrations |

> **Key Insight**: The first 3 paying customers are the hardest. Focus on getting 1 local TV affiliate as a reference customer — their endorsement unlocks the rest of the broadcast market.

### 2. Data Quality & Integrity SLA

The entire value proposition rests on data accuracy. Customers will ask: *"How do I know 'oh-dee-SEE-as vlah-ko-DEE-mos' is correct?"* This section defines the quality contract.

#### Quality Tiers

| Data Field | Quality Standard | Verification Method |
|------------|-----------------|---------------------|
| **Roster Composition** | 99.5% accurate within 24h of official announcement | Cross-reference ESPN + league API + Wikipedia |
| **phoneticSimplified** | Broadcast-usable syllable breakdown | AI model ≥8B params + periodic human spot-check |
| **phoneticIPA** | Linguistically valid IPA transcription | AI-generated, flagged if confidence < 80% |
| **nameMandarin** | Accurate Simplified Chinese transliteration | AI-generated, validated against known databases |
| **spanishTranslation** | Broadcast Spanish rendering | AI-generated, spot-checked by native speaker |

#### Quality Assurance Process

| Step | Frequency | Owner |
|------|-----------|-------|
| **Automated Audit** | Daily | CacheAgent scans for null/echo fields |
| **Model Threshold** | Always | Enrichment only accepted from models ≥8B params |
| **Spot-Check Sample** | Weekly | Random 50-athlete sample reviewed manually |
| **Customer Corrections** | On-demand | Correction API endpoint for customer-reported errors |
| **Full Re-enrichment** | Quarterly | Re-process all athletes with latest model |

#### Correction API

```
POST /v1/athletes/{id}/corrections
{
  "field": "phoneticSimplified",
  "current_value": "tim hov",
  "suggested_value": "Tim HOW-ard",
  "source": "customer_report"
}
```

> **Lesson Learned**: The Gemma 2B "echo" incident (May 2026) demonstrated that small models produce unreliable phonetics. All production enrichment must use models with ≥8B parameters. This is now enforced in the LinguistAgent prompt and documented as a hard rule.

### 3. Pricing Tier Adjustment

The current jump from Pro ($499) to Enterprise ($1,499) is a 3x gap that may lose mid-market customers. Recommendation:

#### Revised Tiers

| Tier | Price | Calls/mo | Leagues | History | Support |
|------|-------|----------|---------|---------|---------|
| **Free** | $0 | 100 | All 18 | Current | - |
| **Starter** | $199/mo | 5K | All 18 | Current | Email |
| **Pro** | $499/mo | 25K | All 18 | 5 years | Email |
| **Business** | $999/mo | 75K | All 18 | 10 years | Priority Email |
| **Enterprise** | $1,499/mo | Unlimited | All 18 | 25 years | Dedicated |

> **Rationale**: The Business tier captures regional sports networks and mid-size betting platforms that need more than 5 years of history but don't require unlimited calls or dedicated support.

### 4. Infrastructure Cost Realism

The "$21/mo" estimate is accurate only at zero customers. Budget for actual growth:

| Scale | Supabase | Workers | AI Tokens | Monitoring | Backup | Total |
|-------|----------|---------|-----------|------------|--------|-------|
| **Launch (0-3)** | Free | Free | ~$1 | Free | Free (10GB) | ~$25/mo |
| **Growth (4-10)** | Pro ($25) | Paid ($5) | ~$10 | Uptime ($7) | ~$1 | ~$75/mo |
| **Scale (11-25)** | Pro ($25) | Paid ($5) | ~$50 | Full stack ($30) | ~$5 | ~$200/mo |
| **Enterprise (25+)** | Team ($599) | Paid ($5) | ~$200 | Full stack ($50) | ~$10 | ~$900/mo |

> **Key Insight**: Even at the Enterprise stage, infrastructure costs remain under $1K/mo — making margins extremely healthy at $40K+ MRR.

### 5. Implementation Priority (Strangler Fig)

Rather than building everything at once, wrap existing infrastructure incrementally:

| Priority | Task | Effort | Revenue Unlocked |
|----------|------|--------|-----------------|
| **P0** | REST endpoints wrapping existing Supabase queries | 1 week | All tiers |
| **P1** | `api_keys` table + Bearer auth middleware | 3 days | Paid access |
| **P2** | `usage_logs` table + rate limiting | 3 days | Billing enforcement |
| **P3** | `/v1/athletes/{id}/intelligence` endpoint | 2 days | Phonetics add-on ($200/mo) |
| **P4** | Broadcast export formats (Vizrt, Ross, Chyron) | 1 week | Export add-on ($300/mo) |
| **P5** | Webhook delivery system | 2-3 weeks | Webhook add-on ($300/mo) |
| **P6** | DAM integrations | 2 weeks | DAM add-on ($500/mo) |

> **Chesterton's Fence**: The existing `job_queue`, `reference_rosters`, and agent architecture are battle-tested. Do not rewrite them. Wrap them in a REST API layer and ship.

### 6. Go-To-Market Checklist (Pre-Launch)

Before approaching the first paying customer, these must be true:

- [ ] All 18 leagues enriched at ≥95% with ≥8B model quality
- [ ] MLS and USL "Healing Pass" complete (Llama 3.1 re-enrichment)
- [ ] Automated daily audit catches null/echo phonetics
- [ ] API documentation hosted (Swagger/OpenAPI)
- [ ] At least 1 broadcast export format working (Vizrt recommended — largest market share)
- [ ] Rate limiting tested under load (simulate 25K calls/day)
- [ ] Correction API endpoint live
- [ ] Landing page updated with API pricing and "Get API Key" CTA

---

## 7. API Design Review (api-patterns audit)

An assessment of the API specification against REST best practices, response format standards, auth patterns, rate limiting, and versioning strategy.

### 7.1 Endpoint Design — ✅ Strong

The current endpoint design follows REST conventions well:

| Rule | Compliance | Notes |
|------|-----------|-------|
| Nouns, not verbs | ✅ | `/leagues`, `/teams`, `/athletes` — correct |
| Plural resources | ✅ | All plural |
| Lowercase with hyphens | ⚠️ Mostly | No hyphens needed yet, but keep as convention |
| Nesting for relationships | ✅ | `/teams/{id}/roster` — clean parent-child |
| Max 3 levels deep | ✅ | Deepest is `/teams/{id}/roster` (2 levels) |

**One issue**: The `/v1/export/{format}/{team_id}` endpoint puts the *format* before the *resource*. This breaks the noun-first convention.

```diff
# Current (format before resource — awkward)
- GET /v1/export/{format}/{team_id}

# Recommended (resource first, format as query param)
+ GET /v1/teams/{team_id}/export?format=vizrt
```

### 7.2 Response Envelope — 🔴 Missing

The spec defines endpoints but never defines the **response shape**. This is critical — every consumer will ask "what does the JSON look like?"

**Recommended**: Adopt the envelope pattern for all responses:

```json
{
  "success": true,
  "data": {
    "id": "nhl-8474567",
    "full_name": "Connor McDavid",
    "phonetic_simplified": "CON-or mik-DAY-vid"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-05-08T12:00:00Z"
  }
}
```

**Error responses** must include:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your monthly API call limit.",
    "details": {
      "limit": 5000,
      "used": 5001,
      "resets_at": "2026-06-01T00:00:00Z"
    },
    "request_id": "req_abc123"
  }
}
```

> **Rule**: Never expose internal errors (stack traces, DB errors) to clients. Use the `request_id` for support debugging.

### 7.3 Pagination — 🔴 Missing

The spec has no pagination strategy. For roster history endpoints (`/teams/{id}/history`), this is essential — some teams have 25 seasons of data.

**Recommended**: **Cursor-based pagination** for large datasets (roster history, athlete lists), **offset** for small bounded sets (leagues, teams):

```
GET /v1/teams/{id}/history?cursor=eyJzZWFzb24iOjIwMjB9&limit=10
```

Response includes:

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJzZWFzb24iOjIwMTB9",
    "has_more": true,
    "total_count": 25
  }
}
```

### 7.4 Authentication — ✅ Correct Pattern

API Keys for server-to-server is the right choice for this use case:

| Factor | Assessment |
|--------|-----------|
| **Consumer type** | Server-to-server (broadcast systems, apps) | ✅ API Keys ideal |
| **Auth header** | `Authorization: Bearer {api_key}` | ✅ Standard |
| **Key management** | `api_keys` table with `rate_limit`, `tier`, `active` | ✅ Solid |

**Missing pieces to add**:

- [ ] API key rotation endpoint (`POST /v1/keys/rotate`)
- [ ] Key scoping (read-only vs. read-write for webhook management)
- [ ] IP allowlisting (optional, for enterprise customers)

### 7.5 Rate Limiting — ⚠️ Partially Defined

The spec mentions per-tier limits and 429 responses, but doesn't specify the *algorithm* or *response headers*.

**Recommended**: Token bucket algorithm (allows bursts) with standard headers:

```
Response headers on EVERY request:

X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4832
X-RateLimit-Reset: 1717200000
```

On 429 response, also include:

```
Retry-After: 3600
```

| Tier | Strategy | Limit |
|------|----------|-------|
| **Free** | Fixed window | 100/month (hard cap) |
| **Starter** | Token bucket | 5K/month, burst 50/min |
| **Pro** | Token bucket | 25K/month, burst 200/min |
| **Business** | Token bucket | 75K/month, burst 500/min |
| **Enterprise** | Sliding window | Unlimited, 1000/min soft cap |

### 7.6 Versioning — ✅ Correct Choice

URI-based versioning (`/v1/`) is the right call for a public API:

| Factor | Assessment |
|--------|-----------|
| Public API? | Yes → URI versioning ✅ |
| Easy caching? | Yes — CDN-friendly ✅ |
| Clear discovery? | Yes — version visible in URL ✅ |

**Add to spec**: A deprecation policy.

```
Version Lifecycle:
├── v1 launches → "current"
├── v2 launches → v1 becomes "deprecated" (6-month sunset)
├── Sunset date → v1 returns 410 Gone
└── Customer notification: 90 days before sunset
```

### 7.7 Missing Endpoint: Health & Status

No health/status endpoint is defined. Every production API needs one:

```
GET /v1/status          — API health + data freshness

Response:
{
  "status": "operational",
  "version": "1.0.0",
  "data_freshness": {
    "last_sync": "2026-05-08T15:00:00Z",
    "leagues_current": 18,
    "total_athletes": 250000
  }
}
```

This is what customers check before filing a support ticket. It's also what monitoring services (Uptime Robot) can poll.

### API Design Checklist Status

| Check | Status |
|-------|--------|
| API style chosen for context? | ✅ REST — correct for public data API |
| Consistent response format? | 🔴 **Needs envelope pattern defined** |
| Pagination planned? | 🔴 **Needs cursor strategy** |
| Versioning strategy? | ✅ URI-based `/v1/` |
| Authentication? | ✅ API Keys — correct for use case |
| Rate limiting? | ⚠️ **Needs algorithm + headers** |
| Documentation approach? | ⚠️ **Mentioned but not specified (OpenAPI recommended)** |
| Error format? | 🔴 **Needs standardized error envelope** |