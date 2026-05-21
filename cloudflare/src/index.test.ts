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

describe('RosterSync Gateway - Rosters Endpoints', () => {
  const TEST_API_KEY = 'rs_test_12345';
  const HASHED_KEY = '5ca5b2639624a232a8dfa8b8563c5b2dc6bf335ee2ce022dac3b3aad756af001';

  it('GET /v1/rosters - should return 401 if unauthorized', async () => {
    const res = await app.request('/v1/rosters', {
      method: 'GET',
    }, {
      ROSTERSYNC_KV: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) },
      SUPABASE_URL: 'https://test.supabase.co'
    });
    expect(res.status).toBe(401);
  });

  it('GET /v1/rosters - should return 200 and roster data', async () => {
    // Mock KV for Auth
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

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/reference_rosters?select=*&limit=50&offset=0')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: '1', team_id: 'Test Team' }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/rosters', {
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
      expect(body.data).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/rosters/:teamId - should return 200 and roster data for a specific team', async () => {
    // Mock KV for Auth
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

    // Mock global fetch
    const teamId = 'test-team-uuid';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(`/rest/v1/teams?`)) {
         return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: teamId, name: 'Specific Team' }])
        });
      }
      if (url.includes(`/rest/v1/reference_rosters?team_id=eq.${teamId}&select=*`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: teamId, team_name: 'Specific Team' }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/rosters/${teamId}`, {
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
      expect(body.data.id).toBe(teamId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/rosters/players/:playerId - should return 200 and player data', async () => {
    // Mock KV for Auth
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

    const playerId = '00-0006042';
    const mockPlayerData = {
      id: playerId,
      status: "active",
      fullName: "Tarik Glenn",
      position: "T",
      jerseyNumber: "78"
    };

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      // It should query reference_rosters using the JSONB arrow operator or containment to find the player
      if (url.includes(`/rest/v1/reference_rosters?roster_data=cs.[{"id":"${playerId}"}]`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{
            id: 'd4a04ede-a3e5-4a8a-871f-c8e8fabac842',
            team_id: '4f74d6ef-074a-4b1e-8845-ecfd98fe4c74',
            season_year: 2006,
            roster_data: [mockPlayerData]
          }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request(`/v1/rosters/players/${playerId}`, {
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
      expect(body.data.player.id).toBe(playerId);
      expect(body.data.player.fullName).toBe('Tarik Glenn');
      expect(body.data.team_id).toBe('4f74d6ef-074a-4b1e-8845-ecfd98fe4c74');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/rosters?league=nfl - should pass league filter to Supabase', async () => {
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ active: true, organization_id: 'test', tier: 'pro', rate_limit_rpm: 100 })),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/reference_rosters?') && url.includes('league_id=eq.nfl')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'nfl-roster' }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/rosters?league=nfl', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      }, { ROSTERSYNC_KV: mockKv, SUPABASE_URL: 'https://test.supabase.co' });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data[0].id).toBe('nfl-roster');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/rosters?position=QB - should pass position filter to Supabase', async () => {
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ active: true, organization_id: 'test', tier: 'pro', rate_limit_rpm: 100 })),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/reference_rosters?') && url.includes('roster_data=cs.[{"position":"QB"}]')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'qb-roster' }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/rosters?position=QB', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      }, { ROSTERSYNC_KV: mockKv, SUPABASE_URL: 'https://test.supabase.co' });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data[0].id).toBe('qb-roster');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
