# RosterSync DAM-Only Product Plan

## The Product

RosterSync delivers enriched roster metadata (names, numbers, positions, phonetics, IPA, team colors, Mandarin) into wherever the customer needs it — automatically, with zero setup.

No API keys to generate. No polling intervals to configure. No field mapping. Connect once, rosters update when they change. That's it.

## The Two Tiers

| | Sync ($49/mo) | Studio ($149/mo) |
|---|---|---|
| Delivery | CSV download + daily email | CSV download + daily email + DAM push + broadcast URL |
| Google Sheets sync | Optional | Optional |
| Leagues | FB, MBB, WBB + 1 pro league | All 18 leagues |
| History | 3 years | 25 years |
| Data | Name, #, pos, year, H/W | Same + phonetics, IPA, Mandarin, colors |
| Best for | Mid-major D1, small pro, indie | Power 5, pro team, network |

## Delivery Mechanisms

### 1. CSV Download (both tiers) — THE BASELINE

The customer logs into the dashboard and clicks "Download Roster." A CSV with all current roster data downloads immediately. Columns: Player Name, Number, Position, Class/Year, Height, Weight, Phonetic Spelling, IPA, Mandarin.

Zero setup. Always there. They can come back any time and get the latest.

### 2. Daily Email Digest (both tiers)

Every morning during active season, an automated email lands in the SID's inbox:
- Current full roster
- Changes since last email (player added, removed, transferred)
- CSV attached + "Download latest" link

Zero setup. The safety net for the SID who doesn't visit the dashboard.

### 3. Google Sheets Sync (both tiers, optional)

The customer authorizes Google Sheets once. A spreadsheet appears in their Drive with the same data. Updates automatically when rosters change.

Optional — only if they want the auto-updating shared sheet for their team. Not required.

### 4. DAM Push (Studio only)

For customers with Iconik or CatDV. RosterSync pushes metadata directly into their DAM when rosters change. Trades, call-ups, transfers, graduation — their DAM stays current without anyone touching a keyboard.

CatDV push needs to be built (currently a stub). Iconik push works today.

### 5. Broadcast Polling URL (Studio only)

For customers with Vizrt, Ross XPression, or Chyron. They get a stable URL they configure once in their graphics engine. The engine polls RosterSync automatically. No API key management, no rate limits to think about.

## Auto-Update Architecture (How Changes Propagate)

The missing piece. Today, DAM sync is fully manual — click "Sync" and it pushes once. Graphics polling works only because the customer configured their engine to pull. For auto-update, changes must propagate automatically from roster sync → DAM delivery.

### The Pipeline

```
ScoutAgent syncs roster
        ↓
reference_rosters.updated_at changes
        ↓
Supabase Database Webhook fires (POST)
        ↓
Cloudflare Worker POST /v1/webhooks/roster-change
        ↓
Queries matching active dam_connections → enqueues dam_connector jobs
        ↓
dam-connector-worker picks up jobs → ConnectorAgent pushes to DAM
        ↓
Result logged in dam_delivery_log
```

### Step-by-step

**1. Supabase Database Webhook** — Configured on `reference_rosters` table, fires on INSERT or UPDATE. Sends POST to Cloudflare Worker with the changed record (league_id, team_id, season_year) and an HMAC-signed secret for verification.

**2. Cloudflare Worker `POST /v1/webhooks/roster-change`** — New endpoint that:
- Verifies the webhook HMAC secret
- Ignores DELETE events
- Extracts `league_id`, `team_id` from the payload
- Queries all active `dam_connections` where the connection's leagues/teams scope matches this roster

Scope matching query:
```sql
active = true
AND (
  leagues IS NULL
  OR leagues = '{}'
  OR league_id = ANY(leagues)
)
AND (
  teams IS NULL
  OR teams = '{}'
  OR team_id = ANY(teams)
)
```

- Enqueues a `dam_connector` job for each matching connection

**3. `dam-connector-worker`** — New script (local or Supabase Edge Function) that:
- Polls `job_queue` for `task_type = 'dam_connector'` every few seconds
- Calls the existing `ConnectorAgent` (with a new `syncRosterToDAM()` method)
- Writes results to `dam_delivery_log`
- Retries on failure: 3 attempts (30s, 2min, 5min), then dead-letter

**4. `syncRosterToDAM()` on ConnectorAgent** — New method that:
- Fetches full `reference_rosters.roster_data` for the team/season
- Iterates all players and pushes metadata to the DAM (Iconik or CatDV)
- Reuses existing per-field push logic from `syncAthleteToDAM()`

### Edge cases

