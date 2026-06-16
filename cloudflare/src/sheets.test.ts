import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ConnectorAgent } from '../../services/agents/ConnectorAgent';
import { encryptCredentials } from '../../app/dashboard/settings/crypto-utils';

beforeAll(() => {
  const crypto = require('crypto');
  if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto;
  }
  if (!globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = crypto.randomUUID;
  }
});

describe('Google Sheets Auto-Sync Delivery', () => {
  it('should refresh OAuth token and perform batch sync', async () => {
    const originalFetch = globalThis.fetch;
    const encryptionKey = 'default-dam-encryption-key-32-chars-long!';
    process.env.DAM_ENCRYPTION_KEY = encryptionKey;

    const initialCredentials = {
      oauth_token: 'old-access-token',
      refresh_token: 'valid-refresh-token',
      spreadsheet_id: 'existing-spreadsheet-id'
    };

    let updatedDbCredentials = false;
    let addedNewTab = false;
    let updatedValues: any[][] = [];

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      // Helper to return a mock response with both json and text methods
      const mockResponse = (status: number, data: any) => Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        headers: new Headers({ 'Content-Type': 'application/json' })
      });

      // 1. Mock token refresh endpoint
      if (url === 'https://oauth2.googleapis.com/token') {
        return mockResponse(200, {
          access_token: 'new-refreshed-access-token',
          refresh_token: 'new-refresh-token'
        });
      }

      // 2. Mock Supabase update credentials
      if (url.includes('/rest/v1/dam_connections') && options?.method === 'PATCH') {
        updatedDbCredentials = true;
        return mockResponse(200, []);
      }

      // 3. Mock Google Sheets Metadata query
      if (url.includes('/v4/spreadsheets/existing-spreadsheet-id?fields=sheets.properties')) {
        // Return 401 on first call to trigger refresh, then 200
        const isAuthorized = options?.headers?.['Authorization'] === 'Bearer new-refreshed-access-token';
        if (!isAuthorized) {
          return mockResponse(401, { error: 'Unauthorized' });
        }
        return mockResponse(200, {
          sheets: [
            { properties: { title: 'Sheet1' } }
          ]
        });
      }

      // 4. Mock sheet creation batch update
      if (url.includes('/v4/spreadsheets/existing-spreadsheet-id:batchUpdate')) {
        addedNewTab = true;
        return mockResponse(200, {});
      }

      // 5. Mock spreadsheet values reading/writing
      if (url.includes('/values/Boston%20Bruins%20(2026)!')) {
        if (options?.method === 'PUT') {
          const body = JSON.parse(options.body);
          updatedValues = body.values;
          return mockResponse(200, {});
        }
        // Reading current values (empty sheet initially)
        return mockResponse(200, { values: [] });
      }

      // 6. Mock Supabase RPC & database operations
      if (url.includes('/rest/v1/field_mappings')) {
        return mockResponse(200, []);
      }

      if (url.includes('/rest/v1/global_player_enrichment')) {
        return mockResponse(200, [{
          player_name: 'David Pastrnak',
          phonetic_name: 'Da-veed Pas-ter-nak',
          chinese_name: '大卫·帕斯特尔尼亚克'
        }]);
      }

      if (url.includes('/rest/v1/dam_delivery_log')) {
        return mockResponse(201, []);
      }

      if (url.includes('/rest/v1/teams')) {
        return mockResponse(200, {
          name: 'Boston Bruins',
          primary_color: '#FFB81C',
          secondary_color: '#000000'
        });
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
        json: () => Promise.resolve({ error: 'Not found' })
      });
    }) as any;

    try {
      const agent = new ConnectorAgent('mock-gemini-key');
      
      const roster = {
        organization_id: 'test-org',
        season_year: 2026,
        roster_data: [
          { fullName: 'David Pastrnak', jersey: '88', position: 'RW' }
        ]
      };

      const teamData = {
        name: 'Boston Bruins',
        primary_color: '#FFB81C',
        secondary_color: '#000000'
      };

      const result = await agent.syncRosterToGoogleSheets(
        'mock-connection-id',
        roster,
        teamData,
        initialCredentials
      );

      expect(result.success).toBe(true);
      expect(result.totalSuccess).toBe(1);
      expect(updatedDbCredentials).toBe(true);
      expect(addedNewTab).toBe(true);
      
      // Verify values merged and headers populated
      expect(updatedValues).toHaveLength(2);
      expect(updatedValues[0]).toEqual(["Player Name", "Jersey", "Position", "Phonetic Name", "Mandarin Name", "Colors"]);
      expect(updatedValues[1]).toEqual(["David Pastrnak", "88", "RW", "Da-veed Pas-ter-nak", "大卫·帕斯特尔尼亚克", "#FFB81C / #000000"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
