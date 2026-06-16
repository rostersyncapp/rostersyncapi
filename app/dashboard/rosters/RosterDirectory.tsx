'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import TeamLogo from './TeamLogo'

interface Team {
  id: string
  name: string
  display_name: string | null
  abbreviation: string | null
  logo_url: string | null
  league: string
  primary_color: string | null
  secondary_color: string | null
}

interface League {
  id: string
  name: string
}

export default function RosterDirectory({
  teams,
  leagues
}: {
  teams: Team[]
  leagues: League[]
}) {
  const [search, setSearch] = useState('')
  const [activeLeague, setActiveLeague] = useState<string>('ALL')

  // Categorize leagues for quick filtering
  const collegeLeagues = ['ncaa', 'ncaa-mens-basketball', 'ncaa-womens-basketball']

  // Format league name for clean sidebar list display
  const formatLeagueName = (league: League) => {
    const overrides: Record<string, string> = {
      'nba': 'NBA',
      'wnba': 'WNBA',
      'nfl': 'NFL',
      'mlb': 'MLB',
      'milb': 'MiLB',
      'nhl': 'NHL',
      'mls': 'MLS',
      'nwsl': 'NWSL',
      'usl': 'USL',
      'ncaa': 'NCAA Football',
      'ncaa-mens-basketball': "NCAA Men's Basketball",
      'ncaa-womens-basketball': "NCAA Women's Basketball",
      'premier-league': 'Premier League',
      'eredivisie': 'Eredivisie',
      'fifaworldcupm': "FIFA Men's World Cup",
      'fifaworldcupf': "FIFA Women's World Cup",
    }
    return overrides[league.id] || league.name
  }
  
  const leagueMap = useMemo(() => {
    const map = new Map<string, string>()
    leagues.forEach(l => map.set(l.id, l.name))
    return map
  }, [leagues])

  const filteredTeams = useMemo(() => {
    let result = [...teams]

    if (activeLeague !== 'ALL') {
      if (activeLeague === 'COLLEGE') {
        result = result.filter(t => collegeLeagues.includes(t.league.toLowerCase()))
      } else if (activeLeague === 'PROFESSIONAL') {
        result = result.filter(t => !collegeLeagues.includes(t.league.toLowerCase()))
      } else {
        result = result.filter(t => t.league === activeLeague)
      }
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        t =>
          (t.display_name || '').toLowerCase().includes(q) ||
          (t.name || '').toLowerCase().includes(q) ||
          (t.abbreviation || '').toLowerCase().includes(q) ||
          (t.league || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [teams, search, activeLeague])

  // Group filtered teams by league for structured rendering
  const groupedTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {}
    
    filteredTeams.forEach(team => {
      const leagueName = leagueMap.get(team.league) || team.league.toUpperCase()
      if (!groups[leagueName]) {
        groups[leagueName] = []
      }
      groups[leagueName].push(team)
    })

    // Sort group keys alphabetically
    return Object.keys(groups)
      .sort()
      .reduce((obj, key) => {
        obj[key] = groups[key]
        return obj
      }, {} as Record<string, Team[]>)
  }, [filteredTeams, leagueMap])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Sticky Left Column: Controls & Filters */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary uppercase tracking-wider mb-2">// Team Index</h1>
          <p className="text-xs font-mono text-text-secondary">
            Search or filter across active professional and collegiate rosters.
          </p>
        </div>

        {/* Live Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase text-text-muted">Search Teams</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type team name or code..."
            className="w-full bg-bg-primary border border-border-custom text-xs text-text-primary px-3 py-2 font-mono focus:outline-none focus:border-accent rounded-md"
          />
        </div>

        {/* Categories / Scope filters */}
        <div className="space-y-4 border-t border-border-custom pt-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-text-muted block mb-2">Filters</span>
            <div className="flex flex-col gap-1">
              {[
                { id: 'ALL', label: 'All Leagues' },
                { id: 'PROFESSIONAL', label: 'Professional Sports' },
                { id: 'COLLEGE', label: 'College Athletics' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveLeague(cat.id)}
                  className={`px-3 py-2 text-left text-xs font-mono border rounded-md transition-all ${
                    activeLeague === cat.id
                      ? 'bg-text-primary text-bg-primary border-text-primary font-bold'
                      : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase text-text-muted block mb-2">Specific League</span>
            <div className="grid grid-cols-2 gap-1 border border-border-custom/40 p-2 bg-bg-primary/20">
              {leagues.map(league => (
                <button
                  key={league.id}
                  onClick={() => setActiveLeague(league.id)}
                  title={formatLeagueName(league)}
                  className={`px-2 py-1.5 text-left text-[9px] font-mono truncate border rounded-sm transition-all ${
                    activeLeague === league.id
                      ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                      : 'bg-transparent text-text-secondary border-transparent hover:border-border-custom hover:text-text-primary'
                  }`}
                >
                  {formatLeagueName(league)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-text-muted border-t border-border-custom pt-4">
          Showing {filteredTeams.length} of {teams.length} teams
        </div>
      </div>

      {/* Right Column: Grouped Teams Listing */}
      <div className="lg:col-span-8 space-y-8">
        {filteredTeams.length > 0 ? (
          Object.entries(groupedTeams).map(([leagueName, leagueTeams]) => (
            <div key={leagueName} className="space-y-3">
              <h2 className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest border-b border-border-custom pb-2">
                {leagueName} ({leagueTeams.length})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {leagueTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/dashboard/rosters/${team.id}`}
                    className="bg-bg-surface/30 border border-border-custom/70 p-3.5 hover:border-accent transition-all group flex items-center justify-between rounded-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamLogo
                        src={team.logo_url}
                        abbreviation={team.abbreviation || ''}
                        name={team.name}
                        primaryColor={team.primary_color}
                        secondaryColor={team.secondary_color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-text-primary truncate group-hover:text-accent font-bold transition-colors">
                          {team.display_name ?? team.name}
                        </p>
                        <p className="text-[9px] font-mono text-text-muted uppercase">
                          {team.abbreviation || 'N/A'} &bull; {team.league}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted group-hover:text-text-primary transition-colors pl-2 shrink-0">
                      View &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-bg-surface border border-border-custom p-12 text-center rounded-md">
            <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">
              No matching teams found
            </p>
            <p className="text-[11px] font-mono text-text-muted mt-1">
              Try adjusting your search query or selecting "All Leagues".
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
