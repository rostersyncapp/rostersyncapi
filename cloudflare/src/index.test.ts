import { describe, it, expect, vi, beforeAll } from 'vitest';
import app from './index';
import { encryptCredentials, decryptCredentials } from './utils/crypto';

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
            tier: 'studio',
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
            tier: 'studio',
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
            tier: 'studio',
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
      get: vi.fn().mockResolvedValue(JSON.stringify({ active: true, organization_id: 'test', tier: 'studio', rate_limit_rpm: 100 })),
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
      get: vi.fn().mockResolvedValue(JSON.stringify({ active: true, organization_id: 'test', tier: 'studio', rate_limit_rpm: 100 })),
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

describe('RosterSync Gateway - Crypto Utilities', () => {
  it('should encrypt and decrypt credentials correctly', async () => {
    const credentials = { app_id: 'test-app', auth_token: 'secret-token' };
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const { encrypted, iv } = await encryptCredentials(credentials, key);
    expect(encrypted).toBeDefined();
    expect(iv).toBeDefined();

    const decrypted = await decryptCredentials(encrypted, iv, key);
    expect(decrypted).toEqual(credentials);
  });
});

describe('RosterSync Gateway - DAM Integrations Endpoints', () => {
  const TEST_API_KEY = 'rs_test_12345';
  const HASHED_KEY = '5ca5b2639624a232a8dfa8b8563c5b2dc6bf335ee2ce022dac3b3aad756af001';
  const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const mockKv = {
    get: vi.fn().mockImplementation((key) => {
      if (key === `key:${HASHED_KEY}`) {
        return JSON.stringify({
          active: true,
          organization_id: 'test-org',
          tier: 'studio',
          rate_limit_rpm: 100
        });
      }
      if (key === 'config:supabase_anon_key') {
        return 'mock-anon-key';
      }
      if (key === 'config:supabase_service_role_key') {
        return 'mock-service-role-key';
      }
      if (key === 'config:dam_encryption_key') {
        return ENCRYPTION_KEY;
      }
      return null;
    }),
    put: vi.fn(),
  };

  it('GET /v1/integrations/providers - should return supported providers', async () => {
    const res = await app.request('/v1/integrations/providers', {
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
    expect(body.data).toBeDefined();
    expect(body.data.some((p: any) => p.id === 'iconik')).toBe(true);
    expect(body.data.some((p: any) => p.id === 'catdv')).toBe(true);
    expect(body.data.some((p: any) => p.id === 'webhook')).toBe(true);
  });

  it('POST /v1/integrations - should fail if unauthorized', async () => {
    const res = await app.request('/v1/integrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'My Iconik', provider: 'iconik', credentials: {} })
    }, {
      ROSTERSYNC_KV: mockKv,
      SUPABASE_URL: 'https://test.supabase.co'
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/integrations - should fail if required fields are missing or credentials invalid', async () => {
    const res1 = await app.request('/v1/integrations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'iconik', credentials: {} }) // missing name
    }, {
      ROSTERSYNC_KV: mockKv,
      SUPABASE_URL: 'https://test.supabase.co'
    });
    expect(res1.status).toBe(422);
    const body1 = await res1.json() as any;
    expect(body1.success).toBe(false);
    expect(body1.error.code).toBe('VALIDATION_ERROR');

    const res2 = await app.request('/v1/integrations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'My Iconik', provider: 'iconik', credentials: { app_id: '123' } }) // missing auth_token
    }, {
      ROSTERSYNC_KV: mockKv,
      SUPABASE_URL: 'https://test.supabase.co'
    });
    expect(res2.status).toBe(422);
  });

  it('POST /v1/integrations - should successfully create integration connection', async () => {
    const originalFetch = globalThis.fetch;
    let postBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections') && options.method === 'POST') {
        postBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve([{
            id: 'conn-123',
            organization_id: 'test-org',
            name: 'My Iconik',
            provider: 'iconik',
            credentials_encrypted: postBody.credentials_encrypted,
            credentials_iv: postBody.credentials_iv,
            base_url: 'https://api.iconik.io',
            active: false,
            created_at: new Date().toISOString()
          }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'My Iconik',
          provider: 'iconik',
          credentials: { app_id: 'my-app-id', auth_token: 'my-token' },
          base_url: 'https://api.iconik.io'
        })
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('conn-123');
      expect(body.data.credentials.app_id).toBe('********');
      expect(body.data.credentials.auth_token).toBe('********');
      expect(postBody).toBeDefined();
      expect(postBody.organization_id).toBe('test-org');
      expect(postBody.credentials_encrypted).not.toBe('my-token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/integrations - should list connections and mask credentials', async () => {
    const originalFetch = globalThis.fetch;
    const creds = { app_id: 'some-app', auth_token: 'some-token' };
    const { encrypted, iv } = await encryptCredentials(creds, ENCRYPTION_KEY);

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/dam_connections?organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-123',
              organization_id: 'test-org',
              name: 'My Iconik',
              provider: 'iconik',
              credentials_encrypted: encrypted,
              credentials_iv: iv,
              base_url: 'https://api.iconik.io',
              active: true
            }
          ])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations', {
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
      expect(body.data[0].credentials.app_id).toBe('********');
      expect(body.data[0].credentials.auth_token).toBe('********');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/integrations/:id - should return 404 if not found or unauthorized', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-other&organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-other', {
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

  it('GET /v1/integrations/:id - should return connection details with masked credentials', async () => {
    const originalFetch = globalThis.fetch;
    const creds = { app_id: 'some-app', auth_token: 'some-token' };
    const { encrypted, iv } = await encryptCredentials(creds, ENCRYPTION_KEY);

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-123&organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-123',
              organization_id: 'test-org',
              name: 'My Iconik',
              provider: 'iconik',
              credentials_encrypted: encrypted,
              credentials_iv: iv,
              base_url: 'https://api.iconik.io',
              active: true
            }
          ])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-123', {
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
      expect(body.data.id).toBe('conn-123');
      expect(body.data.credentials.app_id).toBe('********');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('PATCH /v1/integrations/:id - should successfully update configuration and re-encrypt credentials', async () => {
    const originalFetch = globalThis.fetch;
    const initialCreds = { app_id: 'old-app', auth_token: 'old-token' };
    const initialEnc = await encryptCredentials(initialCreds, ENCRYPTION_KEY);
    let patchBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-123&organization_id=eq.test-org')) {
        if (options?.method === 'PATCH') {
          patchBody = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 'conn-123',
                organization_id: 'test-org',
                name: patchBody.name || 'My Iconik',
                provider: 'iconik',
                credentials_encrypted: patchBody.credentials_encrypted || initialEnc.encrypted,
                credentials_iv: patchBody.credentials_iv || initialEnc.iv,
                active: patchBody.active !== undefined ? patchBody.active : true
              }
            ])
          });
        }
        // GET existing connection
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-123',
              organization_id: 'test-org',
              name: 'My Iconik',
              provider: 'iconik',
              credentials_encrypted: initialEnc.encrypted,
              credentials_iv: initialEnc.iv,
              active: true
            }
          ])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-123', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Name',
          credentials: { app_id: 'new-app-id', auth_token: 'new-token' }
        })
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.credentials.app_id).toBe('********');
      expect(patchBody.credentials_encrypted).toBeDefined();
      expect(patchBody.credentials_encrypted).not.toBe(initialEnc.encrypted);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('DELETE /v1/integrations/:id - should delete the connection', async () => {
    const originalFetch = globalThis.fetch;
    let deleted = false;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-123&organization_id=eq.test-org')) {
        if (options?.method === 'DELETE') {
          deleted = true;
          return Promise.resolve({ ok: true, status: 204 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'conn-123', organization_id: 'test-org' }])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-123', {
        method: 'DELETE',
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
      expect(deleted).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /v1/integrations/:id/test - should mock and test connection for Iconik', async () => {
    const originalFetch = globalThis.fetch;
    const creds = { app_id: 'iconik-app', auth_token: 'iconik-token' };
    const { encrypted, iv } = await encryptCredentials(creds, ENCRYPTION_KEY);

    let supabaseUpdatedPayload: any = null;
    let calledIconik = false;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-iconik&organization_id=eq.test-org')) {
        if (options?.method === 'PATCH') {
          supabaseUpdatedPayload = JSON.parse(options.body);
          return Promise.resolve({ ok: true, status: 200 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-iconik',
              organization_id: 'test-org',
              name: 'My Iconik',
              provider: 'iconik',
              credentials_encrypted: encrypted,
              credentials_iv: iv,
              base_url: 'https://api.iconik.io',
              active: false
            }
          ])
        });
      }

      if (url.includes('api.iconik.io/api/v1/users/me/') || url.includes('api/users/v1/users/')) {
        calledIconik = true;
        expect(options.headers['App-Id']).toBe('iconik-app');
        expect(options.headers['Auth-Token']).toBe('iconik-token');
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('ok')
        });
      }

      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-iconik/test', {
        method: 'POST',
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
      expect(body.data.active).toBe(true);
      expect(calledIconik).toBe(true);
      expect(supabaseUpdatedPayload.active).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /v1/integrations/:id/test - should mock and test connection for Webhook with signature', async () => {
    const originalFetch = globalThis.fetch;
    const creds = { secret_key: 'my-webhook-secret' };
    const { encrypted, iv } = await encryptCredentials(creds, ENCRYPTION_KEY);

    let supabaseUpdatedPayload: any = null;
    let calledWebhook = false;
    let webhookHeaders: any = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-webhook&organization_id=eq.test-org')) {
        if (options?.method === 'PATCH') {
          supabaseUpdatedPayload = JSON.parse(options.body);
          return Promise.resolve({ ok: true, status: 200 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-webhook',
              organization_id: 'test-org',
              name: 'My Webhook',
              provider: 'webhook',
              credentials_encrypted: encrypted,
              credentials_iv: iv,
              endpoint_url: 'https://webhook.test/endpoint',
              active: false
            }
          ])
        });
      }

      if (url === 'https://webhook.test/endpoint') {
        calledWebhook = true;
        webhookHeaders = options.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('ok')
        });
      }

      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-webhook/test', {
        method: 'POST',
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
      expect(body.data.active).toBe(true);
      expect(calledWebhook).toBe(true);
      expect(webhookHeaders['X-Webhook-Signature']).toBeDefined();
      expect(supabaseUpdatedPayload.active).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /v1/integrations/:id/sync - should trigger sync and enqueue in job_queue if active', async () => {
    const originalFetch = globalThis.fetch;
    let enqueuedJob = false;
    let jobPayload: any = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-active&organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-active',
              organization_id: 'test-org',
              name: 'My Active DAM',
              provider: 'webhook',
              active: true
            }
          ])
        });
      }

      if (url.includes('/rest/v1/job_queue') && options.method === 'POST') {
        enqueuedJob = true;
        jobPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve([{ id: 'job-789', status: 'queued' }])
        });
      }

      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-active/sync', {
        method: 'POST',
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
      expect(body.data.job_id).toBe('job-789');
      expect(enqueuedJob).toBe(true);
      expect(jobPayload.task_type).toBe('dam_connector');
      expect(jobPayload.payload.connection_id).toBe('conn-active');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /v1/integrations/:id/sync - should fail to sync if connection is inactive', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-inactive&organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'conn-inactive',
              organization_id: 'test-org',
              name: 'My Inactive DAM',
              provider: 'webhook',
              active: false
            }
          ])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-inactive/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`
        }
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('BAD_REQUEST');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GET /v1/integrations/:id/deliveries - should return delivery logs', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/rest/v1/dam_connections?id=eq.conn-123&organization_id=eq.test-org')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'conn-123', organization_id: 'test-org' }])
        });
      }
      if (url.includes('/rest/v1/dam_delivery_log?connection_id=eq.conn-123')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            { id: 'log-1', connection_id: 'conn-123', status: 'success', created_at: new Date().toISOString() }
          ])
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    try {
      const res = await app.request('/v1/integrations/conn-123/deliveries', {
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
      expect(body.data[0].id).toBe('log-1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe('RosterSync Gateway - Roster Change Webhook Endpoint', () => {
    it('POST /v1/webhooks/roster-change - should verify signature, match scopes, and enqueue job', async () => {
      const originalFetch = globalThis.fetch;
      const secret = 'my-webhook-secret-key';
      const payload = {
        type: 'UPDATE',
        table: 'reference_rosters',
        record: {
          team_id: 'team-sfg',
          league_id: 'MLB',
          season_year: 2026
        }
      };

      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(JSON.stringify(payload));
      const keyBytes = encoder.encode(secret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        payloadBytes
      );
      const signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      let enqueuedJob = false;
      let jobBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation((url, options) => {
        if (url.includes('/rest/v1/dam_connections?active=eq.true')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 'conn-sfg',
                organization_id: 'org-1',
                provider: 'iconik',
                active: true,
                leagues: ['MLB'],
                teams: ['team-sfg']
              },
              {
                id: 'conn-other',
                organization_id: 'org-2',
                provider: 'catdv',
                active: true,
                leagues: ['NFL'] // Scoped to NFL, shouldn't match MLB roster change
              }
            ])
          });
        }

        if (url.includes('/rest/v1/job_queue') && options.method === 'POST') {
          enqueuedJob = true;
          jobBody = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve([{ id: 'job-123', status: 'queued' }])
          });
        }

        return Promise.resolve({ ok: false, status: 404 });
      }) as any;

      try {
        const res = await app.request('/v1/webhooks/roster-change', {
          method: 'POST',
          headers: {
            'X-Supabase-Signature': signatureHex,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }, {
          ROSTER_WEBHOOK_SECRET: secret,
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
        });

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.success).toBe(true);
        expect(body.data.enqueued_jobs).toBe(1);
        expect(body.data.job_ids[0]).toBe('job-123');
        expect(enqueuedJob).toBe(true);
        expect(jobBody.payload.connection_id).toBe('conn-sfg');
        expect(jobBody.payload.sync_type).toBe('auto_delta_sync');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('POST /v1/webhooks/roster-change - should fail with invalid signature', async () => {
      const originalFetch = globalThis.fetch;
      const secret = 'my-webhook-secret-key';
      const payload = {
        type: 'UPDATE',
        table: 'reference_rosters',
        record: { team_id: 'team-sfg', league_id: 'MLB', season_year: 2026 }
      };

      try {
        const res = await app.request('/v1/webhooks/roster-change', {
          method: 'POST',
          headers: {
            'X-Supabase-Signature': 'invalid-signature',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }, {
          ROSTER_WEBHOOK_SECRET: secret,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(401);
        const body = await res.json() as any;
        expect(body.success).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
