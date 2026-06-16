import * as fs from 'fs';
import * as path from 'path';

// Manually load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

loadEnv();

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// Mock global fetch
const mockFetchCalls: { url: string; options: any }[] = [];

globalThis.fetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const urlString = url.toString();
  mockFetchCalls.push({ url: urlString, options });

  // 1. Fields definition lookup
  if (urlString.endsWith('/api/v1/fields')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        data: {
          items: [
            { id: 'UDF_01', name: 'Player Name', fieldGroupID: 10, type: 'picklist' },
            { id: 'UDF_02', name: 'Jersey', fieldGroupID: 10, type: 'picklist' }
          ]
        }
      })
    } as Response;
  }

  // 2. Fetch existing list values
  if (urlString.includes('/api/v1/fields/UDF_01/list')) {
    if (options?.method === 'PUT') {
      return {
        ok: true,
        status: 200,
        text: async () => 'OK'
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        data: {
          values: ['Bob Jones', 'Alice Smith']
        }
      })
    } as Response;
  }

  return {
    ok: false,
    status: 404,
    text: async () => 'Not Found'
  } as Response;
};

async function runTest() {
  const { ConnectorAgent } = await import('../services/agents/ConnectorAgent.ts');

  const agent = new ConnectorAgent('mock-agent-key');

  const credentials = {
    username: 'admin',
    password: 'password123'
  };
  const baseUrl = 'http://catdv.local:8080/server';
  const payload = {
    UDF_01: 'Stacey Augmon'
  };

  console.log('🚀 Invoking pushToExternalAPI for CatDV...');
  // Access private pushToExternalAPI by casting to any
  const result = await (agent as any).pushToExternalAPI('catdv', payload, credentials, baseUrl);

  console.log('\n✨ Pushed successfully. Result:', JSON.stringify(result, null, 2));

  console.log('\n📊 Fetch Call Log:');
  mockFetchCalls.forEach((call, index) => {
    console.log(`[Call ${index + 1}] ${call.options?.method || 'GET'} ${call.url}`);
    if (call.options?.body) {
      console.log(`Payload:`, call.options.body);
    }
  });

  // Verify that fetch calls match expectations
  const putCall = mockFetchCalls.find(c => c.options?.method === 'PUT');
  if (putCall) {
    const body = JSON.parse(putCall.options.body);
    console.log('\n🔍 Verification:');
    console.log('Updated list values:', body.values);
    // Stacey Augmon has last name Augmon, which starts with A, so she should be sorted first!
    if (body.values[0] === 'Stacey Augmon') {
      console.log('✅ PASS: Stacey Augmon correctly sorted to the top based on last name Augmon (A < J, S)!');
    } else {
      console.log('❌ FAIL: Incorrect sorting', body.values);
    }
  } else {
    console.log('❌ FAIL: No PUT call recorded');
  }
}

runTest().catch(console.error);
