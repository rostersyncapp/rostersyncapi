## 1. Design Vision & Philosophy
RosterSync is a **high-precision tool** for professional sports broadcasters. The design follows the "Dark Intelligence" aesthetic established in the primary landing page mockup (`landing-page.png`).

### 1.1 The "Dark Intelligence" Aesthetic
- **Primary Surface:** `#0F1117` (Void Black).
- **Secondary Surface:** `#161B22` (Surface Navy).
- **Accents:** `#10B981` (Signal Emerald). This is our signature brand color, used for success states, code syntax, and the "Intelligence" layer.

### 1.2 Geometry & Structure
- **Global Radius:** Use a refined **4px-6px radius** for the entire platform (Landing Page, Dashboard, and Spotter Board) to maintain the premium, high-end SaaS feel established in `landing-page.png`.
- **Borders:** `1px` solid `#1E293B`. Use subtle background surface shifts (`#161B22`) to define sections rather than heavy lines.
- **Grid:** 8px baseline grid system.

---

## 2. Visual Identity System

### 2.1 Color Palette (Hex)
| Usage | Color | Hex Code |
| :--- | :--- | :--- |
| **Background** | Void Black | `#0F1117` |
| **Containers** | Surface Navy | `#161B22` |
| **Borders** | Slate Stroke | `#1E293B` |
| **Primary Accent** | Signal Emerald | `#10B981` |
| **Status (Code)** | Code Blue | `#3B82F6` |
| **Data (Neutral)** | Off-White | `#F8FAFC` |

### 2.2 Typography (Google Fonts: Inter)
- **Headlines:** `Inter Bold / 900`. Tight tracking (`-0.05em`). Uppercase for main titles.
- **Data Labels:** `Inter Semi-Bold`. High-contrast.
- **Phonetics:** `Inter Regular / 400`. Always in **Signal Emerald** for glanceability.
- **Body:** `Inter Regular`. Minimal use.

---

## 3. Core Component Specifications

### 3.1 The "Spotter Board" (Primary Tool)
The "Killer App" for play-by-play announcers.
- **Layout:** Horizontal Row List (Two columns: Home vs. Away).
- **The "Jersey Anchor":** Each row starts with a `48px x 48px` solid color block matching the team’s primary branding (e.g., Oilers Orange). The jersey number is centered in large white bold.
- **Stacked Phonetics:** The phonetic guide is positioned vertically under the player's name.
    - *Example:* 
      **CONNOR MCDAVID**
      `kahn-uhr muhk-DAY-vid` (Emerald)
