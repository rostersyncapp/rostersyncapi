---
name: rostersync-mcp
description: Specialized patterns for the RosterSync Intelligence Server (MCP). Defines how the MCP Proxy exposes Tier 2 agents (Linguist, Momentum) to external LLMs. Use when modifying MCP tool definitions or agent prompts.
---

# RosterSync MCP Intelligence Skill

This skill defines the "Intelligence Wrapper" protocols for the RosterSync MCP Server.

## 🧠 Tool Definitions

### 1. `get_athlete_phonetics`
- **Source:** Pulls from `LinguistAgent` output.
- **Context:** Return both "Simplified" (Standard) and "IPA" (Advanced) phonetic guides.
- **Trigger:** Use when an agent asks for pronunciation or broadcast preparation.

### 2. `get_athlete_momentum`
- **Source:** Pulls from `MomentumAgent` pulses.
- **Context:** Returns the latest "Narrative Pulse" for the player (e.g., "On a 5-game point streak").
- **Trigger:** Use when an agent asks for "context" or "pre-game stats."

## 🤖 Agent Chaining (The "Knowledge Mesh")
- **Fallback:** If a direct lookup fails, the MCP Proxy should trigger a `ResearcherAgent` sub-task to verify the data in real-time.
- **Persona:** The MCP response should be formatted for **Broadcast Announcers**—clear, concise, and highly readable.
