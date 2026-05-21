# Graph Report - rostersyncapi  (2026-05-21)

## Corpus Check
- 49 files · ~291,937 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 173 nodes · 214 edges · 10 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `NarrativeArchitectAgent` - 6 edges
2. `resolveTeamInfo()` - 6 edges
3. `TeamArchitectAgent` - 5 edges
4. `fetchNCAARosterFromCore()` - 5 edges
5. `callModel()` - 4 edges
6. `ConnectorAgent` - 4 edges
7. `WikipediaScraperAgent` - 4 edges
8. `ResearcherAgent` - 4 edges
9. `AthleteIntelligence` - 3 edges
10. `EnvironmentAgent` - 3 edges

## Surprising Connections (you probably didn't know these)
- `updateTeamBranding()` --calls--> `createScopedClient()`  [INFERRED]
  app/internal/branding-audit/actions.ts → services/supabase.ts
- `withRetry()` --calls--> `callModel()`  [INFERRED]
  services/ai-utils.ts → services/agents/Agent.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (14): ScoutAgent, BundesligaStrategy, EredivisieStrategy, IPLStrategy, LaLigaStrategy, LigaMXStrategy, Ligue1Strategy, MLBStrategy (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (4): ConnectorAgent, updateTeamBranding(), AthleteIntelligence, createScopedClient()

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (8): callModel(), extractJSON(), getModelName(), ArchiveAgent, FactCheckerAgent, MomentumAgent, ResearcherAgent, withRetry()

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (7): fetchNCAARosterFromCore(), resolveTeamInfo(), ESPNStrategy, NCAABasketballStrategy, NCAAFootballStrategy, NCAAWomensBasketballStrategy, NHLStrategy

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (4): EnvironmentAgent, NarrativePulseAgent, TeamArchitectAgent, TeamLegacyAgent

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (2): WikipediaScraperAgent, MLSStrategy

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (3): LinguistAgent, checkRosterNeedsSync(), runWorker()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (1): NarrativeArchitectAgent

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (1): NFLStrategy

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): enqueueLeague(), main()

## Knowledge Gaps
- **Thin community `Community 5`** (8 nodes): `WikipediaScraperAgent`, `.constructor()`, `.fetchFromKnowledge()`, `.scrapeRoster()`, `MLSStrategy.ts`, `WikipediaScraperAgent.ts`, `MLSStrategy`, `.fetch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (7 nodes): `NarrativeArchitectAgent`, `.constructor()`, `.getGenerationConfig()`, `.getTools()`, `.writeBroadcastCopy()`, `.writeBroadcastCopyBatch()`, `NarrativeArchitectAgent.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (4 nodes): `NFLStrategy.ts`, `NFLStrategy`, `.fetch()`, `.parseCsvLine()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (3 nodes): `enqueueLeague()`, `main()`, `enqueue-roster-jobs.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 5 inferred relationships involving `resolveTeamInfo()` (e.g. with `.fetch()` and `.fetch()`) actually correct?**
  _`resolveTeamInfo()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `fetchNCAARosterFromCore()` (e.g. with `.fetch()` and `.fetch()`) actually correct?**
  _`fetchNCAARosterFromCore()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._