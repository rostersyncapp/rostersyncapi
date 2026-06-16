# Graph Report - rostersyncapi  (2026-06-16)

## Corpus Check
- 146 files · ~3,021,399 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 432 nodes · 510 edges · 14 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 35 edges
2. `decryptCredentials()` - 12 edges
3. `ConnectorAgent` - 10 edges
4. `encryptCredentials()` - 7 edges
5. `runWorker()` - 7 edges
6. `syncLeagueRosters()` - 7 edges
7. `GET()` - 6 edges
8. `getDAMConnections()` - 6 edges
9. `testDAMConnection()` - 6 edges
10. `main()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `signOut()` --calls--> `createClient()`  [INFERRED]
  app/auth/actions.ts → utils/supabase/server.ts
- `signInWithGoogle()` --calls--> `createClient()`  [INFERRED]
  app/auth/actions.ts → utils/supabase/server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app/api/auth/google/callback/route.ts → utils/supabase/server.ts
- `DashboardLayout()` --calls--> `createClient()`  [INFERRED]
  app/dashboard/layout.tsx → utils/supabase/server.ts
- `getDAMConnections()` --calls--> `createClient()`  [INFERRED]
  app/dashboard/settings/actions.ts → utils/supabase/server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (22): ScoutAgent, fetchNCAARosterFromCore(), resolveTeamInfo(), BundesligaStrategy, EredivisieStrategy, IPLStrategy, LaLigaStrategy, LigaMXStrategy (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (13): callModel(), extractJSON(), getModelName(), ArchiveAgent, EnvironmentAgent, FactCheckerAgent, MomentumAgent, NarrativePulseAgent (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (26): signIn(), signInWithGoogle(), signOut(), signUp(), POST(), DashboardLayout(), GET(), handleSubmit() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): GET(), run(), deleteDAMConnection(), extractSessionToken(), getDAMConnections(), getDeliveryLogs(), getFieldMappings(), resolveCatDVEndpoint() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (4): getSpotterData(), updateTeamBranding(), AthleteIntelligence, createScopedClient()

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (7): ConnectorAgent, extractSessionToken(), resolveCatDVEndpoint(), WikipediaScraperAgent, testUrl(), testESPNHistory(), ESPNStrategy

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (11): getNormalizedWeight(), main(), checkRosterNeedsSync(), getNormalizedWeight(), runWorker(), main(), syncLeagueRosters(), convertHeightToImperial() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (4): handleDownloadCSV(), handleSyncToDAM(), setSavingTimeout(), formatSeasonLabel()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (3): LinguistAgent, enrichTable(), main()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (3): extractSessionToken(), getMaskedCredentials(), resolveCatDVEndpoint()

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (7): bytesToHex(), decryptCredentials(), encryptCredentials(), generateRandomApiKey(), getCryptoKey(), hashApiKey(), hexToBytes()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (1): NarrativeArchitectAgent

### Community 12 - "Community 12"
Cohesion: 0.83
Nodes (3): fetchAllRosters(), fetchAllTeams(), main()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): enqueueLeague(), main()

## Knowledge Gaps
- **Thin community `Community 11`** (7 nodes): `NarrativeArchitectAgent`, `.constructor()`, `.getGenerationConfig()`, `.getTools()`, `.writeBroadcastCopy()`, `.writeBroadcastCopyBatch()`, `NarrativeArchitectAgent.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `enqueueLeague()`, `main()`, `enqueue-roster-jobs.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 2` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `createScopedClient()` connect `Community 4` to `Community 2`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `syncTeamRosterToDAMAction()` connect `Community 2` to `Community 7`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 34 inferred relationships involving `createClient()` (e.g. with `signIn()` and `signUp()`) actually correct?**
  _`createClient()` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `decryptCredentials()` (e.g. with `getDAMConnections()` and `saveDAMConnection()`) actually correct?**
  _`decryptCredentials()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `encryptCredentials()` (e.g. with `saveDAMConnection()` and `GET()`) actually correct?**
  _`encryptCredentials()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `runWorker()` (e.g. with `convertHeightToImperial()` and `convertHeightToMetric()`) actually correct?**
  _`runWorker()` has 4 INFERRED edges - model-reasoned connections that need verification._