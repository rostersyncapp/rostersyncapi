import { createClient } from '@supabase/supabase-js';
import { decryptCredentials } from '../app/dashboard/settings/crypto-utils';
import * as fs from 'fs';
import * as path from 'path';

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

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENCRYPTION_KEY = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: connections } = await supabase
    .from('dam_connections')
    .select('*')
    .eq('provider', 'catdv')
    .eq('active', true);
    
  if (!connections || connections.length === 0) return;
  const conn = connections[0];
  const credentials = await decryptCredentials(conn.credentials_encrypted, conn.credentials_iv, ENCRYPTION_KEY);
  const { username, password } = credentials;
  const authString = Buffer.from(`${username}:${password}`).toString('base64');
  const authHeader = `Basic ${authString}`;

  const base = conn.base_url.replace(/\/+$/, '');
  const url = `${base}/catdv/api/9/fields/1003/list?include=values&groupID=1002`;

  console.log(`Running loop query against: ${url}`);
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });
      console.log(`[Query ${i + 1}] Status: ${res.status}`);
      const text = await res.text();
      if (!res.ok) {
        console.log(`Error Response: ${text}`);
      } else {
        const json = JSON.parse(text);
        console.log(`Success: values count:`, json.data?.values?.length);
      }
    } catch (e: any) {
      console.error(e.message);
    }
  }
}

run().catch(console.error);
