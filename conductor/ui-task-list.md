# UI Task List

Tracks frontend / landing page UI work for RosterSync.

---

## Completed

- [x] **Replace SF 49ers with SF Giants on Spotter Board**
  - Server action queries SF Giants (2026 MLB) roster data
  - Fallback data has 12 Giants players with phonetic guides & Mandarin
  - Giants branding: black (`#000000`) / orange (`#fd5a1e`)

- [x] **Default Booth Mode to True**
  - `boothMode` state defaults to `true` on page load
  - Title bar shows "HUD-TACTICAL :: BOOTH MODE ACTIVE"

- [x] **Add Loading Spinner Safety Timer**
  - 8-second `setTimeout` fallback renders fallback data and hides spinner
  - Workaround for unresolved server action hang issue in browser

- [x] **Replace Liverpool FC with LA Dodgers on Spotter Board**
  - Server action queries LA Dodgers (2026 MLB) instead of Liverpool (2025)
  - Fallback data has 12 Dodgers players (Ohtani, Betts, Freeman, Snell, etc.)
  - Dodgers branding: blue (`#005a9c`) / white (`#ffffff`)
  - Board now shows MLB vs MLB matchup (SFG vs LAD)

- [x] **Fix `jersey` Field Mapping in Server Action**
  - Database uses `jersey` (ESPN string), not `jerseyNumber` (enriched)
  - Updated `p.jersey || '00'` fallback to read correct field

- [x] **Colorize API Explorer JSON Output**
  - Added `colorizeJson()` tokenizer for syntax-highlighted JSON
  - 3-color scheme: cyan keys, pink strings, amber numbers
  - Base terminal color changed from emerald to yellow (`text-yellow-300/90`)

- [x] **Remove `logo_url` from Mock Player Data**
  - Stripped `logo_url` from all 5 team objects in `MOCK_PLAYERS`

- [x] **Update Hero Subtitle Text**
  - Changed "Eredivisie" to "Premier League" in section subtitle

## In Progress

- (none)

## Backlog

- [ ] **Diagnose server action hang**: `getSpotterData` never completes in browser context — safety timer masks this. Root cause unknown.
- [ ] **Live player talking points**: Modal broadcast blurbs are hardcoded for 4 star players; fall back to generic text for others. Pull from database or AI enrich inline.
- [ ] **API explorer live data**: `MOCK_PLAYERS` section uses hardcoded JSON. Replace with live Supabase queries.
- [ ] **Eredivisie / expand API Explorer tabs**: Add more league tabs to the API explorer demo (Ajax, PSV, etc.) beyond the current 5.
- [ ] **Mobile responsive polish**: Spotter board player grid, modal sizing on small screens.
- [ ] **Spotter board unit tests**: Verify server action maps roster data to `SpotterTeamData` shape correctly.
