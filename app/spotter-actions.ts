'use server';

import { createScopedClient } from '@/services/supabase';

export interface SpotterPlayer {
  id: string;
  fullName: string;
  jerseyNumber: string;
  position: string;
  phoneticSimplified: string;
  nameMandarin: string;
  status?: string;
}

export interface SpotterTeamData {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  league: string;
  players: SpotterPlayer[];
}

export async function getSpotterData(): Promise<{ teamA: SpotterTeamData | null; teamB: SpotterTeamData | null }> {
  try {
    const supabase = createScopedClient();

    // 1. Fetch the team info
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', ['154cffa9-1945-4063-bb29-01e13b902ff6', '5f19069c-eefb-41ab-81f3-e4a66565ba1f']);

    if (teamsError || !teams) {
      console.error('Error fetching teams for spotter board:', teamsError);
      return { teamA: null, teamB: null };
    }

    const sfgTeam = teams.find(t => t.id === '154cffa9-1945-4063-bb29-01e13b902ff6');
    const ladTeam = teams.find(t => t.id === '5f19069c-eefb-41ab-81f3-e4a66565ba1f');

    // 2. Fetch rosters
    // SF Giants - 2026 season
    const { data: sfgRoster, error: sfgRosterError } = await supabase
      .from('reference_rosters')
      .select('roster_data')
      .eq('team_id', '154cffa9-1945-4063-bb29-01e13b902ff6')
      .eq('season_year', 2026)
      .maybeSingle();

    // LA Dodgers - 2026 season
    const { data: ladRoster, error: ladRosterError } = await supabase
      .from('reference_rosters')
      .select('roster_data')
      .eq('team_id', '5f19069c-eefb-41ab-81f3-e4a66565ba1f')
      .eq('season_year', 2026)
      .maybeSingle();

    if (sfgRosterError) console.error('Error fetching SF Giants roster:', sfgRosterError);
    if (ladRosterError) console.error('Error fetching LA Dodgers roster:', ladRosterError);

    // 3. Process SF Giants Roster
    let sfgPlayers: SpotterPlayer[] = [];
    if (sfgRoster?.roster_data && Array.isArray(sfgRoster.roster_data)) {
      const rawPlayers = sfgRoster.roster_data as any[];
      
      const keyPlayerNames = [
        'Willy Adames',
        'Matt Chapman',
        'Rafael Devers',
        'Jung Hoo Lee',
        'Luis Arraez',
        'Heliot Ramos',
        'Harrison Bader',
        'Casey Schmitt',
        'Bryce Eldridge',
        'Robbie Ray',
        'Tyler Mahle',
        'Keaton Winn'
      ];

      const mapped = rawPlayers.map(p => ({
        id: p.id || Math.random().toString(),
        fullName: p.fullName || '',
        jerseyNumber: p.jersey || '00',
        position: p.position || 'N/A',
        phoneticSimplified: p.phoneticSimplified || '',
        nameMandarin: p.nameMandarin || '',
        status: p.status
      }));

      const keyPlayers = mapped.filter(p => keyPlayerNames.some(kn => p.fullName.toLowerCase().includes(kn.toLowerCase())));
      const otherPlayers = mapped.filter(p => !keyPlayerNames.some(kn => p.fullName.toLowerCase().includes(kn.toLowerCase())));
      
      sfgPlayers = [...keyPlayers, ...otherPlayers].slice(0, 15);
    }

    // 4. Process LA Dodgers Roster
    let ladPlayers: SpotterPlayer[] = [];
    if (ladRoster?.roster_data && Array.isArray(ladRoster.roster_data)) {
      const rawPlayers = ladRoster.roster_data as any[];

      const keyPlayerNames = [
        'Shohei Ohtani',
        'Mookie Betts',
        'Freddie Freeman',
        'Blake Snell',
        'Yoshinobu Yamamoto',
        'Roki Sasaki',
        'Kyle Tucker',
        'Teoscar Hernandez',
        'Max Muncy',
        'Will Smith',
        'Hyeseong Kim',
        'Andy Pages'
      ];

      const mapped = rawPlayers.map(p => ({
        id: p.id || Math.random().toString(),
        fullName: p.fullName || '',
        jerseyNumber: p.jersey || '00',
        position: p.position || 'N/A',
        phoneticSimplified: p.phoneticSimplified || '',
        nameMandarin: p.nameMandarin || '',
        status: p.status
      }));

      const keyPlayers = mapped.filter(p => keyPlayerNames.some(kn => p.fullName.toLowerCase().includes(kn.toLowerCase())));
      const otherPlayers = mapped.filter(p => !keyPlayerNames.some(kn => p.fullName.toLowerCase().includes(kn.toLowerCase())));

      ladPlayers = [...keyPlayers, ...otherPlayers].slice(0, 15);
    }

    const teamA: SpotterTeamData | null = sfgTeam ? {
      id: sfgTeam.id,
      name: sfgTeam.name,
      abbreviation: sfgTeam.abbreviation,
      logoUrl: sfgTeam.logo_url,
      primaryColor: sfgTeam.primary_color || '#000000',
      secondaryColor: sfgTeam.secondary_color || '#fd5a1e',
      league: sfgTeam.league,
      players: sfgPlayers
    } : null;

    const teamB: SpotterTeamData | null = ladTeam ? {
      id: ladTeam.id,
      name: ladTeam.name,
      abbreviation: ladTeam.abbreviation,
      logoUrl: ladTeam.logo_url,
      primaryColor: ladTeam.primary_color || '#005a9c',
      secondaryColor: ladTeam.secondary_color || '#ffffff',
      league: ladTeam.league,
      players: ladPlayers
    } : null;

    return { teamA, teamB };
  } catch (error) {
    console.error('Exception in getSpotterData server action:', error);
    return { teamA: null, teamB: null };
  }
}
