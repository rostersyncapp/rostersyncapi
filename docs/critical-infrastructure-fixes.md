# Critical Infrastructure & Security Fixes

This document serves as an official ledger of the critical architectural and security remediations applied to the RosterSync API to meet Enterprise B2B broadcast standards.

## 1. Request-Scoped Database Context (Token Leakage Mitigation)
**Severity**: CRITICAL (OWASP A01:2025 - Broken Access Control)
**Resolution**:
- **Removed**: The dangerous global `setSupabaseToken` singleton method that caused global state pollution.
- **Implemented**: A Request-Scoped Factory Pattern (`createScopedClient(token)`) in `services/supabase.ts`. 
- **Impact**: Multi-tenant environments (e.g., ESPN and FOX users hitting the Edge server simultaneously) now execute in completely isolated, zero-leak database contexts, ensuring Row Level Security (RLS) is strictly enforced per request.

## 2. Agent Base Class Enforcement (Architectural Drift)
**Severity**: CRITICAL (OWASP A06:2025 - Insecure Design)
**Resolution**:
- **Updated**: The abstract `Agent.ts` base class now natively hooks into subclass configurations during the LLM invocation flow.
- **Implemented**: Added `getTools()`, `getGenerationConfig()`, and `getSystemInstruction()` to the Gemini generation payload.
- **Impact**: Any safety guardrails, PII sanitization tools, or strict JSON constraints defined by specialized sub-agents (like `LinguistAgent` or `ConnectorAgent`) are now strictly enforced by the base class. The system can no longer "fail open."

## 3. Cryptographic Auth Validation (Weak Auth Hardening)
**Severity**: HIGH (OWASP A07:2025 - Authentication Failures)
**Resolution**:
- **Deprecated**: The placeholder `validateOrg` function that solely relied on checking if a profile existed.
- **Implemented**: A dedicated `api_keys` table schema to store hashed API credentials for organizational access.
- **Enforced**: Refactored the MCP Server and the OpenAI Bridge schema to explicitly require an `apiKey` (e.g., `rs_live_...`).
- **Impact**: The MCP server no longer trusts arbitrary organization IDs passed in tool arguments. It mathematically verifies the incoming API Key against the database before executing sensitive "Action" tools like `sync_to_dam`, effectively neutralizing brute-force IDOR attacks.

## 4. Zombie File Elimination (Serverless Cold Start Optimization)
**Severity**: MEDIUM (Performance Bottleneck)
**Resolution**:
- **Removed**: Deleted the massive 255KB `teamData.ts` static mapping file which was inflating the serverless bundle size and drastically increasing V8 isolate cold-start latency.
- **Implemented**: Executed a 1000+ row SQL migration to populate the `teams_metadata` database table with all hardcoded `KNOWN_TEAM_LOGOS`, `NHL_API_CODES`, and `ESPN_TEAM_IDS`.
- **Refactored**: Updated the `ScoutAgent` resolving logic (`utils.ts`) and `ESPNStrategy` to fallback to live database queries (`teams_metadata`) instead of loading a static dictionary into memory.
- **Impact**: The backend bundle is significantly lighter, resulting in faster Edge Function boot times. Metadata updates (like logo or color changes) can now be performed dynamically via the database without requiring a full code deployment.

## 5. Exclusively Gemini-Native Pipeline (Technical Debt & Complexity Reduction)
**Severity**: LOW (Architectural Simplification)
**Resolution**:
- **Deprecated**: Completely removed the local `ollama` and hosted `openrouter` execution blocks from the abstract `Agent` base class (`Agent.ts`).
- **Refactored**: Optimized `Agent.callModel` to interface directly and exclusively with the `@google/generative-ai` SDK, natively leveraging Gemini's tool/function schemas and generation payloads.
- **Impact**: Deleted dozens of lines of redundant fetch-based fallback code, simplified runtime configurations, and streamlined unit testing boundaries to exclusively target the Google Gemini 2.5 Flash / Pro API suites. Developers can no longer launch the platform in unconfigured/flaky local AI states.
