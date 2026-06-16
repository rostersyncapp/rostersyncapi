# RosterSync Broadcast Integration Guide

> [!WARNING]
> **ARCHIVED**: This document has been archived as part of the DAM-Only pivot. The direct graphics dynamic integration endpoints are deferred to Phase 3 of the product roadmap.
> 
> *For the active MVP plan, see [DAM-Only Pivot: Implementation Plan](file:///Users/rymacmini/dev/rostersyncapi/docs/dam-only_implementation.md).*

This guide provides step-by-step instructions for connecting live broadcast graphics systems (**Ross XPression**, **Vizrt**, and **Chyron PRIME**) to the RosterSync Dynamic Export API.

---

## 📊 Quick Reference Specs

| Graphics Platform | Target Format | Data Type | MIME Content-Type | API Endpoint Parameter |
| :--- | :--- | :--- | :--- | :--- |
| **Ross XPression** | Ross | `JSON` | `application/json` | `?format=ross&type=json` |
| **Vizrt Engines** | Vizrt | `XML` | `application/xml` | `?format=vizrt&type=xml` |
| **Chyron PRIME** | Chyron | `CSV` | `text/csv` | `?format=chyron&type=csv` |

---

## 🔑 1. Preparation & Authentication

All API requests to the gateway must be authenticated. Before configuring your graphics controller, obtain an API key from the RosterSync Hub organization settings.

### Gateway Endpoint Structure
`https://api.rostersync.com/v1/teams/{teamIdentifier}/export`

### Authentication Methods
1. **HTTP Headers (Recommended)**:
   ```http
   Authorization: Bearer rs_your_api_key_here
   ```
2. **Query String Fallback (For legacy engines that do not support custom headers)**:
   ```
   https://api.rostersync.com/v1/teams/{teamIdentifier}/export?format={format}&type={type}&key=rs_your_api_key_here
   ```

> [!WARNING]
> Passing the API key via query parameters (`?key=rs_...`) exposes your token in proxy logs and browser histories. Only use this fallback if your graphics engine lacks custom header support.

---

## 📽️ 2. Ross XPression (via DataLinq Server)

Ross XPression uses the **DataLinq Server** middleware to parse external JSON or XML feeds and bind them to scene templates.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ XPression Scene │ ◄───  │ DataLinq Server │ ◄───  │ RosterSync API  │
│  (Text/Shaders) │       │   (HTTP JSON)   │       │   (Cloudflare)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Step-by-Step Configuration:
1. Open the **DataLinq Server Manager** application on your CG workstation or server.
2. Click **Add New** to create a new source.
3. Select **JSON Data Source** from the list.
4. Name the source (e.g., `RosterSync_EDM`).
5. Set the **Connection Type** to **HTTP Reader**.
6. Set the **URL**:
   ```
   https://api.rostersync.com/v1/teams/EDM/export?format=ross&type=json&season=2026
   ```
7. Click **HTTP Headers** -> **Add New**:
   - **Name**: `Authorization`
   - **Value**: `Bearer <YOUR_API_KEY>`
8. Set the **Update Interval**:
   - Set to `10000` (10 seconds) to receive live roster status modifications.
9. Click **OK** to save and verify the green status indicator in the Datalinq list.
10. Link graphic properties inside **XPression Layout**:
    - **Player Name**: `players[index].first_name` and `players[index].last_name`
    - **Pronunciation**: `players[index].phonetic_name`
    - **Logo Texture**: Link a dynamic texture object to `team.logo_url`
    - **Branding Color**: Bind the color property of a quad or text material to `team.primary_color`.

### Sample Payload Response (`format=ross&type=json`)
```json
{
  "team": {
    "name": "Edmonton Oilers",
    "abbreviation": "EDM",
    "logo_url": "https://example.com/logo.png",
    "primary_color": "#FF4C00",
    "secondary_color": "#002F6C"
  },
  "players": [
    {
      "id": "player-1",
      "jersey": "97",
      "first_name": "Connor",
      "last_name": "McDavid",
      "position": "C",
      "phonetic_name": "CON-or mik-DAY-vid",
      "ipa_name": "/ˈkɒnər məkˈdeɪvɪd/",
      "chinese_name": "麦克戴维",
      "hardware_safe_name": "Connor McDavid"
    }
  ]
}
```

---

## 📺 3. Vizrt (via Viz Ticker or scene DataPool)

Vizrt supports real-time scene rendering via the **DataPool** plugin suite or carousel feeds via **Viz Ticker**.

### Option A: Viz DataPool (Scene-Level Binding)
1. In **Viz Artist**, add a **DPTable** or **DPText** plugin to your graphic container.
2. Set the data URI source to:
   ```
   https://api.rostersync.com/v1/teams/EDM/export?format=vizrt&type=xml&season=2026
   ```
3. Set the custom HTTP header block:
   ```
   Authorization: Bearer <YOUR_API_KEY>
   ```
4. Define the node traversal paths:
   - Team Name: `tickerfeed/team/name`
   - Primary Accent: `tickerfeed/team/primary_color` (automatically maps hex values like `#FF4C00` to the Viz material color).
   - Player List: Bind `tickerfeed/players/player` to a table grid. Map child elements like `jersey`, `first_name`, `last_name`, and `phonetic_name`.

### Option B: Viz Ticker (Continuous Scroll Carousel)
1. Open the **Viz Ticker Controller**.
2. Create a new Ticker Feed template.
3. Configure the feed URL to target:
   ```
   https://api.rostersync.com/v1/teams/EDM/export?format=vizrt&type=xml
   ```
4. Map the XML structure:
   - Carousel Text: `[jersey] [first_name] [last_name] ([phonetic_name])`
   - Filter out inactive players by checking the XML attribute `is_active="true"`.

### Sample Payload Response (`format=vizrt&type=xml`)
```xml
<tickerfeed version="2.4">
  <team>
    <name>Edmonton Oilers</name>
    <abbreviation>EDM</abbreviation>
    <logo_url>https://example.com/logo.png</logo_url>
    <primary_color>#FF4C00</primary_color>
    <secondary_color>#002F6C</secondary_color>
  </team>
  <players>
    <player is_active="true">
      <id>player-1</id>
      <jersey>97</jersey>
      <first_name>Connor</first_name>
      <last_name>McDavid</last_name>
      <position>C</position>
      <field name="phonetic_name">CON-or mik-DAY-vid</field>
      <field name="ipa_name">/ˈkɒnər məkˈdeɪvɪd/</field>
      <field name="chinese_name">麦克戴维</field>
      <field name="hardware_safe_name">Connor McDavid</field>
    </player>
  </players>
</tickerfeed>
```

---

## 📊 4. Chyron PRIME

Chyron PRIME offers both offline imports (via CSV) and live dynamic REST links.

### Option A: Dynamic REST Binding
1. Open **Chyron PRIME**.
2. Go to the **Data Sources** panel and click the **+ (Add)** button.
3. Select **Web Request** -> **JSON** (or **XML**).
4. Name the source (e.g., `Chyron_RosterSync`).
5. Enter the **Request URL**:
   ```
   https://api.rostersync.com/v1/teams/EDM/export?format=ross&type=json&season=2026
   ```
6. Add the authentication header:
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer <YOUR_API_KEY>`
7. Map the columns in the parser table and drag them onto your lower-third or full-frame roster scene fields.

### Option B: Offline Import (Air-Gapped Production Trucks)
For live production trucks operating without public internet access:
1. Log into the **RosterSync Hub Dashboard** prior to showtime.
2. Select your matchup and click the **Download Roster** button.
3. Choose **Chyron** format and **CSV** type.
4. Save the generated file (e.g. `EDM_roster_chyron.csv`) to a USB drive or local network share.
5. In **Chyron PRIME**, add an **Excel/CSV Data Source** and point it to the local file.

### Sample Payload Response (`format=chyron&type=csv`)
```csv
team_id,team_name,team_abbreviation,team_logo_url,team_primary_color,team_secondary_color,player_id,jersey_number,first_name,last_name,position,phonetic_name,ipa_name,chinese_name,hardware_safe_name,is_active
team-123,Edmonton Oilers,EDM,https://example.com/logo.png,#FF4C00,#002F6C,player-1,97,Connor,McDavid,C,CON-or mik-DAY-vid,/ˈkɒnər məkˈdeɪvɪd/,麦克戴维,Connor McDavid,true
```

---

## 🛠️ 5. Troubleshooting & Integration Notes

### 🔒 SSL/TLS Handshake Failures
Legacy broadcast engines running on older operating systems (e.g., Windows 7 or Windows 10 LTSC without updated root certificates) may fail to negotiate TLS 1.3 handshakes.
- **Fix**: Verify your operating system has the latest root certificate updates installed, or run a local proxy server (such as Nginx or a lightweight Node gateway) to offload TLS decryption.

### ⏳ Rate Limiting & Response Caching
- **Free Tier**: 10 requests per minute (RPM).
- **Pro/Enterprise Tiers**: 100+ RPM.
- **Best Practice**: Set polling intervals on XPression DataLinq and Viz Ticker to no faster than `5000` (5 seconds). Exceeding the rate limit will return HTTP `429 Too Many Requests`.

### 🎨 Color Translation
Colors are output in standard `#RRGGBB` hex format. 
- **Ross XPression**: Directly accepts hex values in material and quad color parameters.
- **Chyron / Vizrt**: Some legacy scene assets require decimal RGB input. If your engine doesn't automatically convert hex values, write a script logic parser within the engine to translate hex to RGB floats.
