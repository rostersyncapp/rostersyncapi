'use client'

import { useState, useMemo, useEffect } from 'react'
import { syncTeamRosterToDAMAction, getActiveDAMConnections } from '../actions'
import { formatSeasonLabel } from '@/utils/season'

interface EnrichedPlayer {
  id: string
  fullName: string
  jersey: string
  position: string
  classOrYear: string | null
  heightImperial: string | null
  heightMetric: string | null
  weightImperial: string | null
  weightMetric: string | null
  phoneticSimplified: string | null
  phoneticIPA: string | null
  nameMandarin: string | null
}

// Helper functions to parse and format height and weight values
function parseHeightToCm(heightImperial: string | null, heightMetric: string | null): number {
  if (heightMetric) {
    const val = parseInt(heightMetric.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(val)) return val
  }
  if (heightImperial) {
    const cleaned = heightImperial.trim()
    const ftInMatch = cleaned.match(/(\d+)\s*['\-]\s*(\d+)/)
    if (ftInMatch) {
      const feet = parseInt(ftInMatch[1], 10)
      const inches = parseInt(ftInMatch[2], 10)
      return (feet * 12 + inches) * 2.54
    }
    const ftMatch = cleaned.match(/(\d+)\s*'/)
    if (ftMatch) {
      const feet = parseInt(ftMatch[1], 10)
      return (feet * 12) * 2.54
    }
    const inchesOnly = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(inchesOnly)) return inchesOnly * 2.54
  }
  return 0
}

function parseWeightToKg(weightImperial: string | null, weightMetric: string | null): number {
  if (weightMetric) {
    const val = parseInt(weightMetric.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(val)) return val
  }
  if (weightImperial) {
    const val = parseInt(weightImperial.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(val)) return val * 0.45359237
  }
  return 0
}

function formatHeight(heightImperial: string | null, heightMetric: string | null, unit: 'imperial' | 'metric'): string {
  if (unit === 'metric') {
    if (heightMetric && heightMetric.trim() !== '') {
      return heightMetric.includes('cm') ? heightMetric : `${heightMetric} cm`
    }
    if (!heightImperial) return ''
    
    const cleaned = heightImperial.trim()
    if (cleaned.toLowerCase().includes('cm')) return cleaned

    const ftInMatch = cleaned.match(/(\d+)\s*['\-]\s*(\d+)/)
    if (ftInMatch) {
      const feet = parseInt(ftInMatch[1], 10)
      const inches = parseInt(ftInMatch[2], 10)
      const cm = Math.round((feet * 12 + inches) * 2.54)
      return `${cm} cm`
    }

    const ftMatch = cleaned.match(/(\d+)\s*'/)
    if (ftMatch) {
      const feet = parseInt(ftMatch[1], 10)
      const cm = Math.round((feet * 12) * 2.54)
      return `${cm} cm`
    }

    const inchesOnly = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(inchesOnly) && inchesOnly > 0 && inchesOnly < 120) {
      const cm = Math.round(inchesOnly * 2.54)
      return `${cm} cm`
    }
    
    return ''
  } else {
    if (!heightImperial) return ''
    const cleaned = heightImperial.trim()
    if (cleaned.match(/^\d+$/)) {
      const inchesTotal = parseInt(cleaned, 10)
      const feet = Math.floor(inchesTotal / 12)
      const inches = inchesTotal % 12
      return `${feet}' ${inches}"`
    }
    return heightImperial
  }
}

function formatWeight(weightImperial: string | null, weightMetric: string | null, unit: 'imperial' | 'metric'): string {
  if (unit === 'metric') {
    if (weightMetric && weightMetric.trim() !== '') {
      return weightMetric.toLowerCase().includes('kg') ? weightMetric : `${weightMetric} kg`
    }
    if (!weightImperial) return ''
    
    const cleaned = weightImperial.trim()
    if (cleaned.toLowerCase().includes('kg')) return cleaned

    const lbsVal = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(lbsVal) && lbsVal > 0) {
      const kg = Math.round(lbsVal * 0.45359237)
      return `${kg} kg`
    }
    return ''
  } else {
    if (!weightImperial) return ''
    const cleaned = weightImperial.trim()
    if (cleaned.toLowerCase().includes('lbs')) return cleaned
    const lbsVal = parseInt(cleaned.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(lbsVal) && lbsVal > 0) {
      return `${lbsVal} lbs`
    }
    return weightImperial
  }
}

export default function RosterPlayerTable({
  players,
  teamName,
  season,
  teamId,
  league,
}: {
  players: EnrichedPlayer[]
  teamName: string
  season: number
  teamId: string
  league?: string
}) {
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [sortField, setSortField] = useState<keyof EnrichedPlayer>('jersey')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'failed'>('idle')
  const [syncMessage, setSyncMessage] = useState('')

  const [connections, setConnections] = useState<Array<{ id: string; name: string; provider: string }>>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    getActiveDAMConnections().then(setConnections).catch(console.error)
  }, [])

  const handleSyncToDAM = async (targetId?: string) => {
    setSyncing(true)
    setSyncStatus('idle')
    setSyncMessage('')
    setDropdownOpen(false)
    try {
      const targetName = targetId 
        ? connections.find(c => c.id === targetId)?.name || 'Target DAM'
        : 'All Active DAMs'
      await syncTeamRosterToDAMAction(teamId, season, targetId)
      setSyncStatus('success')
      setSyncMessage(`Successfully enqueued sync to ${targetName}!`)
    } catch (err: any) {
      console.error(err)
      setSyncStatus('failed')
      setSyncMessage(err.message || 'Sync trigger failed.')
    } finally {
      setSavingTimeout()
    }
  }

  const setSavingTimeout = () => {
    setTimeout(() => {
      setSyncing(false)
    }, 1500)
  }
  
  // Local state for preferred measurement units (defaults to imperial)
  const [unitsPref, setUnitsPref] = useState<'imperial' | 'metric'>('imperial')

  useEffect(() => {
    const saved = localStorage.getItem('rostersync_units_pref')
    if (saved === 'metric' || saved === 'imperial') {
      setUnitsPref(saved)
    }

    const handleStorageChange = () => {
      const updated = localStorage.getItem('rostersync_units_pref')
      if (updated === 'metric' || updated === 'imperial') {
        setUnitsPref(updated)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const positions = useMemo(() => {
    const set = new Set(players.map((p) => p.position))
    return Array.from(set).sort()
  }, [players])

  const filtered = useMemo(() => {
    let result = [...players]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.jersey.includes(q) ||
          p.position.toLowerCase().includes(q)
      )
    }

    if (positionFilter) {
      result = result.filter((p) => p.position === positionFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'jersey') {
        const jerseyA = parseInt(a.jersey) || 0
        const jerseyB = parseInt(b.jersey) || 0
        cmp = jerseyA - jerseyB
      } else if (sortField === 'heightImperial' || sortField === 'heightMetric') {
        const valA = parseHeightToCm(a.heightImperial, a.heightMetric)
        const valB = parseHeightToCm(b.heightImperial, b.heightMetric)
        cmp = valA - valB
      } else if (sortField === 'weightImperial' || sortField === 'weightMetric') {
        const valA = parseWeightToKg(a.weightImperial, a.weightMetric)
        const valB = parseWeightToKg(b.weightImperial, b.weightMetric)
        cmp = valA - valB
      } else {
        cmp = String(a[sortField] || '').localeCompare(String(b[sortField] || ''))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [players, search, positionFilter, sortField, sortDir])

  function toggleSort(field: keyof EnrichedPlayer) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortIndicator = (field: keyof EnrichedPlayer) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const handleDownloadCSV = () => {
    const headers = ['Player Name', 'Number', 'Position', 'Class/Year', 'Height', 'Weight', 'Phonetic Spelling', 'IPA', 'Mandarin'];
    const rows = filtered.map(p => [
      p.fullName,
      p.jersey,
      p.position,
      p.classOrYear || '',
      formatHeight(p.heightImperial, p.heightMetric, unitsPref),
      formatWeight(p.weightImperial, p.weightMetric, unitsPref),
      p.phoneticSimplified || '',
      p.phoneticIPA || '',
      p.nameMandarin || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${teamName.replace(/\s+/g, '_')}_roster_${formatSeasonLabel(season, league)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Filters & CSV export button */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search players..."
          className="bg-bg-primary border border-border-custom rounded-md px-3 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors w-48"
        />
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="bg-bg-primary border border-border-custom rounded-md px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          <option value="">all positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
        
        <button
          onClick={handleDownloadCSV}
          className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-3.5 py-1.5 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          Download CSV
        </button>

        {connections.length > 0 ? (
          <div className="relative inline-flex items-stretch select-none">
            {/* Main Action Button */}
            <button
              onClick={() => handleSyncToDAM()}
              disabled={syncing}
              className={`text-xs px-3.5 py-1.5 font-mono font-bold uppercase tracking-wider border-y border-l transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer rounded-l-[2px] ${
                syncStatus === 'success'
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/30'
                  : syncStatus === 'failed'
                  ? 'bg-amber-950/20 text-amber-400 border-amber-800/80 hover:bg-amber-950/30'
                  : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary'
              }`}
            >
              {syncing ? 'Syncing...' : 'Sync to DAM'}
            </button>

            {/* Dropdown Chevron Button */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={syncing}
              className={`px-2 py-1.5 border transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer rounded-r-[2px] flex items-center justify-center ${
                syncStatus === 'success'
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/30'
                  : syncStatus === 'failed'
                  ? 'bg-amber-950/20 text-amber-400 border-amber-800/80 hover:bg-amber-950/30'
                  : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary border-l-transparent'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                {/* Click outside backdrop */}
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-bg-surface border border-border-custom shadow-xl z-40 rounded-[2px] overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[8px] font-mono uppercase text-text-muted border-b border-border-custom/50 tracking-wider">
                    Select Sync Destination
                  </div>
                  
                  {/* Option to sync to all */}
                  <button
                    onClick={() => handleSyncToDAM()}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase text-text-primary hover:bg-bg-primary transition-colors cursor-pointer"
                  >
                    🚀 ALL ACTIVE INTEGRATIONS
                  </button>

                  {/* Individual active connections */}
                  {connections.map((conn, idx) => (
                    <button
                      key={conn.id}
                      onClick={() => handleSyncToDAM(conn.id)}
                      style={{ animationDelay: `${(idx + 1) * 40}ms` }}
                      className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer border-t border-border-custom/30 flex items-center justify-between group"
                    >
                      <span>{conn.name}</span>
                      <span className="text-[8px] bg-bg-primary text-text-muted px-1.5 py-0.5 rounded-[1px] group-hover:bg-neutral-800 group-hover:text-white uppercase">
                        {conn.provider}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            disabled
            className="text-xs px-3.5 py-1.5 font-mono font-bold uppercase tracking-wider rounded-[2px] border border-border-custom text-text-muted opacity-50 cursor-not-allowed"
          >
            No active DAM connections
          </button>
        )}

        {syncStatus !== 'idle' && (
          <span className={`text-[10px] font-mono ml-2 ${syncStatus === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {syncMessage}
          </span>
        )}

        <span className="text-[10px] font-mono text-text-muted self-center ml-auto">
          {filtered.length} / {players.length} players
        </span>
      </div>

      {/* Table */}
      <div className="bg-bg-surface border border-border-custom overflow-x-auto rounded-md">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border-custom">
              <th
                className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                onClick={() => toggleSort('jersey')}
              >
                #{sortIndicator('jersey')}
              </th>
              <th
                className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                onClick={() => toggleSort('fullName')}
              >
                Name{sortIndicator('fullName')}
              </th>
              <th
                className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                onClick={() => toggleSort('position')}
              >
                Pos{sortIndicator('position')}
              </th>
              <th
                className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                onClick={() => toggleSort('heightImperial')}
              >
                Ht ({unitsPref === 'metric' ? 'cm' : 'ft/in'}){sortIndicator('heightImperial')}
              </th>
              <th
                className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                onClick={() => toggleSort('weightImperial')}
              >
                Wt ({unitsPref === 'metric' ? 'kg' : 'lbs'}){sortIndicator('weightImperial')}
              </th>
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted">
                Phonetic
              </th>
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-text-muted">
                中文
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom">
            {filtered.map((player) => (
              <tr key={player.id} className="hover:bg-bg-primary/50 transition-colors">
                <td className="p-3 text-text-primary font-bold">{player.jersey}</td>
                <td className="p-3 text-text-primary">{player.fullName}</td>
                <td className="p-3 text-text-secondary">{player.position}</td>
                <td className="p-3 text-text-secondary">
                  {formatHeight(player.heightImperial, player.heightMetric, unitsPref) || <span className="text-text-muted">—</span>}
                </td>
                <td className="p-3 text-text-secondary">
                  {formatWeight(player.weightImperial, player.weightMetric, unitsPref) || <span className="text-text-muted">—</span>}
                </td>
                <td className="p-3 text-text-secondary font-mono">
                  {player.phoneticSimplified ?? (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="p-3 text-text-secondary">
                  {player.nameMandarin ?? (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-text-muted">
                  No players match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
