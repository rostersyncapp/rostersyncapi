import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import TeamLogo from '../TeamLogo'
import RosterPlayerTable from './RosterPlayerTable'
import { formatSeasonLabel } from '@/utils/season'

export default async function TeamRosterPage({
  params,
  searchParams,
}: {
  params: { teamId: string }
  searchParams: { season?: string }
}) {
  const supabase = await createClient()
  const { teamId } = params

  let team: any = null
  let rosterData: any[] = []
  let availableSeasons: number[] = []
  let targetSeason: number = 2026

  // 1. Try to find standard team
  const teamResult = await supabase.from('teams').select('*').eq('id', teamId).maybeSingle()

  if (teamResult.data) {
    team = teamResult.data
    const [seasonsResult, latestRosterResult] = await Promise.all([
      supabase
        .from('reference_rosters')
        .select('season_year')
        .eq('team_id', teamId)
        .order('season_year', { ascending: false }),
      supabase
        .from('reference_rosters')
        .select('*')
        .eq('team_id', teamId)
        .order('season_year', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    availableSeasons = (seasonsResult.data ?? []).map((s) => s.season_year)
    targetSeason = searchParams.season
      ? parseInt(searchParams.season)
      : (latestRosterResult.data?.season_year ?? availableSeasons[0] ?? 2026)

    const rosterResult =
      targetSeason === latestRosterResult.data?.season_year
        ? latestRosterResult
        : await supabase
            .from('reference_rosters')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_year', targetSeason)
            .maybeSingle()

    rosterData = rosterResult.data?.roster_data ?? []
  } else {
    // 2. Try Men's World Cup
    const wcmResult = await supabase.from('fifaworldcupm').select('*').eq('id', teamId).maybeSingle()
    if (wcmResult.data) {
      const data = wcmResult.data
      team = {
        id: data.id,
        name: data.country_name,
        display_name: data.country_name,
        abbreviation: data.abbreviation,
        logo_url: data.logo_url,
        league: 'fifaworldcupm',
        primary_color: '#0D1B2A',
        secondary_color: '#FFFFFF'
      }
      rosterData = data.roster_data || []
      availableSeasons = [2026]
      targetSeason = 2026
    } else {
      // 3. Try Women's World Cup
      const wcfResult = await supabase.from('fifaworldcupf').select('*').eq('id', teamId).maybeSingle()
      if (wcfResult.data) {
        const data = wcfResult.data
        team = {
          id: data.id,
          name: data.country_name,
          display_name: data.country_name,
          abbreviation: data.abbreviation,
          logo_url: data.logo_url,
          league: 'fifaworldcupf',
          primary_color: '#003049',
          secondary_color: '#FFFFFF'
        }
        rosterData = data.roster_data || []
        availableSeasons = [2023]
        targetSeason = 2023
      }
    }
  }

  if (!team) {
    return (
      <div className="bg-bg-surface border border-border-custom p-6 text-center rounded-md">
        <p className="text-xs font-mono text-red-400">Team not found</p>
        <Link
          href="/dashboard/rosters"
          className="text-xs font-mono text-white hover:underline mt-2 inline-block"
        >
          ← back to rosters
        </Link>
      </div>
    )
  }

  const players = (rosterData as Array<any>).map((player: any) => ({
    id: player.id ?? '',
    fullName: player.fullName ?? player.name ?? '',
    jersey: player.jersey ?? player.jerseyNumber ?? '--',
    position: player.position ?? '',
    classOrYear: player.class ?? player.year ?? player.classOrYear ?? '',
    height: player.height ?? '',
    weight: player.weight ?? '',
  }))

  // 1. Identify which players are missing pre-computed enrichment data in the JSON
  const isWC = team.league === 'fifaworldcupm' || team.league === 'fifaworldcupf'
  const missingNames: string[] = []

  if (!isWC) {
    for (const player of players) {
      const rawPlayer = (rosterData as Array<any>).find((p) => p.id === player.id)
      const hasPrecomputed = rawPlayer?.phoneticSimplified || rawPlayer?.isEnriched
      if (!hasPrecomputed && player.fullName) {
        missingNames.push(player.fullName.trim())
      }
    }
  }

  // 2. Fetch all missing enrichments in a single batch query
  const enrichmentMap = new Map<string, any>()
  if (missingNames.length > 0) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: enrichments } = await supabaseAdmin
      .from('global_player_enrichment')
      .select('*')
      .in('player_name', missingNames)

    if (enrichments) {
      for (const e of enrichments) {
        enrichmentMap.set(e.player_name.toLowerCase(), e)
      }
    }
  }

  // 3. Map players in memory
  const enrichedPlayers = players.map((player) => {
    const rawPlayer = (rosterData as Array<any>).find((p) => p.id === player.id)
    const hasPrecomputed = rawPlayer?.phoneticSimplified || rawPlayer?.isEnriched

    const enrichment = hasPrecomputed
      ? null
      : enrichmentMap.get(player.fullName.trim().toLowerCase())

    return {
      ...player,
      phoneticSimplified: rawPlayer?.phoneticSimplified || enrichment?.phonetic_name || null,
      phoneticIPA: rawPlayer?.phoneticIPA || enrichment?.ipa_name || null,
      nameMandarin: rawPlayer?.nameMandarin || enrichment?.chinese_name || null,
      heightImperial: rawPlayer?.heightImperial || player.height || enrichment?.height_imperial || '',
      heightMetric: rawPlayer?.heightMetric || enrichment?.height_metric || '',
      weightImperial: rawPlayer?.weightImperial || player.weight || enrichment?.weight_imperial || '',
      weightMetric: rawPlayer?.weightMetric || enrichment?.weight_metric || '',
    }
  })

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-[10px] font-mono text-text-muted">
        <Link href="/dashboard/rosters" className="hover:text-text-primary transition-colors">
          Rosters
        </Link>
        <span>/</span>
        <span className="text-text-primary">{team.display_name ?? team.name}</span>
      </div>

      {/* Team header */}
      <div className="bg-bg-surface border border-border-custom p-4 mb-4 rounded-md">
        <div className="flex items-center gap-4">
          <TeamLogo
            src={team.logo_url}
            abbreviation={team.abbreviation}
            name={team.name}
            primaryColor={team.primary_color}
            secondaryColor={team.secondary_color}
            size="lg"
          />
          <div className="flex-1">
            <h1 className="text-lg font-mono font-bold text-text-primary">
              {team.display_name ?? team.name}
            </h1>
            <p className="text-xs font-mono text-text-muted">
              {team.abbreviation} · {team.league}
            </p>
          </div>
        </div>
      </div>

      {/* Season selector */}
      <div className="mb-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
          Season
        </p>
        <div className="flex flex-wrap gap-1">
          {availableSeasons.map((year) => (
            <Link
              key={year}
              href={`/dashboard/rosters/${teamId}?season=${year}`}
              className={`px-3 py-1.5 text-[11px] font-mono border rounded-md transition-all ${
                targetSeason === year
                  ? 'bg-text-primary text-bg-primary border-text-primary font-bold'
                  : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary'
              }`}
            >
              {formatSeasonLabel(year, team.league)}
            </Link>
          ))}
        </div>
      </div>

      {/* Player count */}
      <p className="text-[10px] font-mono text-text-muted mb-4">
        {players.length} players
      </p>

      {/* Player table */}
      <RosterPlayerTable 
        players={enrichedPlayers} 
        teamName={team.display_name ?? team.name} 
        season={targetSeason} 
        teamId={teamId}
        league={team.league}
      />
    </div>
  )
}