| Scenario | Behavior |
|----------|----------|
| Webhook fires mid-sync | `roster_update` and `dam_connector` are independent queues. DAM sync runs after roster is committed. |
| Multiple rapid updates | Webhook fires per update; worker processes sequentially per connection. Last write wins. |
| No matching connections | Webhook fires, query returns zero, nothing enqueued. No-op. |
| DAM is unreachable | 3 retries, then dead-letter. Connection stays active. Admin notified via dashboard. |
| Roster sync for ncaa womens golf (nobody has it scoped) | Scope matching filters by `leagues[]` array. Empty = accept all. |

### What doesn't change

- Manual "Sync" button still works
- Broadcast polling URLs (Vizrt/Ross) unchanged — they were always pull-based
- ScoutAgent / LinguistAgent sync flow untouched
- No schema changes to `dam_connections` — it already has `leagues[]`, `teams[]`, `events[]`, `active`

## What Exists Today vs What Needs Building

| Feature | Status | Build Days |
|---|---|---|---|---|
| Database (25yr, 18 leagues, phonetics, IPA, colors, Mandarin) | Done | 0 |
| Broadcast export API (Vizrt/Ross/Chyron) | Done | 0 |
| Iconik DAM push | Done (manual trigger) | 0 |
| CatDV DAM push | Stub — returns success but does nothing | 2 |
| Dashboard CSV download | Partial — exists via API export, needs a "Download CSV" button | 1 |
| Daily email digest | Not started | 1 |
| Google Sheets sync | Not started | 3 |
| Supabase webhook config + endpoint | Not started | 1 |
| Scope matching (connection query) | Not started | 0.5 |
| `dam-connector-worker` (poll + invoke ConnectorAgent) | Not started | 2 |
| `syncRosterToDAM()` on ConnectorAgent | Not started | 1 |
| `dam_delivery_log` writes + end-to-end test | Not started | 1 |
| Self-serve onboarding (2-step signup) | Needs stripping down | 2 |
| Dashboard "one-click" connection UI | Partial — exists for DAM, needs Sheets | 2 |

**Total build: ~16.5 days for a single developer.**

## The Onboarding Flow

Step 1: Enter email + credit card → choose Sync ($49) or Studio ($149)
Step 2: Dashboard loads → "Here's your roster. Download CSV, set up email delivery, or connect Google Sheets / DAM."
Step 3: Done. Data is available immediately. No further steps required.

No API key step. No "how many requests per second" step. No forced integration setup. The product makes the right choices automatically.

## Revenue Model

| Metric | Value |
|---|---|
| Customers needed to cover full-time dev salary ($120k) | 68 Studio or 204 Sync |
| Customers at 1yr for "real business" ($240k) | 135 Studio or 408 Sync |
| D1 schools alone | 366 |
| D1 FBS schools (Power 4 + G5) | 130 |
| Minor league / USL / indy teams | ~200 |
| **Total addressable (realistic)** | **~600 organizations** |

## Year 1 Projections (Self-Serve + Social)

The #Cosida / #SIDlife community on X is small enough that one visible SID using the product triggers 10-20 signups from peers asking "how'd you do that?"

| | No social push | Active on X + LinkedIn |
|---|---|---|
| Customers by month 12 | 50 | 80-120 |
| Sync/Studio split | 70/30 | 65/35 |
| Average MRR at month 12 | ~$3,200 | ~$5,200-8,200 |
| Year 1 ARR | ~$24k | ~$40-60k |
| Year 1 total revenue (ramped) | ~$12k | ~$22-34k |

**What moves the needle:**
- Not posting into the void. One DM to a mid-major SID: "hey I built this, want it for free?" They try it, they like it, they post. That's worth 100 ad impressions.
- 3-5 organic "customer love" posts from SIDs showing the Google Sheet auto-updating. That's your entire marketing budget.
- No paid ads. The community is small enough that word of mouth beats everything.

**Year 2 compound:** 80-120 customers at year 1, <10% churn, referrals compounding → **$100-120k ARR by month 24** without adding a single feature.

## Unit Economics

~$0 marginal cost per customer. 99% gross margin.

## Market Positioning Notes

- **Nobody is doing this.** The closest competitor is North Shore Automation's Stats Injector (CatDV partner, live game clip logging). They tag footage with play-by-play data. RosterSync enriches DAMs with biographical roster metadata. Complementary, not competitive.
- **The university angle is the wedge.** Mid-major D1 SIDs have the pain, a P-card, and no existing solution. $49/mo is an instant yes. Once they're in, they stay in for years.
- **Power 5 schools graduate to Studio** when they need more leagues or have a real DAM. No migration — just upgrade the tier, connect the DAM, done.
- **The 25-year dataset is the moat.** No one else has 18 leagues of curated biographical data with phonetics, IPA, and Mandarin. You're selling data that took years to build, not a feature that takes a sprint to clone.
