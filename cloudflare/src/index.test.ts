import { describe, it, expect, vi } from 'vitest';
import app from './index';

describe('RosterSync Gateway - Rosters Endpoints', () => {
  const TEST_API_KEY = 'rs_test_12345';
  const HASHED_KEY = '5ca5b2639624a232a8dfa8b8563c5b2dc6bf335ee2ce022dac3b3aad756af001';

  it('GET /v1/rosters - should return 401 if unauthorized', async () => {
    const res = await app.request('/v1/rosters', {
      method: 'GET',
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
  });
});
