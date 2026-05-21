# RosterSync MCP Strategy: Server Suggestions

Based on our discussion and the architecture of the RosterSync data pipeline and API, here are 4 specific MCP (Model Context Protocol) server concepts. They are broken down into **External Revenue** (servers you build for your customers) and **Internal Pipeline** (servers you build or use to make your own agents smarter).

---

## 1. RosterSync Intelligence Server (External / B2B)
*The most direct path to new revenue and Enterprise lock-in.*

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Booth Brief** | Aggregated game-day 'Cheat Sheet' (Rosters + Momentum + Phonetics) | ✅ Implemented |
| **Verification Tool** | Fact-check AI narratives against raw stats/evidence | ✅ Implemented |
| **Multi-modal** | Audio URIs for name pronunciation guides | ✅ Implemented |
| **Auth Middleware** | Multi-tenancy RLS forwarding for tool calls | ✅ Implemented |
* **Who:** Broadcast networks, sports journalists, TV producers, and sports betting platforms (e.g., offered as an exclusive feature in the $1,499/mo Enterprise tier).

---

## 2. Sports Web Researcher Server (Internal)
*The solution to the `MomentumAgent` hallucination problem.*

* **What:** An MCP server that provides structured, real-time sports search capabilities. It would expose tools like `search_recent_sports_news(athlete)`, `check_injury_status(athlete)`, or `get_recent_streaks()`.
* **Why:** In your `MomentumAgent`, you are asking the LLM to research volatile data (news from the last 7 days, current injuries). Without a search tool, the LLM will guess or hallucinate based on its training data cutoff. By giving the `MomentumAgent` an MCP client connected to a search-backed MCP server (using Google Search or Brave APIs), it will pull real, verified data into its context window *before* generating the JSON output. 
* **Who:** Used internally by your `MomentumAgent` and `FactCheckerAgent` to guarantee data accuracy and broadcast-grade reliability.

---

## 3. Official League Data Server (Internal Ingestion)
*A way to clean up the `ScoutAgent` architecture.*

* **What:** An MCP server that standardizes the chaotic mix of public sports APIs (ESPN, MLB Stats API, NHL API, etc.). It exposes a single, clean tool set like `fetch_raw_roster(league, team)` and handles the messy REST parsing behind the scenes.
* **Why:** Your `ScoutAgent` has to juggle 18 different leagues, each with different JSON structures and pagination quirks. If you move this logic into an MCP server, your `ScoutAgent` becomes much dumber and more reliable—it just asks the MCP server for the data, and the MCP server handles the API specifics. This decouples the AI logic from the data-fetching logic.
* **Who:** Used internally by your `ScoutAgent` (Data Pipeline).

---

## 4. DAM Connector Server (Implemented)
*Turning your data into automated media assets.*

* **What:** An MCP server that speaks the language of Media Asset Management systems (CatDV, Iconik). It exposes tools like `sync_athlete_to_dam`.
* **Why:** By bridging your enriched rosters with their DAM, you eliminate hours of manual entry. Announcers can now "talk" to their DAM via the MCP server: "Push McDavid's latest phonetics to our Iconik system."
* **Status**: Fully integrated into the `ConnectorAgent` and exposed via the Intelligence MCP Server.

---

## 5. Universal AI Compatibility (The OpenAI Bridge)
*The solution for ChatGPT, Codex, and OpenAI Assistant integration.*

* **What:** A translation layer that mirrors MCP tools as standard OpenAPI (REST) endpoints. 
* **Why:** While Claude and Gemini speak MCP, OpenAI uses "Actions" (OpenAPI specs). By providing a `/v1/openai/spec.json` endpoint, we make RosterSync instantly compatible with the entire OpenAI ecosystem without writing new tool logic.
* **Benefit:** You can market RosterSync as "Compatible with Claude, ChatGPT, and Gemini" from Day 1.

---

## 6. Pricing Strategy (The "MCP Upsell" Ladder)

Based on current 2026 market trends for sports data and B2B SaaS, this tiered model perfectly positions the RosterSync Intelligence Server (MCP) as the ultimate enterprise value driver.

### 1. The Pro Tier: "The Production Specialist"
**Price Point:** $499 / month  
**Target:** Regional sports networks and mid-sized digital media houses.

*   **REST API Access:** Full use of the RosterSync dashboard and API.
*   **Historical Data**: 5 years of historical archives.
*   **Internal MomentumAgent:** Access to momentum reports within the UI.
*   **MCP Access**: Available as a **$400/mo add-on**.

### 2. The Editorial AI Tier: "The AI-Native Newsroom"
**Price Point:** $999 / month  
**Target:** National digital publications, major sports blogs, and content agencies.

*   **Everything in Pro.**
*   **The Crown Jewel**: Official RosterSync Intelligence Server (MCP) included.
*   **Plug-and-Play AI**: Editorial teams can plug this into Claude Desktop instantly.
*   **Historical Data**: 10 years of historical archives.
*   **Translations**: Includes AI Spanish/Mandarin translations.

### 3. The Enterprise Tier: "The Global Network"
**Price Point:** $1,499 / month  
**Target:** Major networks (ESPN, Fox Sports), betting platforms, and broadcast partners.

*   **Everything in Editorial AI.**
*   **The Actionable Advantage**: Full access to the `sync_to_dam` tool for Iconik/CatDV.
*   **Historical Archive**: Full 25-year deep archive.
*   **Custom Mapping**: Dedicated setup for complex field mappings in their DAM.
*   **Booth Mode**: Enterprise-grade optimization for iPad/Tablet broadcaster boards.
