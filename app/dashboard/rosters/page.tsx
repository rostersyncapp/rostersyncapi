import { createClient } from '@/utils/supabase/server'
import RosterDirectory from './RosterDirectory'

export default async function RostersPage() {
  const supabase = await createClient()

  const [
    { data: leagues },
    { data: teams },
    { data: wcmTeams },
    { data: wcfTeams }
  ] = await Promise.all([
    supabase.from('leagues').select('*').order('name'),
    supabase.from('teams').select('*').order('name'),
    supabase.from('fifaworldcupm').select('id, country_name, abbreviation, logo_url'),
    supabase.from('fifaworldcupf').select('id, country_name, abbreviation, logo_url'),
  ])

  const formattedWcm = (wcmTeams || []).map(t => ({
    id: t.id,
    name: t.country_name,
    display_name: t.country_name,
    abbreviation: t.abbreviation,
    logo_url: t.logo_url,
    league: 'fifaworldcupm',
    primary_color: '#0D1B2A',
    secondary_color: '#FFFFFF'
  }))

  const formattedWcf = (wcfTeams || []).map(t => ({
    id: t.id,
    name: t.country_name,
    display_name: t.country_name,
    abbreviation: t.abbreviation,
    logo_url: t.logo_url,
    league: 'fifaworldcupf',
    primary_color: '#003049',
    secondary_color: '#FFFFFF'
  }))

  const allTeams = [
    ...(teams ?? []),
    ...formattedWcm,
    ...formattedWcf
  ]

  const extendedLeagues = [
    ...(leagues ?? []),
    { id: 'fifaworldcupm', name: "FIFA Men's World Cup" },
    { id: 'fifaworldcupf', name: "FIFA Women's World Cup" }
  ]

  return (
    <div className="max-w-6xl">
      <RosterDirectory teams={allTeams} leagues={extendedLeagues} />
    </div>
  )
}