- **Responsive Behavior:** 
    - **Desktop:** Two-column grid.
    - **iPad (Booth Mode):** Two-column grid (Touch-optimized heights: `80px` minimum row height). 
    - **Booth Mode Specifics:** Pure black background (#000000), stacked two-line phonetics, and 44x44px minimum touch targets.
    - **Mobile:** Single-column vertical stack.

### 3.2 The Intelligence Sidebar (MCP Hub)
- **Style:** Collapsible HUD panel.
- **Behavior:** Houses the AI Assistant. Use a "terminal-style" font (`JetBrains Mono`) for the AI's research pulse outputs to differentiate from core roster data.

---

## 4. Motion & Interactivity
- **State Changes:** **Snap, don't Fade.** Use high-speed spring transitions (e.g., `stiffness: 400, damping: 30`).
- **HUD Reveal:** On-load, elements should "shutter" in or stagger vertically in <200ms.
- **Active Feedback:** Hovering over a player row should trigger a `1px` Emerald glow, signifying the row is "Live."

---

## 5. Security & Authentication
RosterSync uses a **Unified Security Stack** to protect sensitive broadcaster metadata and DAM credentials.

### 5.1 Identity Provider
- **Provider:** Supabase Auth.
- **Methods:** Email/Password + Magic Link + Social (Google/Apple).
- **Multi-Factor Authentication (MFA):** Mandatory for all users accessing the "Integrations" or "API Keys" sections.

### 5.2 Data Isolation (B2B Multi-tenancy)
- **Engine:** PostgreSQL Row Level Security (RLS).
- **Policy:** Every table (athletes, teams, credentials, jobs) must be scoped to an `organization_id`. Users can only access data belonging to their verified organization.
- **Credential Storage:** DAM API keys (Iconik/CatDV) are stored in a dedicated `credentials` table, protected by strict RLS and encrypted at rest within the Supabase vault.

### 5.3 API Security & Gateway
- **Gateway:** Cloudflare Workers (Hono framework).
- **Authentication:** Header-based `Authorization: Bearer <rs_key>`.
- **Validation Flow:** 
    1. Cloudflare Worker retrieves key status from **Cloudflare KV**.
    2. If key is missing or revoked, the Worker rejects the request at the edge (<10ms).
    3. Valid requests are proxied to Supabase with an internal "Origin Secret" for authenticated data retrieval.
- **Rate Limiting:** Enforced at the Cloudflare Edge to protect against resource abuse before the request reaches the database.

### 5.4 Payments & Subscription Management
- **Provider:** Stripe.
- **Integration:** Stripe Checkout + Stripe Customer Portal for B2B billing management.
- **Provisioning:** Automated via **Stripe Webhooks** hitting a Supabase Edge Function. On successful payment, the Edge Function updates the `subscriptions` and `organization_tier` tables.
- **Entitlements:** Access to premium agents (Momentum, Linguist) and DAM connectors is conditionally granted based on the active Stripe subscription status.

---

## 6. Technical Requirements for Implementation
- **Framework:** Next.js 15 (App Router) for Dashboard.
- **API Runtime:** Cloudflare Workers (Hono) for Public API.
- **Auth Library:** `@supabase/ssr`.
- **Styling:** Tailwind CSS v4 (CSS-first configuration).
- **Database:** Supabase (Auth + PostgreSQL).
- **Edge Storage:** Cloudflare KV (for API keys and Roster Snapshots).
- **Validation:** Zod (shared schemas between Dashboard and Edge).
- **Assets:** Team logos and hex codes must be dynamically mapped from the `teams` table in Supabase.
- **Print:** A dedicated `@media print` CSS block must generate a high-res PDF version of the Spotter Board.

---

## 7. Edge Infrastructure Strategy (The Split-Auth)
To maintain 99.9% profit margins and sub-100ms global latency, RosterSync uses a decoupled Auth strategy.

- **Identity of Record:** Supabase is the single source of truth for organizations, users, and master API keys.
- **Delivery of Record:** Cloudflare is the delivery point. It holds a high-speed replica of active API keys in KV.
- **Real-time Sync:** Any change to a customer's subscription or API key in Supabase triggers a webhook to update the Cloudflare KV store in real-time.
- **Resilience:** If the Supabase origin is unreachable, the Cloudflare Edge continues to serve cached roster snapshots from KV, ensuring broadcasters never see a "blank board" during live events.

---


---

## 8. Historical Integrity & Temporal Schema
To support 25 years of sports history, RosterSync follows the **Temporal Stratigraphy** model. This ensures that data from 1999 is never overwritten or "contaminated" by modern 2026 data.

### 8.1 The Identity-Profile Split
- **Static Identity:** Core data that never changes (Athlete Name, Birth Date, Team Franchise ID).
- **Temporal Profile:** Data that is specific to a season (Jersey Number, Weight, Team Branding, Position). 
- **Rule:** Every query for roster data MUST include a `season_year` to ensure the correct temporal layer is retrieved.

### 8.2 Historical Branding
- Team branding (colors, logos) must be stored in a **Temporal Branding** table. 
- When rendering the Spotter Board for a historical season (e.g., 2005), the UI must pull the branding artifacts that were valid for that specific year, preventing "Branding Anachronisms."

---

### 9. Accessibility & Visibility
- **Contrast Logic:** All branding-driven UI must calculate text contrast dynamically using the YIQ luminance formula to ensure accessibility against team colors. 
- **Dynamic Branding:** All components must use the `services/branding-utils.ts` utility to normalize team branding data, ensuring safe fallbacks for missing colors or logos.
- **Semantic Mapping:** "Primary" and "Secondary" team colors are mapped to UI design tokens:
    - Primary: `bg-brand-primary`, `text-brand-primary`
    - Secondary: `bg-brand-secondary`, `text-brand-secondary`
    - Contrast: `text-brand-contrast` (calculated at runtime)

