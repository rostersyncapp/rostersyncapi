# How It Works: The RosterSync Delivery Architecture

RosterSync uses three distinct delivery methods to get athlete intelligence into the hands of broadcast professionals. The method used depends entirely on the type of machine or system consuming the data.

---

## 1. Broadcast Graphics (Chyron, Vizrt, Ross) 
**Method:** They PULL from us via the **REST API**

Broadcast graphics engines are traditionally script-heavy and rely on explicit data-binding. A graphics operator running Ross XPression or Vizrt will write a script that makes a standard `GET` request to your API (e.g., `GET /v1/teams/edm/roster`).

*   **How it works:** The graphics system provides its RosterSync API Key, RosterSync returns a standard JSON payload with the phonetics and stats, and the graphics engine automatically renders the lower-third graphic on the TV broadcast.
*   **Why we need it:** These legacy, high-reliability systems cannot talk to an MCP server natively. They require standard, predictable REST JSON endpoints. The REST API is the absolute foundation of the product.

---

## 2. MAM & DAM Systems (Iconik, CatDV) 
**Method:** We PUSH to them via **Native Connectors**

As mapped out in the Phase 4 Strategy, RosterSync does not wait for a DAM like Iconik to ask for data. Instead, RosterSync actively pushes it to them to keep their metadata perfectly synchronized.

*   **How it works:** The customer enters their Iconik/CatDV API credentials into the RosterSync UI. When the `ScoutAgent` detects that a player's status or momentum has changed, the internal `ConnectorAgent` wakes up, authenticates directly with the customer's DAM database using the stored credentials, and updates the metadata on their video clips automatically.
*   **The benefit:** Zero code is required from the customer. They simply map the data fields in the RosterSync UI, and the autonomous agents do all the heavy lifting.

---

## 3. Enterprise AI Assistants (Claude, Custom Bots)
**Method:** They QUERY us via the **MCP Server**

This is the newest intelligence layer. If a major network builds an internal "StatsBot" in Slack for their journalists, or uses Claude Desktop in the newsroom, they don't want to write complex REST API integration scripts just to look up a player's phonetic spelling.

*   **How it works:** The enterprise installs the RosterSync MCP Server. Now, their custom chatbots and AI assistants natively understand how to use RosterSync's tools (`get_athlete_phonetics`, `get_athlete_momentum`). A journalist can just type naturally: *"Give me a 10-second intro for Connor McDavid tonight,"* and the AI will pull the live data seamlessly to write the script.
*   **The benefit:** This turns RosterSync from a developer tool into a plug-and-play knowledge base for any AI agent on the market.

---

## 4. OpenAI & Codex Assistants (ChatGPT, GitHub Copilot)
**Method:** They BIND to us via **OpenAPI Actions**

For clients who prefer the OpenAI ecosystem, RosterSync provides an "OpenAI Translator" bridge.

*   **How it works:** We provide a standard OpenAPI (Swagger) JSON specification. The client pastes this URL into their **Custom GPT** or **OpenAI Assistant** "Actions" configuration.
*   **The benefit:** This allows ChatGPT and Codex-based tools to call our `get_athlete_phonetics` and `get_athlete_momentum` tools as if they were native REST functions. It ensures 100% coverage across all major AI platforms.

---

## 5. Broadcaster GUI (RosterSync Hub)
**Method:** Human-Interfaced Dashboard via **Web Application**

The "RosterSync Hub" is the high-fidelity interface where human broadcasters interact with the data.

*   **How it works:** The web app queries the same Supabase backend used by the API and Agents. It leverages the **team colors and logos already stored in the `teams` table** to dynamically theme the interface per matchup.
*   **The Spotter Board:** This specialized view uses the stored brand assets to create a color-coded, "glanceable" map of the rosters. It also embeds the MCP Assistant directly in the sidebar, giving the broadcaster a real-time AI research partner in the booth.
*   **Historical Access:** Because the app is built on the core API, it natively supports searching through 25 years of historical rosters and biographical data.

---

## 6. Data Safety & Disaster Recovery
**Method:** Off-Platform Redundancy via **Backblaze B2**

RosterSync treats sports history as a digital asset that must be preserved indefinitely.

*   **Nightly Exports:** Every 24 hours, an automated pipeline exports the entire PostgreSQL database and the Cloudflare KV cache.
*   **Cold Storage:** These archives are compressed and uploaded to **Backblaze B2**, an independent cloud storage provider.
*   **The "3-2-1" Rule:** Your data lives in three places (Supabase, Cloudflare, and Backblaze), on two different storage types, with one copy being off-platform. This ensures that even in a catastrophic platform failure, your historical rosters are recoverable in minutes.
