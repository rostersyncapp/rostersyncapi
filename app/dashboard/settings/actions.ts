'use server';

import { createClient } from '@/utils/supabase/server';
import { encryptCredentials, decryptCredentials } from './crypto-utils';
import { revalidatePath } from 'next/cache';

const ENCRYPTION_KEY = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';

async function extractSessionToken(response: Response): Promise<string | null> {
  try {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/JSESSIONID=([^;]+)/i);
      if (match) return match[1];
    }

    const body = await response.json() as any;
    if (body) {
      const token = body.data?.jsessionid || body.jsessionid || body.data?.sessionToken || body.sessionToken;
      if (token) return token;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function resolveCatDVEndpoint(
  baseUrl: string,
  path: string,
  options: RequestInit
): Promise<{ response: Response; resolvedUrl: string; sessionToken: string | null }> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl
    .replace(/\/api\/v1\/(login|session)\/?$/, '')
    .replace(/\/api\/(login|session)\/?$/, '')
    .replace(/\/(login|session)\/?$/, '');

  const candidates = [
    normalizedBaseUrl,
    normalizedBaseUrl.replace(/\/server\/?$/, ''),
    normalizedBaseUrl.endsWith('/') ? normalizedBaseUrl + 'catdv' : normalizedBaseUrl + '/catdv',
  ];

  const pathVariations = [cleanPath];
  if (cleanPath.startsWith('/api/v1/')) {
    const suffix = cleanPath.substring(7); // e.g. /login or /fields
    pathVariations.push(
      `/api/9${suffix}`,
      `/api/8${suffix}`,
      `/api/7${suffix}`,
      `/api${suffix}`,
      `/api/v2${suffix}`
    );
  }

  let lastError: any = null;
  for (const p of pathVariations) {
    for (const base of candidates) {
      const targetUrl = `${base}${p}`;
      try {
        console.log(`[CatDV Probe] Trying URL: ${targetUrl}`);
        const res = await fetch(targetUrl, options);
        if (res.ok) {
          const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
          return { response: res, resolvedUrl: targetUrl, sessionToken };
        }
        if (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503) {
          const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
          return { response: res, resolvedUrl: targetUrl, sessionToken };
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (cleanPath.endsWith('/login') || cleanPath.endsWith('/session')) {
    // Try POST/GET to /session versioned
    const sessionVariations = pathVariations.map(p => p.replace(/\/(login|session)$/, '/session'));
    for (const p of sessionVariations) {
      for (const base of candidates) {
        const targetUrl = `${base}${p}`;
        try {
          console.log(`[CatDV Session Probe] Trying URL: ${targetUrl}`);
          const res = await fetch(targetUrl, options);
          if (res.ok || (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503)) {
            const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
            return { response: res, resolvedUrl: targetUrl, sessionToken };
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    // Try GET to /session?usr=...&pwd=... versioned
    let username = '';
    let password = '';
    const authHeader = (options.headers as any)?.['Authorization'] || (options.headers as any)?.['authorization'];
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const base64Str = authHeader.substring(6);
        const credentialsStr = Buffer.from(base64Str, 'base64').toString('utf8');
        const parts = credentialsStr.split(':');
        username = parts[0];
        password = parts.slice(1).join(':');
      } catch (e) {
        // ignore
      }
    }

    if (username && password) {
      const queryVariations = sessionVariations.map(p => `${p}?usr=${encodeURIComponent(username)}&pwd=${encodeURIComponent(password)}`);
      for (const p of queryVariations) {
        for (const base of candidates) {
          const targetUrl = `${base}${p}`;
          try {
            console.log(`[CatDV Query Session Probe] Trying URL: ${targetUrl}`);
            const res = await fetch(targetUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            if (res.ok || (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503)) {
              const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
              return { response: res, resolvedUrl: targetUrl, sessionToken };
            }
          } catch (err) {
            lastError = err;
          }
        }
      }
    }
  }

  throw lastError || new Error(`CatDV resource not found (404) at any of the candidate endpoints under ${baseUrl}`);
}

export async function getDAMConnections() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('dam_connections')
    .select('*')
    .eq('organization_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching DAM connections:', error);
    throw new Error('Failed to fetch DAM connections');
  }

  // Mask credentials before returning to client, keeping non-sensitive ones visible
  const mapped = [];
  for (const conn of data) {
    const masked: Record<string, string> = {};
    if (conn.credentials_encrypted && conn.credentials_iv) {
      try {
        const decrypted = await decryptCredentials(conn.credentials_encrypted, conn.credentials_iv, ENCRYPTION_KEY);
        Object.keys(decrypted).forEach((key) => {
          if (['password', 'auth_token', 'secret_key', 'oauth_token', 'refresh_token'].includes(key)) {
            masked[key] = '********';
          } else {
            masked[key] = decrypted[key];
          }
        });
      } catch (err) {
        console.error('Error decrypting credentials for listing:', err);
        masked.placeholder = '********';
      }
    }
    mapped.push({
      ...conn,
      credentials: masked,
    });
  }
  return mapped;
}

export async function saveDAMConnection(
  connectionId: string | null,
  payload: {
    name: string;
    provider: 'catdv' | 'iconik' | 'webhook' | 'google_sheets';
    credentials: Record<string, string>;
    base_url?: string;
    endpoint_url?: string;
    active?: boolean;
    leagues?: string[];
    teams?: string[];
    seasons?: string[];
  }
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  let finalCredentials = { ...payload.credentials };

  // If editing and credentials are unchanged (flagged by '********' placeholder), keep existing
  if (connectionId && Object.values(finalCredentials).some(val => val === '********')) {
    const { data: existing, error: existingError } = await supabase
      .from('dam_connections')
      .select('credentials_encrypted, credentials_iv')
      .eq('id', connectionId)
      .eq('organization_id', user.id)
      .single();

    if (existingError || !existing) {
      throw new Error('Existing connection not found');
    }

    // Keep existing encryption
    const { credentials_encrypted, credentials_iv } = existing;
    const decrypted = await decryptCredentials(credentials_encrypted, credentials_iv, ENCRYPTION_KEY);
    
    // Merge new entries over existing decrypted values, but preserve unchanged fields
    Object.keys(finalCredentials).forEach((key) => {
      if (finalCredentials[key] === '********') {
        finalCredentials[key] = decrypted[key];
      }
    });
  }

  // Encrypt the credentials
  const { encrypted, iv } = await encryptCredentials(finalCredentials, ENCRYPTION_KEY);

  const dbPayload = {
    organization_id: user.id,
    name: payload.name,
    provider: payload.provider,
    credentials_encrypted: encrypted,
    credentials_iv: iv,
    base_url: payload.base_url || null,
    endpoint_url: payload.endpoint_url || null,
    active: payload.active !== undefined ? payload.active : false,
    leagues: payload.leagues || [],
    teams: payload.teams || [],
    seasons: payload.seasons || [],
    updated_at: new Date().toISOString(),
  };

  if (connectionId) {
    const { error } = await supabase
      .from('dam_connections')
      .update(dbPayload)
      .eq('id', connectionId)
      .eq('organization_id', user.id);

    if (error) {
      console.error('Error updating connection:', error);
      throw new Error('Failed to update DAM connection');
    }
  } else {
    const { error } = await supabase
      .from('dam_connections')
      .insert({
        ...dbPayload,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting connection:', error);
      throw new Error('Failed to create DAM connection');
    }
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteDAMConnection(connectionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('dam_connections')
    .delete()
    .eq('id', connectionId)
    .eq('organization_id', user.id);

  if (error) {
    console.error('Error deleting connection:', error);
    throw new Error('Failed to delete DAM connection');
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function testDAMConnection(connectionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: connection, error: connError } = await supabase
    .from('dam_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('organization_id', user.id)
    .single();

  if (connError || !connection) {
    throw new Error('Connection not found');
  }

  let credentials: Record<string, string>;
  try {
    credentials = await decryptCredentials(
      connection.credentials_encrypted,
      connection.credentials_iv,
      ENCRYPTION_KEY
    );
  } catch (err) {
    console.error('Decryption failed:', err);
    return { success: false, error: 'Failed to decrypt credentials' };
  }

  let testSuccess = false;
  let errorMessage = '';

  if (connection.provider === 'iconik') {
    const appId = credentials.app_id;
    const authToken = credentials.auth_token;
    const baseUrl = connection.base_url || 'https://app.iconik.io';

    try {
      const res = await fetch(`${baseUrl}/api/users/v1/users/`, {
        headers: {
          'App-Id': appId,
          'Auth-Token': authToken,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        testSuccess = true;
      } else {
        errorMessage = `Iconik API returned status ${res.status}: ${await res.text()}`;
      }
    } catch (err: any) {
      errorMessage = `Failed to connect to Iconik: ${err.message}`;
    }
  } else if (connection.provider === 'catdv') {
    const baseUrl = connection.base_url;
    const username = credentials.username;
    const password = credentials.password;

    if (!baseUrl) {
      errorMessage = 'CatDV requires a Server URL.';
    } else {
      try {
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        const authHeader = `Basic ${authString}`;
        const { response: res } = await resolveCatDVEndpoint(baseUrl, '/api/v1/login', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          testSuccess = true;
        } else {
          errorMessage = `CatDV API returned status ${res.status}: ${await res.text()}`;
        }
      } catch (err: any) {
        errorMessage = `Failed to connect to CatDV: ${err.message}`;
      }
    }
  } else if (connection.provider === 'webhook') {
    const endpointUrl = connection.endpoint_url;
    if (!endpointUrl) {
      errorMessage = 'Webhook connection requires a Webhook URL.';
    } else {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const payload = {
          event: 'ping',
          timestamp: new Date().toISOString(),
          connection_id: connection.id,
        };

        const secretKey = credentials.secret_key;
        if (secretKey) {
          // HMAC SHA-256 signature generation in Node.js
          const crypto = require('crypto');
          const signature = crypto
            .createHmac('sha256', secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Webhook-Signature'] = signature;
        }

        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok || res.status === 200 || res.status === 204) {
          testSuccess = true;
        } else {
          errorMessage = `Webhook returned status ${res.status}`;
        }
      } catch (err: any) {
        errorMessage = `Failed to connect to Webhook URL: ${err.message}`;
      }
    }
  } else if (connection.provider === 'google_sheets') {
    const spreadsheetId = credentials.spreadsheet_id;
    if (!spreadsheetId) {
      errorMessage = 'Google Sheets requires a Spreadsheet ID.';
    } else {
      testSuccess = true;
    }
  }

  // Save results back to db
  const { error: updateError } = await supabase
    .from('dam_connections')
    .update({
      active: testSuccess,
      last_error: testSuccess ? null : errorMessage,
      last_sync_at: testSuccess ? new Date().toISOString() : connection.last_sync_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('organization_id', user.id);

  if (updateError) {
    console.error('Error updating status after test:', updateError);
  }

  revalidatePath('/dashboard/settings');
  return { success: testSuccess, error: testSuccess ? null : errorMessage };
}

export async function getFieldMappings() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('field_mappings')
    .select('*')
    .eq('organization_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching field mappings:', error);
    throw new Error('Failed to fetch field mappings');
  }

  return data;
}

export async function saveFieldMappings(
  connectorType: 'iconik' | 'catdv' | 'webhook' | 'google_sheets',
  mappings: Array<{ source_field: string; target_field: string }>
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Delete existing active field mappings for this connector
  const { error: deleteError } = await supabase
    .from('field_mappings')
    .delete()
    .eq('organization_id', user.id)
    .eq('connector_type', connectorType);

  if (deleteError) {
    console.error('Error deleting old field mappings:', deleteError);
    throw new Error('Failed to update field mappings');
  }

  // Insert new mappings
  if (mappings.length > 0) {
    const insertPayload = mappings.map((m) => ({
      organization_id: user.id,
      connector_type: connectorType,
      source_field: m.source_field,
      target_field: m.target_field,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('field_mappings')
      .insert(insertPayload);

    if (insertError) {
      console.error('Error inserting new field mappings:', insertError);
      throw new Error('Failed to insert new field mappings');
    }
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}



export async function getDeliveryLogs(connectionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // First verify the connection belongs to the organization
  const { data: connection, error: connError } = await supabase
    .from('dam_connections')
    .select('id')
    .eq('id', connectionId)
    .eq('organization_id', user.id)
    .maybeSingle();

  if (connError || !connection) {
    throw new Error('Unauthorized or Connection not found');
  }

  const { data, error } = await supabase
    .from('dam_delivery_log')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching delivery logs:', error);
    throw new Error('Failed to fetch delivery logs');
  }

  return data;
}

export async function triggerDAMSync(connectionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // First verify the connection belongs to the organization
  const { data: connection, error: connError } = await supabase
    .from('dam_connections')
    .select('id, active')
    .eq('id', connectionId)
    .eq('organization_id', user.id)
    .maybeSingle();

  if (connError || !connection) {
    throw new Error('Unauthorized or Connection not found');
  }

  // Enqueue a dam_connector task
  const { error: enqueueError } = await supabase
    .from('job_queue')
    .insert({
      task_type: 'dam_connector',
      payload: {
        connection_id: connectionId,
        organization_id: user.id,
        sync_type: 'manual_full_sync'
      }
    });

  if (enqueueError) {
    console.error('Error enqueuing manual DAM sync:', enqueueError);
    throw new Error('Failed to trigger sync: ' + enqueueError.message);
  }

  return { success: true };
}



