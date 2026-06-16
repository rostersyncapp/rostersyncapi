# Plan: Internal User Pages

Authenticated dashboard for RosterSync staff and B2B customers, with roster browsing and activity monitoring.

---

## Phase 1a: Auth Foundation

- [x] 1. `npm install @supabase/ssr`
- [x] 2. Create `utils/supabase/client.ts` — `createBrowserClient` factory
- [x] 3. Create `utils/supabase/server.ts` — `createServerClient` factory (cookie-based)
- [x] 4. Create `utils/supabase/middleware.ts` — middleware session refresh helper
- [x] 5. Create `middleware.ts` — session check on `/dashboard/*` → redirect to `/login`
- [x] 6. Create `app/login/page.tsx` — email/password + Google OAuth, dark HUD UI
- [x] 7. Create `app/signup/page.tsx` — registration (name, email, password, org name)
- [x] 8. Create `app/auth/callback/route.ts` — OAuth & email confirmation handler
- [x] 9. Create `app/auth/actions.ts` — `signIn`, `signUp`, `signOut`, `signInWithGoogle`

## Phase 1b: Dashboard Shell

- [x] 10. Create `app/dashboard/layout.tsx` + `DashboardSidebar.tsx` — sidebar nav (Rosters, Activity, Settings, + Admin if `is_admin`), user menu, sign-out
- [x] 11. Create `app/dashboard/page.tsx` — stats overview (teams, leagues, activities) + recent activity feed from `activity_logs`
- [ ] ~~Activity page~~ (built as `/dashboard/activity`)
- [ ] ~~Settings page~~ (built as `/dashboard/settings`)

## Phase 1c: Roster Browser

- [x] 12. Create `app/dashboard/rosters/actions.ts` — server actions: `getLeagues()`, `getTeams()`, `getRosterWithEnrichment()`
- [x] 13. Create `app/dashboard/rosters/page.tsx` — league filter tabs → team grid with brand colors
- [x] 14. Create `app/dashboard/rosters/[teamId]/page.tsx` + `RosterPlayerTable.tsx` — player table (jersey, name, position, phonetic, Chinese) + search/filter/sort

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Auth provider | Supabase Auth + `@supabase/ssr` |
| User model | `profiles` table (exists: `id`, `full_name`, `organization_name`, `subscription_tier`, `is_admin`) |
| Role system | `is_admin` boolean — staff (admin) vs customer (member) |
| DB migrations | None needed — reuse existing `teams`, `leagues`, `reference_rosters`, `global_player_enrichment`, `activity_logs` |
| League scope | All 17 leagues |
| Branding audit | Stays at `/internal/branding-audit` (no auth) |
| Theme | Dark HUD: `#0F1117` bg, `#1A1D27` cards, `#10B981` accent |
| Route prefix | `/dashboard` — protected by middleware |

## Files Created

| File | Purpose |
|------|---------|
| `utils/supabase/client.ts` | Browser-side Supabase client |
| `utils/supabase/server.ts` | Server-side Supabase client (cookie-based) |
| `utils/supabase/middleware.ts` | Middleware Supabase client helper |
| `middleware.ts` | Auth middleware protecting `/dashboard/*` |
| `.env` | Added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` |
| `app/login/page.tsx` | Login page (email/password + Google OAuth) |
| `app/signup/page.tsx` | Signup page (name, email, password, org) |
| `app/auth/callback/route.ts` | OAuth callback handler |
| `app/auth/actions.ts` | Auth server actions (signIn, signUp, signOut, signInWithGoogle) |
| `app/dashboard/layout.tsx` | Dashboard layout with auth guard |
| `app/dashboard/DashboardSidebar.tsx` | Client-side sidebar component |
| `app/dashboard/page.tsx` | Dashboard overview with stats + activity |
| `app/dashboard/rosters/actions.ts` | Roster server actions |
| `app/dashboard/rosters/page.tsx` | Team browser with league filter |
| `app/dashboard/rosters/[teamId]/page.tsx` | Roster detail page |
| `app/dashboard/rosters/[teamId]/RosterPlayerTable.tsx` | Player table with client-side search/sort |
| `app/dashboard/activity/page.tsx` | Activity log page |
| `app/dashboard/settings/page.tsx` | Settings page |
