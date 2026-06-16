import { describe, it, expect, vi, beforeAll } from 'vitest';
import app from './index';

beforeAll(() => {
  const crypto = require('crypto');
  if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto;
  }
  if (!globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = crypto.randomUUID;
  }
});

describe('RosterSync Gateway - Broadcast Export Endpoints', () => {
  const TEST_API_KEY = 'rs_test_12345';
  const HASHED_KEY = '5ca5b2639624a232a8dfa8b8563c5b2dc6bf335ee2ce022dac3b3aad756af001';

  const mockKv = {
    get: vi.fn().mockImplementation((key) => {
      if (key === `key:${HASHED_KEY}`) {
        return JSON.stringify({
          active: true,
          organization_id: 'test-org',
          tier: 'pro',
          rate_limit_rpm: 100
        });
      }
      if (key === 'config:supabase_anon_key') {
        return 'mock-anon-key';
      }
      return null;
    }),
    put: vi.fn(),
  };

  const setupMockFetch = (teamId: string, teamData: any, rosterData: any[], enrichmentData: any[]) => {
    return vi.fn().mockImplementation((url) => {
      // Team query mock
      if (url.includes('/rest/v1/teams?')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([teamData])
        });
      }
      // Roster query mock
      if (url.includes('/rest/v1/reference_rosters?')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{
            team_id: teamId,
            season_year: 2026,
            roster_data: rosterData
          }])
        });
      }
      // Enrichment query mock
      if (url.includes('/rest/v1/global_player_enrichment?')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(enrichmentData)
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;
  };

  it('GET /v1/teams/:id/export - should validate format and type parameters', async () => {
    const res = await app.request('/v1/teams/EDM/export?format=invalid&type=xml', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    }, {
      ROSTERSYNC_KV: mockKv,
      SUPABASE_URL: 'https://test.supabase.co'
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('format');
  });

  it('GET /v1/teams/:id/export - Vizrt XML', async () => {
    const originalFetch = globalThis.fetch;
    const teamId = 'team-123';
    globalThis.fetch = setupMockFetch(
      teamId,
      { id: teamId, name: 'Edmonton Oilers', abbreviation: 'EDM', logo_url: 'https://example.com/logo.png', primary_color: '#FF4C00', secondary_color: '#002F6C' },
      [{ id: 'player-1', name: 'Connor McDavid', jersey: '97', position: 'C' }],
      [{ player_id: 'player-1', phonetic_name: 'CON-or mik-DAY-vid', ipa_name: '/ˈkɒnər məkˈdeɪvɪd/', chinese_name: '麦克戴维', hardware_safe_name: 'Connor McDavid' }]
    );

    try {
      const res = await app.request(`/v1/teams/${teamId}/export?format=vizrt&type=xml&season=2026`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/xml');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
      expect(res.headers.get('Content-Disposition')).toContain('EDM_roster_vizrt.xml');
      
      const xml = await res.text();
      expect(xml).toContain('<tickerfeed version="2.4">');
      expect(xml).toContain('<name>Edmonton Oilers</name>');
      expect(xml).toContain('<logo_url>https://example.com/logo.png</logo_url>');
      expect(xml).toContain('<primary_color>#FF4C00</primary_color>');
      expect(xml).toContain('<secondary_color>#002F6C</secondary_color>');
      expect(xml).toContain('<field name="phonetic_name">CON-or mik-DAY-vid</field>');
      expect(xml).toContain('<field name="ipa_name">/ˈkɒnər məkˈdeɪvɪd/</field>');
      expect(xml).toContain('<field name="chinese_name">麦克戴维</field>');
      expect(xml).toContain('<field name="hardware_safe_name">Connor McDavid</field>');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/teams/:id/export - Ross JSON', async () => {
    const originalFetch = globalThis.fetch;
    const teamId = 'team-123';
    globalThis.fetch = setupMockFetch(
      teamId,
      { id: teamId, name: 'Edmonton Oilers', abbreviation: 'EDM', logo_url: 'https://example.com/logo.png', primary_color: '#FF4C00', secondary_color: '#002F6C' },
      [{ id: 'player-1', name: 'Connor McDavid', jersey: '97', position: 'C' }],
      [{ player_id: 'player-1', phonetic_name: 'CON-or mik-DAY-vid', ipa_name: '/ˈkɒnər məkˈdeɪvɪd/', chinese_name: '麦克戴维', hardware_safe_name: 'Connor McDavid' }]
    );

    try {
      const res = await app.request(`/v1/teams/${teamId}/export?format=ross&type=json&season=2026`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(res.headers.get('Content-Disposition')).toContain('EDM_roster_ross.json');
      
      const json = await res.json() as any;
      expect(json.team.name).toBe('Edmonton Oilers');
      expect(json.team.logo_url).toBe('https://example.com/logo.png');
      expect(json.team.primary_color).toBe('#FF4C00');
      expect(json.team.secondary_color).toBe('#002F6C');
      expect(json.players[0].first_name).toBe('Connor');
      expect(json.players[0].last_name).toBe('McDavid');
      expect(json.players[0].phonetic_name).toBe('CON-or mik-DAY-vid');
      expect(json.players[0].ipa_name).toBe('/ˈkɒnər məkˈdeɪvɪd/');
      expect(json.players[0].chinese_name).toBe('麦克戴维');
      expect(json.players[0].hardware_safe_name).toBe('Connor McDavid');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/teams/:id/export - Chyron CSV', async () => {
    const originalFetch = globalThis.fetch;
    const teamId = 'team-123';
    globalThis.fetch = setupMockFetch(
      teamId,
      { id: teamId, name: 'Edmonton Oilers', abbreviation: 'EDM', logo_url: 'https://example.com/logo.png', primary_color: '#FF4C00', secondary_color: '#002F6C' },
      [{ id: 'player-1', name: 'Connor McDavid', jersey: '97', position: 'C' }],
      [{ player_id: 'player-1', phonetic_name: 'CON-or mik-DAY-vid', ipa_name: '/ˈkɒnər məkˈdeɪvɪd/', chinese_name: '麦克戴维', hardware_safe_name: 'Connor McDavid' }]
    );

    try {
      const res = await app.request(`/v1/teams/${teamId}/export?format=chyron&type=csv&season=2026`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv');
      expect(res.headers.get('Content-Disposition')).toContain('EDM_roster_chyron.csv');
      
      const csv = await res.text();
      const lines = csv.split('\n');
      expect(lines[0]).toBe('team_id,team_name,team_abbreviation,team_logo_url,team_primary_color,team_secondary_color,player_id,jersey_number,first_name,last_name,position,phonetic_name,ipa_name,chinese_name,hardware_safe_name,is_active');
      expect(lines[1]).toContain('team-123,Edmonton Oilers,EDM,https://example.com/logo.png,#FF4C00,#002F6C,player-1,97,Connor,McDavid,C,CON-or mik-DAY-vid,/ˈkɒnər məkˈdeɪvɪd/,麦克戴维,Connor McDavid,true');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
