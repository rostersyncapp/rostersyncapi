import { supabase } from './supabase.ts';

export class IntelligenceCacheService {
  /**
   * Retrieves team cache from the research_cache table in the database
   */
  static async getTeamCache(teamName: string, sport: string): Promise<any> {
    const key = `team_${teamName.toUpperCase().replace(/\s+/g, '_')}_${sport.toUpperCase()}`;
    try {
      const { data, error } = await supabase
        .from('research_cache')
        .select('*')
        .eq('cache_key', key)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      // Return the payload with the created_at timestamp injected
      return {
        ...data.payload,
        created_at: data.created_at
      };
    } catch (err) {
      console.error('[IntelligenceCacheService] getTeamCache error:', err);
      return null;
    }
  }

  /**
   * Saves or updates team cache in the research_cache table in the database
   */
  static async saveTeamCache(teamName: string, sport: string, payload: any): Promise<void> {
    const key = `team_${teamName.toUpperCase().replace(/\s+/g, '_')}_${sport.toUpperCase()}`;
    try {
      const { data: existing } = await supabase
        .from('research_cache')
        .select('cache_key')
        .eq('cache_key', key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('research_cache')
          .update({
            payload,
            created_at: new Date().toISOString()
          })
          .eq('cache_key', key);
      } else {
        await supabase
          .from('research_cache')
          .insert({
            cache_key: key,
            payload,
            created_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('[IntelligenceCacheService] saveTeamCache error:', err);
    }
  }

  /**
   * Determines which research modules (legacy, pulse, environment) need to be refreshed
   */
  static getRefreshNeeds(cached: any, type: 'team' | 'player'): string[] {
    const needs: string[] = [];
    if (type === 'team') {
      if (!cached) {
        return ['legacy', 'pulse', 'environment'];
      }
      
      if (!cached.legacy) needs.push('legacy');
      if (!cached.pulse) needs.push('pulse');
      if (!cached.environment) needs.push('environment');

      // Default cache expiration TTL is 24 hours
      if (cached.created_at) {
        const ageMs = Date.now() - new Date(cached.created_at).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (ageMs > oneDayMs) {
          if (!needs.includes('legacy')) needs.push('legacy');
          if (!needs.includes('pulse')) needs.push('pulse');
          if (!needs.includes('environment')) needs.push('environment');
        }
      }
    }
    return needs;
  }
}
