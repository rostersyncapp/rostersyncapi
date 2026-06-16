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

describe('RosterSync Gateway - Delta Feed & Athlete Corrections Endpoints', () => {
  const TEST_API_KEY = 'rs_test_12345';
  const HASHED_KEY = '5ca5b2639624a232a8dfa8b8563c5b2dc6bf335ee2ce022dac3b3aad756af001';

  // API key with NO organization context (free tier representation)
  const NO_ORG_API_KEY = 'rs_test_no_org';
  const NO_ORG_HASHED_KEY = '89bff22b6ffa42e9b9ae452d1f151f2e2212154b1d7456c77632d4e00c53c609';

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
      if (key === `key:${NO_ORG_HASHED_KEY}`) {
        return JSON.stringify({
          active: true,
          organization_id: null,
          tier: 'free',
          rate_limit_rpm: 10
        });
      }
      if (key === 'config:supabase_anon_key') {
        return 'mock-anon-key';
      }
      if (key === 'config:supabase_service_role_key') {
        return 'mock-service-role-key';
      }
      return null;
    }),
    put: vi.fn(),
  };

  describe('GET /v1/changes', () => {
    it('should validate since parameter and return 400 if invalid', async () => {
      const res = await app.request('/v1/changes?since=not-a-date', {
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
      expect(body.error.message).toContain('valid ISO 8601');
    });

    it('should query Supabase changes with default since param (last 24 hours) if omitted', async () => {
      const originalFetch = globalThis.fetch;
      let requestedUrl = '';

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              team_id: 'team-1',
              league_id: 'nhl',
              season_year: 2026,
              updated_at: '2026-05-26T10:00:00Z'
            }
          ])
        });
      }) as any;

      try {
        const res = await app.request('/v1/changes', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        }, {
          ROSTERSYNC_KV: mockKv,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.success).toBe(true);
        expect(body.data.changes).toHaveLength(1);
        expect(body.data.changes[0].team_id).toBe('team-1');
        expect(body.meta.since).toBeDefined();
        
        // Assert it default-queried with gt
        expect(requestedUrl).toContain('updated_at=gt.');
        const parsedSince = new Date(body.meta.since).getTime();
        const now = Date.now();
        // Should be approximately 24 hours ago
        expect(now - parsedSince).toBeGreaterThanOrEqual(23.9 * 60 * 60 * 1000);
        expect(now - parsedSince).toBeLessThanOrEqual(24.1 * 60 * 60 * 1000);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should query Supabase changes with custom since parameter', async () => {
      const originalFetch = globalThis.fetch;
      let requestedUrl = '';
      const customSince = '2026-05-25T12:00:00.000Z';

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }) as any;

      try {
        const res = await app.request(`/v1/changes?since=${customSince}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        }, {
          ROSTERSYNC_KV: mockKv,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.success).toBe(true);
        expect(body.meta.since).toBe(customSince);
        expect(requestedUrl).toContain(`updated_at=gt.${encodeURIComponent(customSince)}`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should propagate Supabase errors correctly as internal errors', async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Database connection failed')
        });
      }) as any;

      try {
        const res = await app.request('/v1/changes', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        }, {
          ROSTERSYNC_KV: mockKv,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(500);
        const body = await res.json() as any;
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('INTERNAL_ERROR');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('POST /v1/athletes/:id/corrections', () => {
    it('should validate correction fields and return 400 on invalid field', async () => {
      const res = await app.request('/v1/athletes/player-123/corrections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: 'invalid_field',
          correction: 'New Name'
        })
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Field must be one of');
    });

    it('should validate correction value and return 400 on empty correction value', async () => {
      const res = await app.request('/v1/athletes/player-123/corrections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: 'phonetic_name',
          correction: '   '
        })
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Correction value must be a non-empty string');
    });

    it('should submit successfully, log to stdout, and write activity logs in Supabase when orgId is present', async () => {
      const originalFetch = globalThis.fetch;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      let activityLogPayload: any = null;
      let activityLogHeaders: any = null;

      globalThis.fetch = vi.fn().mockImplementation((url, options) => {
        if (url.includes('/rest/v1/activity_logs') && options?.method === 'POST') {
          activityLogPayload = JSON.parse(options.body);
          activityLogHeaders = options.headers;
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve([{ id: 'log-1' }])
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      }) as any;

      try {
        const res = await app.request('/v1/athletes/player-123/corrections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            field: 'phonetic_name',
            correction: 'CON-or',
            reason: 'mispronounced'
          })
        }, {
          ROSTERSYNC_KV: mockKv,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.success).toBe(true);
        expect(body.message).toContain('logged successfully');
        expect(body.data.athlete_id).toBe('player-123');
        expect(body.data.field).toBe('phonetic_name');
        expect(body.data.correction).toBe('CON-or');
        expect(body.data.reason).toBe('mispronounced');

        // Check console logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Correction] Athlete: player-123, Field: phonetic_name, Value: CON-or, Reason: mispronounced')
        );

        // Check Supabase activity log
        expect(activityLogPayload).toBeDefined();
        expect(activityLogPayload.user_id).toBe('test-org');
        expect(activityLogPayload.action_type).toBe('ROSTER_UPDATE');
        expect(activityLogPayload.description).toContain('Correction submitted for athlete player-123 (phonetic_name -> CON-or)');
        expect(activityLogHeaders['apikey']).toBe('mock-service-role-key');
        expect(activityLogHeaders['Authorization']).toBe('Bearer mock-service-role-key');
      } finally {
        globalThis.fetch = originalFetch;
        consoleSpy.mockRestore();
      }
    });

    it('should submit successfully and log to stdout but skip writing activity logs if orgId is absent', async () => {
      const originalFetch = globalThis.fetch;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      let calledSupabase = false;

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        calledSupabase = true;
        return Promise.resolve({ ok: false, status: 404 });
      }) as any;

      try {
        const res = await app.request('/v1/athletes/player-123/corrections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NO_ORG_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            field: 'chinese_name',
            correction: '麦克戴维'
          })
        }, {
          ROSTERSYNC_KV: mockKv,
          SUPABASE_URL: 'https://test.supabase.co'
        });

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.success).toBe(true);

        // Check console logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Correction] Athlete: player-123, Field: chinese_name, Value: 麦克戴维, Reason: None')
        );

        // Check that Supabase was NOT called (no activity logging since orgId is missing/null)
        expect(calledSupabase).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
        consoleSpy.mockRestore();
      }
    });

    it('should return 400 if JSON request body is malformed/invalid', async () => {
      const res = await app.request('/v1/athletes/player-123/corrections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid-json'
      }, {
        ROSTERSYNC_KV: mockKv,
        SUPABASE_URL: 'https://test.supabase.co'
      });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Invalid JSON request body');
    });
  });
});
