/**
 * Leagues whose seasons span two calendar years (e.g. 2025-26).
 * The stored `season_year` integer represents the *end* year.
 */
const CROSS_YEAR_LEAGUES = new Set([
  // Soccer / Football
  'bundesliga',
  'premier-league',
  'la-liga',
  'serie-a',
  'ligue-1',
  'champions-league',
  'europa-league',
  'liga-mx',
  'eredivisie',
  'primeira-liga',
  // Hockey
  'nhl',
  // Basketball
  'nba',
  'ncaa-basketball',
  'ncaa-mens-basketball',
  'ncaa-womens-basketball',
])

/**
 * Returns a human-readable season label for a given end year and league.
 *
 * Cross-year leagues → "2025-26" (for year = 2026)
 * Single-year leagues → "2026" (for year = 2026)
 *
 * @param year       The season end year stored in the database.
 * @param leagueId   The league identifier (e.g. "bundesliga", "mlb").
 */
export function formatSeasonLabel(year: number, leagueId?: string | null): string {
  if (leagueId && CROSS_YEAR_LEAGUES.has(leagueId.toLowerCase())) {
    const startYear = year - 1
    const endYearShort = year.toString().slice(-2)
    return `${startYear}-${endYearShort}`
  }
  return year.toString()
}

/**
 * Returns true if the given league uses cross-year season notation.
 */
export function isCrossYearLeague(leagueId?: string | null): boolean {
  return !!leagueId && CROSS_YEAR_LEAGUES.has(leagueId.toLowerCase())
}
