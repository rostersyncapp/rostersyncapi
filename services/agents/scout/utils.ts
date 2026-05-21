import { supabase } from '../../supabase.ts';

export async function resolveTeamInfo(leagueId: string, teamName: string, teamId: string) {
    const teamUpper = teamName.toUpperCase().trim();
    const slugUpper = teamId.toUpperCase().replace(/-/g, ' ');
    const searchLeague = leagueId.toLowerCase();

    // 0. For NHL, prioritize the 3-letter codes from teams_metadata
    // The official NHL API (nhle.com) REQUIRES these and fails with numeric IDs.
    if (searchLeague === 'nhl' && supabase) {
        try {
            const { data: nhlMeta } = await supabase
                .from('teams_metadata')
                .select('nhl_code')
                .or(`team_name.eq.${teamUpper},team_name.eq.${slugUpper}`)
                .not('nhl_code', 'is', null)
                .limit(1)
                .maybeSingle();
            
            if (nhlMeta && nhlMeta.nhl_code) {
                console.log(`[Scout] Resolved NHL code via metadata: ${nhlMeta.nhl_code}`);
                return { id: nhlMeta.nhl_code };
            }
        } catch (err) {
            console.warn('[Scout] NHL metadata lookup failed', err);
        }
    }

    // 1. Try authoritative database lookup first
    if (supabase) {
        try {
            const { data } = await supabase
                .from('teams')
                .select('external_id, abbreviation')
                .eq('league', searchLeague)
                .ilike('name', teamName)
                .limit(1)
                .maybeSingle();

            if (data) {
                // For NHL, we MUST have the abbreviation (3-letter code)
                if (searchLeague === 'nhl' && data.abbreviation) {
                    console.log(`[Scout] Found authoritative NHL abbreviation in DB for ${teamName}: ${data.abbreviation}`);
                    return { id: data.abbreviation };
                }
                if (data.external_id) {
                    console.log(`[Scout] Found authoritative external_id in DB for ${teamName}: ${data.external_id}`);
                    return { id: data.external_id };
                }
            }

            // Try alt_names
            const { data: altData } = await supabase
                .from('teams')
                .select('external_id, abbreviation')
                .eq('league', searchLeague)
                .contains('alt_names', [teamName])
                .limit(1)
                .maybeSingle();

            if (altData) {
                if (searchLeague === 'nhl' && altData.abbreviation) {
                    console.log(`[Scout] Found authoritative NHL abbreviation via alt_name for ${teamName}: ${altData.abbreviation}`);
                    return { id: altData.abbreviation };
                }
                if (altData.external_id) {
                    console.log(`[Scout] Found authoritative external_id via alt_name for ${teamName}: ${altData.external_id}`);
                    return { id: altData.external_id };
                }
            }

            // 2. Fallback to teams_metadata
            const { data: metaData } = await supabase
                .from('teams_metadata')
                .select('espn_id, nhl_code')
                .or(`team_name.eq.${teamUpper},team_name.eq.${slugUpper}`)
                .limit(1)
                .maybeSingle();
                
            if (metaData) {
                if (searchLeague === 'nhl' && metaData.nhl_code) {
                    return { id: metaData.nhl_code };
                }
                if (metaData.espn_id) {
                    console.log(`[Scout] Resolved espn_id via metadata for ${teamName}: ${metaData.espn_id}`);
                    return { id: metaData.espn_id };
                }
            }
        } catch (err) {
            console.warn('[Scout] DB lookup failed', err);
        }
    }

    return null;
}

export async function fetchNCAARosterFromCore(sport: string, league: string, teamId: string, season: number) {
    const baseUrl = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${league}/seasons/${season}/teams/${teamId}/athletes?limit=1000`;
    console.log(`[Scout] Fetching NCAA Core Roster: ${baseUrl}`);
    
    try {
        const res = await fetch(baseUrl);
        if (!res.ok) return [];
        const data = await res.json();
        const athleteRefs = data.items || [];
        
        // To be efficient, we fetch the athletes in batches
        const players = [];
        const batchSize = 20;
        
        for (let i = 0; i < athleteRefs.length; i += batchSize) {
            const batch = athleteRefs.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (ref: any) => {
                try {
                    const aRes = await fetch(ref.$ref);
                    const aData = await aRes.json();
                    return {
                        id: aData.id.toString(),
                        name: aData.fullName,
                        jersey: aData.jersey,
                        position: aData.position?.abbreviation || 'ATH',
                        teamId: teamId
                    };
                } catch {
                    return null;
                }
            }));
            players.push(...batchResults.filter(p => p !== null));
        }
        
        return players;
    } catch (err) {
        console.error(`[Scout] Core API fetch failed for ${teamId}:`, err);
        return [];
    }
}
