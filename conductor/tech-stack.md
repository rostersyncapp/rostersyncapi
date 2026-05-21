# Technology Stack: RosterSync API

## 1. Core Technologies

*   **Programming Language:** TypeScript
*   **Backend Frameworks:** Hono (for Cloudflare Workers), Supabase (PostgREST for API)
*   **Database:** PostgreSQL (managed by Supabase)
*   **AI/Machine Learning:** Google Gemini Flash (accessed via `@google/generative-ai`)
*   **Cloud/Edge Platform:** Cloudflare Workers

## 2. Architectural Pattern

The project utilizes a modular architecture, likely a modular monolith or microservices pattern, where:

*   **Cloudflare Workers** act as an API gateway, handling authentication, rate limiting, and request routing at the edge. This provides low-latency responses and distributes traffic efficiently.
*   **Supabase** serves as the primary backend-as-a-service, providing a managed PostgreSQL database and exposing its capabilities via PostgREST for direct API consumption by the gateway.
*   **Custom TypeScript Services** (located in the `services/` directory) interact directly with Supabase for more complex operations such as managing site configuration, tracking usage, logging activities, and caching branding information. These services are likely consumed by other parts of the system (e.g., administrative tools, internal processes, or other Edge Functions).

## 3. Libraries and Tools

*   `@supabase/supabase-js`: JavaScript client library for interacting with Supabase.
*   `@google/generative-ai`: Client library for accessing Google's Gemini Flash model.
*   `hono`: A small, simple, and fast web framework for the edge, used within Cloudflare Workers.
*   `tsx`: A TypeScript execution environment for Node.js, likely used for local development or scripting.
*   `npm`: Package manager for project dependencies.

## 4. Environment and Deployment

*   **Runtime Environment:** Node.js (for local development and custom services), Deno (potentially for Supabase Edge Functions, if used beyond the Hono gateway), Cloudflare Workers (for edge logic).
*   **Deployment Platforms:** Cloudflare (for Workers), Supabase (for PostgreSQL database and potentially other backend services).
*   **Source Control:** Git (inferred from `.gitignore`, although `.git` directory was not found in the initial check).

## 5. Justification for Stack Choices

*   **TypeScript:** Provides type safety, improved code quality, and better maintainability for a growing codebase.
*   **Cloudflare Workers + Hono:** Chosen for high performance, low latency, and global distribution of the API gateway, ideal for serving broadcast and sports media clients.
*   **Supabase (PostgreSQL/PostgREST):** Offers a robust, scalable, and managed backend solution with real-time capabilities and a convenient RESTful API layer. Reduces operational overhead for database management.
*   **Google Gemini Flash:** Selected for its advanced AI capabilities to provide unique athlete intelligence (phonetics, translations), a key differentiator for the product.
*   **Modular Architecture:** Allows for independent development and deployment of different service components, enhancing scalability and resilience.