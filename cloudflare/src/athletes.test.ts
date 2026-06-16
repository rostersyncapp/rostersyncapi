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

describe('RosterSync Gateway - Athlete Intelligence Endpoints', () => {
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

  it('GET /v1/athletes/:id - should return enriched data if available', async () => {
    const playerId = 'enriched-player-123';
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(`/rest/v1/global_player_enrichment?player_id=eq.${playerId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{
            player_id: playerId,
            player_name: 'Enriched Player',
            phonetic_name: 'En-riched Play-er',
            career_summary: 'A great player.'
          }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/athletes/${playerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.player_id).toBe(playerId);
      expect(body.data.phonetic_name).toBe('En-riched Play-er');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/athletes/:id - should fallback to reference_rosters if enrichment is missing', async () => {
    const playerId = 'basic-player-456';
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(`/rest/v1/global_player_enrichment?player_id=eq.${playerId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]) // Not found in enrichment
        });
      }
      if (url.includes(`/rest/v1/reference_rosters?roster_data=cs.[{"id":"${playerId}"}]`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{
            team_id: 'team-789',
            roster_data: [{
              id: playerId,
              fullName: 'Basic Player',
              position: 'QB'
            }]
          }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/athletes/${playerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(playerId);
      expect(body.data.fullName).toBe('Basic Player');
      expect(body.meta._source).toBe('reference_rosters');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/athletes/:id - should return 404 if not found in either source', async () => {
    const playerId = 'missing-player-999';
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(`/rest/v1/global_player_enrichment?player_id=eq.${playerId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes(`/rest/v1/reference_rosters?roster_data=cs.[{"id":"${playerId}"}]`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/athletes/${playerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/athletes/:id/intelligence - should return selected AI fields', async () => {
    const playerId = 'enriched-player-123';
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      // Fetching specifically the intelligence fields
      if (url.includes(`/rest/v1/global_player_enrichment?player_id=eq.${playerId}&select=phonetic_name,ipa_name,chinese_name,career_summary,color_commentary,stats_insight`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{
            phonetic_name: 'En-riched Play-er',
            ipa_name: '/ɛnˈrɪtʃt pleɪər/',
            chinese_name: '富有 球员',
            career_summary: 'A great player.',
            color_commentary: 'Look at that move!',
            stats_insight: 'He is leading the league.'
          }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/athletes/${playerId}/intelligence`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.phonetic_name).toBe('En-riched Play-er');
      expect(body.data.ipa_name).toBe('/ɛnˈrɪtʃt pleɪər/');
      expect(body.data.chinese_name).toBe('富有 球员');
      expect(body.data.color_commentary).toBe('Look at that move!');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/athletes/:id/intelligence - should return 404 if no enrichment exists', async () => {
    const playerId = 'basic-player-456';
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(`/rest/v1/global_player_enrichment?player_id=eq.${playerId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/athletes/${playerId}/intelligence`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
