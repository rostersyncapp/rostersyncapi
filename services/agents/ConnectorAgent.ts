import { Agent } from './Agent.ts';
import { supabase } from '../supabase.ts';
import { decryptCredentials, encryptCredentials } from '../../app/dashboard/settings/crypto-utils.ts';

export interface DAMMapping {
  source_field: string;
  target_field: string;
}

export interface ConnectorConfig {
  connector_type: 'iconik' | 'catdv' | 'generic';
  organization_id: string;
  api_key_secret_id: string; // The UUID of the secret in vault.secrets
  base_url?: string;
}

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

export async function resolveCatDVEndpoint(
  baseUrl: string,
  path: string,
  options: RequestInit
): Promise<{ response: Response; resolvedUrl: string; sessionToken: string | null }> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl
    .replace(/\/api\/v1\/(login|session)\/?$/, '')
    .replace(/\/api\/(login|session)\/?$/, '')
    .replace(/\/(login|session)\/?$/, '')
    .replace(/\/+$/, ''); // Strip trailing slashes to prevent double slashes in paths

  const candidates = [
    normalizedBaseUrl,
    normalizedBaseUrl,
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
        
        // Probe WITHOUT authorization first to avoid creating sessions on 404/invalid paths
        const probeHeaders = { ...options.headers };
        delete (probeHeaders as any)['Authorization'];
        delete (probeHeaders as any)['authorization'];
        
        const probeRes = await fetch(targetUrl, {
          ...options,
          headers: probeHeaders
        });

        // If the endpoint is valid (returns 401, 403, 200 etc. but NOT 404/500/502/503)
        if (probeRes.status !== 404 && probeRes.status !== 500 && probeRes.status !== 502 && probeRes.status !== 503) {
          console.log(`[CatDV Probe] Valid endpoint found: ${targetUrl} (Status: ${probeRes.status}). Authenticating...`);
          const res = await fetch(targetUrl, options);
          
          if (res.ok || (res.status !== 404 && res.status !== 500 && res.status !== 502 && res.status !== 503)) {
            // Clone and inspect body if it's JSON to check status
            const clonedRes = res.clone();
            try {
              const body = await clonedRes.json();
              if (body && typeof body === 'object' && body.status && body.status !== 'OK') {
                console.log(`[CatDV Probe] Response has error status: ${body.status} - ${body.errorMessage || ''}`);
                lastError = new Error(`CatDV API error: ${body.status} - ${body.errorMessage || ''}`);
                continue;
              }
            } catch (e) {
              // Ignore parse errors, response might not be JSON or might be empty
            }

            const sessionToken = typeof res.clone === 'function' ? await extractSessionToken(res.clone()) : null;
            return { response: res, resolvedUrl: targetUrl, sessionToken };
          }
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

/**
 * ConnectorAgent (Tier 3)
 * Handles enterprise metadata delivery to DAMs and Broadcast systems.
 */
export class ConnectorAgent extends Agent {
  private catdvSessionToken: string | null = null;
  private catdvFieldsList: any[] | null = null;
  private catdvApiBase: string | null = null;
  
  /**
   * Synchronizes an athlete's enriched metadata to a customer's DAM.
   */
  async syncAthleteToDAM(organizationId: string, playerName: string, connectorType: string): Promise<any> {
    console.log(`[Connector] 🔄 Starting sync for ${playerName} to ${connectorType} (Org: ${organizationId})`);

    try {
      // 1. Fetch Enrichment Data
      const { data: enrichment, error: enrichmentError } = await supabase
        .from('global_player_enrichment')
        .select('*')
        .eq('player_name', playerName)
        .single();

      if (enrichmentError || !enrichment) {
        throw new Error(`Enrichment data not found for ${playerName}`);
      }

      // 2. Fetch Active Connection Details
      const { data: connection, error: connError } = await supabase
        .from('dam_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('provider', connectorType)
        .eq('active', true)
        .maybeSingle();

      if (connError) {
        console.error('[Connector] Error querying connection:', connError);
      }

      let credentials: Record<string, string> = {};
      let baseUrl = connection?.base_url || undefined;

      if (connection && connection.credentials_encrypted && connection.credentials_iv) {
        // Decrypt credentials
        const encryptionKey = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';
        try {
          credentials = await decryptCredentials(
            connection.credentials_encrypted,
            connection.credentials_iv,
            encryptionKey
          );
        } catch (err: any) {
          console.error('[Connector] Failed to decrypt connection credentials:', err.message);
        }
      } else {
        // Fallback: Retrieve API Key from Supabase Vault (legacy)
        console.log('[Connector] No encrypted credentials found in connection row. Falling back to Vault.');
        const apiKey = await this.getVaultSecret(organizationId, connectorType);
        if (apiKey) {
          credentials = { api_key: apiKey };
        }
      }

      if (!credentials || Object.keys(credentials).length === 0) {
        throw new Error(`Missing credentials/API Key for ${connectorType}`);
      }

      // 3. Fetch Field Mappings
      const { data: mappings, error: mappingError } = await supabase
        .from('field_mappings')
        .select('source_field, target_field')
        .eq('organization_id', organizationId)
        .eq('connector_type', connectorType)
        .eq('is_active', true);

      if (mappingError || !mappings || mappings.length === 0) {
        console.warn(`[Connector] 🟡 No active field mappings found for ${connectorType}. Using default mapping.`);
      }

      // 4. Prepare Payload
      const payload: Record<string, any> = {};
      if (mappings && mappings.length > 0) {
        mappings.forEach(m => {
          payload[m.target_field] = enrichment[m.source_field as keyof typeof enrichment];
        });
      } else {
        // Default Mapping
        payload.full_name = enrichment.player_name;
        payload.phonetic_ipa = enrichment.ipa_name;
        payload.phonetic_simplified = enrichment.phonetic_name;
        payload.mandarin_name = enrichment.chinese_name;
      }

      // 5. Execute DAM-specific Push
      return await this.pushToExternalAPI(connectorType, payload, credentials, baseUrl);

    } catch (err: any) {
      console.error(`[Connector] ❌ Sync Failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Helper to retrieve secrets from Supabase Vault via secure RPC.
   */
  private async getVaultSecret(organizationId: string, connectorType: string): Promise<string | null> {
    console.log(`[Vault] 🔒 Retrieving secure secret for ${connectorType}...`);
    
    const { data, error } = await supabase.rpc('get_connector_secret', { 
      org_id: organizationId, 
      service_name: connectorType 
    });

    if (error) {
      console.error(`[Vault] ❌ Secret retrieval failed: ${error.message}`);
      return null;
    }

    return data;
  }

  private cleanNullKeys(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanNullKeys(item));
    }
    if (typeof obj === 'object') {
      const cleanObj: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== null && val !== undefined) {
          cleanObj[key] = this.cleanNullKeys(val);
        }
      }
      return cleanObj;
    }
    return obj;
  }

  private async pushToExternalAPI(
    type: string,
    payload: any,
    credentials: Record<string, string>,
    baseUrl?: string
  ): Promise<any> {
    console.log(`[Connector] 🚀 Pushing payload to ${type}...`);
    
    if (type === 'iconik') {
      const appId = credentials.app_id;
      const authToken = credentials.auth_token;
      const host = baseUrl || 'https://app.iconik.io';

      if (!appId || !authToken) {
        throw new Error('Iconik credentials must include app_id and auth_token');
      }

      const results: Record<string, any> = {};
      
      for (const fieldName of Object.keys(payload)) {
        const value = payload[fieldName];
        if (!value) continue;

        try {
          const fieldUrl = `${host}/api/metadata/v1/fields/${fieldName}/`;
          console.log(`[Iconik] Fetching field metadata for "${fieldName}"...`);
          
          // A. Fetch current metadata field definition
          const getRes = await fetch(fieldUrl, {
            method: 'GET',
            headers: {
              'App-Id': appId,
              'Auth-Token': authToken,
              'Accept': 'application/json'
            }
          });

          if (!getRes.ok) {
            if (getRes.status === 404) {
              console.log(`[Iconik] Field "${fieldName}" does not exist. Creating new dropdown field...`);
              
              const newFieldConfig = {
                field_type: 'drop_down',
                name: fieldName,
                label: fieldName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                options: [
                  { label: value, value: value }
                ],
                use_as_facet: true,
                multi: true
              };

              const postRes = await fetch(`${host}/api/metadata/v1/fields/`, {
                method: 'POST',
                headers: {
                  'App-Id': appId,
                  'Auth-Token': authToken,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(newFieldConfig)
              });

              if (!postRes.ok) {
                const errMsg = await postRes.text();
                console.error(`[Iconik] Failed to create metadata field "${fieldName}" (Status: ${postRes.status}):`, errMsg);
                results[fieldName] = { status: 'failed', message: `Create field returned status ${postRes.status}: ${errMsg}` };
                continue;
              }

              console.log(`[Iconik] Field "${fieldName}" created successfully with initial option "${value}".`);
              results[fieldName] = { status: 'success', message: 'Created field with option' };
              continue;
            } else {
              console.warn(`[Iconik] Failed to fetch metadata field "${fieldName}" (Status: ${getRes.status})`);
              results[fieldName] = { status: 'failed', message: `Fetch field returned status ${getRes.status}` };
              continue;
            }
          }

          const fieldConfig = await getRes.json();
          
          if (fieldConfig.field_type !== 'drop_down') {
            console.warn(`[Iconik] Field "${fieldName}" is not a drop_down field. Skipping option sync.`);
            results[fieldName] = { status: 'skipped', message: 'Not a drop_down field' };
            continue;
          }

          // B. Check if option already exists
          const options = fieldConfig.options || [];
          const exists = options.some((opt: any) => opt.value === value);

          if (!exists) {
            options.push({ label: value, value: value });
          }

          // SAFEGUARD: Guarantee we never overwrite, delete, or shrink the existing options list
          const existingCount = (fieldConfig.options || []).length;
          if (options.length < existingCount) {
            throw new Error(`Iconik Safeguard Blocked: Attempted to shrink options array for field ${fieldName} (existing: ${existingCount}, new: ${options.length})`);
          }

          const originalJson = JSON.stringify(options);

          // Sort options by last name (surname)
          options.sort((a: any, b: any) => {
            const getLastName = (name: string) => {
              const parts = (name || '').trim().split(/\s+/);
              return parts[parts.length - 1] || '';
            };
            const lastNameA = getLastName(a.label).toLowerCase();
            const lastNameB = getLastName(b.label).toLowerCase();
            if (lastNameA === lastNameB) {
              return (a.label || '').localeCompare(b.label || '');
            }
            return lastNameA.localeCompare(lastNameB);
          });

          const sortedJson = JSON.stringify(options);

          // Update if the option is new or if sorting changed the order
          if (!exists || originalJson !== sortedJson) {
            if (!exists) {
              console.log(`[Iconik] Adding option "${value}" to field "${fieldName}" and sorting by last name...`);
            } else {
              console.log(`[Iconik] Re-sorting options by last name for field "${fieldName}"...`);
            }
            
            // Clean the payload to remove any null fields rejected by Iconik
            const cleanedFieldConfig = this.cleanNullKeys(fieldConfig);
            // Merge the updated+sorted options back in before sending the PUT
            cleanedFieldConfig.options = options;

            // C. Update field options
            const putRes = await fetch(fieldUrl, {
              method: 'PUT',
              headers: {
                'App-Id': appId,
                'Auth-Token': authToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(cleanedFieldConfig)
            });

            if (!putRes.ok) {
              const putErrText = await putRes.text();
              console.error(`[Iconik] Failed to update metadata field "${fieldName}" (Status: ${putRes.status}):`, putErrText);
              results[fieldName] = { status: 'failed', message: `Update field returned status ${putRes.status}: ${putErrText}` };
              continue;
            }

            console.log(`[Iconik] Field "${fieldName}" updated and sorted successfully.`);
            results[fieldName] = { status: 'success', message: exists ? 'Sorted existing options' : 'Added option and sorted' };
          } else {
            console.log(`[Iconik] Option "${value}" already exists and field "${fieldName}" is already sorted.`);
            results[fieldName] = { status: 'success', message: 'Option exists and sorted' };
          }
        } catch (fieldErr: any) {
          console.error(`[Iconik] Error syncing field "${fieldName}":`, fieldErr.message);
          results[fieldName] = { status: 'failed', message: fieldErr.message };
        }
      }

      return { status: 'success', system: 'iconik', results };
    }

    if (type === 'catdv') {
      const username = credentials.username;
      const password = credentials.password;
      const host = baseUrl;

      if (!host) {
        throw new Error('CatDV Server URL must be specified');
      }
      if (!username || !password) {
        throw new Error('CatDV credentials must include username and password');
      }

      console.log('DEBUG credentials in worker:', { username, passwordLength: password ? password.length : 0, passwordFirstChar: password ? password[0] : null });

      const authString = Buffer.from(`${username}:${password}`).toString('base64');
      const authHeader = `Basic ${authString}`;
      console.log('DEBUG authHeader in pushToExternalAPI:', authHeader);

      let apiBase = this.catdvApiBase;
      let sessionToken = this.catdvSessionToken;

      if (!this.catdvFieldsList) {
        console.log(`[CatDV] Fetching field definitions to locate groups...`);
        const { response: fieldsRes, resolvedUrl: fieldsUrl, sessionToken: newToken } = await resolveCatDVEndpoint(host, '/api/v1/fields', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });

        if (!fieldsRes.ok) {
          throw new Error(`Failed to fetch CatDV field definitions (Status: ${fieldsRes.status})`);
        }

        // Extract correct API base from fieldsUrl (removes /fields from the end)
        apiBase = fieldsUrl.replace(/\/fields$/, '');
        this.catdvApiBase = apiBase;

        const fieldsData = await fieldsRes.json();
        this.catdvFieldsList = fieldsData.data?.items || fieldsData.data || [];

        sessionToken = newToken;
        this.catdvSessionToken = sessionToken;
      }

      const fieldsList = this.catdvFieldsList || [];

      const results: Record<string, any> = {};

      for (const fieldName of Object.keys(payload)) {
        const value = payload[fieldName];
        if (!value) continue;

        // Find the field in the list of field definitions
        const fieldDef = fieldsList.find((f: any) => 
          f.id === fieldName || 
          f.name === fieldName ||
          f.identifier === fieldName ||
          f.ID === fieldName ||
          f.id?.toLowerCase() === fieldName.toLowerCase() ||
          f.name?.toLowerCase() === fieldName.toLowerCase() ||
          f.identifier?.toLowerCase() === fieldName.toLowerCase() ||
          f.ID?.toLowerCase() === fieldName.toLowerCase()
        );
        let currentFieldDef = fieldDef;
        if (!currentFieldDef) {
          console.log(`[CatDV] Field "${fieldName}" not found. Creating field definition...`);
          const defaultGroup = fieldsList[0]?.fieldGroupID || fieldsList[0]?.fieldGroupId || fieldsList[0]?.groupId || '1';
          const fieldsUrl = `${apiBase}/fields`;

          try {
            const postRes = await fetch(fieldsUrl, {
              method: 'POST',
              headers: sessionToken ? {
                'Cookie': `JSESSIONID=${sessionToken}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
              } : {
                'Authorization': authHeader,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                name: fieldName,
                identifier: fieldName,
                fieldType: 'picklist',
                isCustom: true,
                fieldGroupID: defaultGroup
              })
            });

            if (!postRes.ok) {
              const errMsg = await postRes.text();
              console.error(`[CatDV] Failed to create metadata field "${fieldName}" (Status: ${postRes.status}):`, errMsg);
              results[fieldName] = { status: 'failed', message: `Create field returned status ${postRes.status}: ${errMsg}` };
              continue;
            }

            const createdField = await postRes.json() as any;
            currentFieldDef = createdField.data || createdField;
            fieldsList.push(currentFieldDef);
            console.log(`[CatDV] Created metadata field "${fieldName}" successfully.`);
          } catch (createErr: any) {
            console.error(`[CatDV] Error creating field "${fieldName}":`, createErr.message);
            results[fieldName] = { status: 'failed', message: `Failed to create field: ${createErr.message}` };
            continue;
          }
        }

        const fieldId = currentFieldDef.ID || currentFieldDef.id;
        const groupId = currentFieldDef.fieldGroupID || currentFieldDef.fieldGroupId || currentFieldDef.groupId || '';

        try {
          // Fetch the current picklist values
          const listUrl = `${apiBase}/fields/${fieldId}/list?include=values${groupId ? `&groupID=${groupId}` : ''}`;
          console.log(`[CatDV] Fetching picklist for "${fieldName}" (${fieldId})...`);
          
          let listRes: Response | null = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            listRes = await fetch(listUrl, {
              method: 'GET',
              headers: sessionToken ? {
                'Cookie': `JSESSIONID=${sessionToken}`,
                'Accept': 'application/json'
              } : {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            });

            if (listRes.ok) {
              break;
            }

            if (listRes.status === 500 && attempt < 3) {
              console.warn(`[CatDV] Fetch picklist returned 500 on attempt ${attempt}. Retrying in 500ms...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              break;
            }
          }

          if (!listRes || !listRes.ok) {
            const status = listRes ? listRes.status : 'unknown';
            const errText = listRes ? await listRes.text() : 'No response';
            console.error(`[CatDV] Failed to fetch picklist for "${fieldName}" (Status: ${status}): ${errText}`);
            results[fieldName] = { status: 'failed', message: `Fetch picklist returned status ${status}: ${errText}` };
            continue;
          }

          const listData = await listRes.json();
          const picklistData = listData.data || listData;
          let currentValues: string[] = [];

          if (Array.isArray(picklistData)) {
            currentValues = picklistData;
          } else if (picklistData && Array.isArray(picklistData.values)) {
            currentValues = picklistData.values;
          } else if (picklistData && Array.isArray(picklistData.items)) {
            currentValues = picklistData.items;
          }

          // Check if option already exists
          const exists = currentValues.some((val: string) => val === value);
          const updatedValues = [...currentValues];
          if (!exists) {
            updatedValues.push(value);
          }

          // Sort updated values by last name or alphabetically
          updatedValues.sort((a: string, b: string) => {
            const getLastName = (name: string) => {
              const parts = (name || '').trim().split(/\s+/);
              return parts[parts.length - 1] || '';
            };
            const lastNameA = getLastName(a).toLowerCase();
            const lastNameB = getLastName(b).toLowerCase();
            if (lastNameA === lastNameB) {
              return a.localeCompare(b);
            }
            return lastNameA.localeCompare(lastNameB);
          });

          // Safeguard: Guarantee we never shrink options array
          if (updatedValues.length < currentValues.length) {
            throw new Error(`CatDV Safeguard Blocked: Attempted to shrink options array for field ${fieldName}`);
          }

          const originalJson = JSON.stringify(currentValues);
          const sortedJson = JSON.stringify(updatedValues);

          if (!exists || originalJson !== sortedJson) {
            console.log(`[CatDV] Updating picklist for "${fieldName}" with option "${value}"...`);
            
            let putBody: any;
            if (Array.isArray(picklistData)) {
              putBody = updatedValues;
            } else {
              putBody = {
                ...picklistData,
                values: updatedValues
              };
            }

            const putUrl = `${apiBase}/fields/${fieldId}/list${groupId ? `?groupID=${groupId}` : ''}`;
            const putRes = await fetch(putUrl, {
              method: 'PUT',
              headers: sessionToken ? {
                'Cookie': `JSESSIONID=${sessionToken}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
              } : {
                'Authorization': authHeader,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
              },
              body: JSON.stringify(putBody)
            });

            if (!putRes.ok) {
              const errMsg = await putRes.text();
              console.error(`[CatDV] Failed to update picklist for "${fieldName}" (Status: ${putRes.status}):`, errMsg);
              results[fieldName] = { status: 'failed', message: `Update picklist returned status ${putRes.status}: ${errMsg}` };
              continue;
            }

            console.log(`[CatDV] Picklist for "${fieldName}" updated successfully.`);
            results[fieldName] = { status: 'success', message: exists ? 'Sorted existing options' : 'Added option and sorted' };
          } else {
            console.log(`[CatDV] Option "${value}" already exists in picklist for "${fieldName}".`);
            results[fieldName] = { status: 'success', message: 'Option exists and sorted' };
          }

        } catch (fieldErr: any) {
          console.error(`[CatDV] Error syncing field "${fieldName}":`, fieldErr.message);
          results[fieldName] = { status: 'failed', message: fieldErr.message };
        }
      }

      return { status: 'success', system: 'catdv', results };
    }

    // Default generic push logging
    console.log(`[Connector] Payload:`, JSON.stringify(payload, null, 2));
    return { status: 'success', system: 'generic', message: 'Payload logged' };
  }

  /**
   * Performs a full sync of all scoped rosters for a given DAM connection.
   */
  async syncConnectionToDAM(connectionId: string, targetTeamId?: string, targetSeason?: number): Promise<{ success: boolean; totalSuccess: number; totalFailed: number }> {
    console.log(`[Connector] 🔄 Starting sync for Connection: ${connectionId} (targetTeamId: ${targetTeamId || 'none'}, targetSeason: ${targetSeason || 'none'})`);

    try {
      // 1. Fetch Connection Details
      const { data: connection, error: connError } = await supabase
        .from('dam_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      // Decrypt credentials
      const encryptionKey = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';
      let credentials: Record<string, string> = {};
      if (connection.credentials_encrypted && connection.credentials_iv) {
        credentials = await decryptCredentials(
          connection.credentials_encrypted,
          connection.credentials_iv,
          encryptionKey
        );
      } else {
        throw new Error(`Credentials not found for connection ${connectionId}`);
      }

      // Reset cache for this sync run
      this.catdvFieldsList = null;
      this.catdvSessionToken = null;
      this.catdvApiBase = null;

      // Pre-fetch CatDV field definitions once to avoid loop-based probing and session exhaustion
      if (connection.provider === 'catdv') {
        const username = credentials.username;
        const password = credentials.password;
        const host = connection.base_url;
        if (!host) {
          throw new Error('CatDV Server URL must be specified');
        }
        if (!username || !password) {
          throw new Error('CatDV credentials must include username and password');
        }
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        const authHeader = `Basic ${authString}`;
        
        console.log(`[CatDV] Pre-fetching field definitions at start of sync...`);
        const { response: fieldsRes, resolvedUrl: fieldsUrl, sessionToken: newToken } = await resolveCatDVEndpoint(host, '/api/v1/fields', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });

        if (!fieldsRes.ok) {
          throw new Error(`Failed to fetch CatDV field definitions (Status: ${fieldsRes.status})`);
        }

        this.catdvApiBase = fieldsUrl.replace(/\/fields$/, '');
        const fieldsData = await fieldsRes.json();
        
        // Handle potential error status in body
        if (fieldsData && fieldsData.status && fieldsData.status !== 'OK') {
          throw new Error(`CatDV API error: ${fieldsData.status} - ${fieldsData.errorMessage || ''}`);
        }
        
        this.catdvFieldsList = fieldsData.data?.items || fieldsData.data || [];
        this.catdvSessionToken = newToken;
        console.log(`[CatDV] Pre-fetched ${this.catdvFieldsList?.length || 0} fields successfully. API Base: ${this.catdvApiBase}`);
      }

      // 2. Fetch Field Mappings
      const { data: mappings, error: mappingError } = await supabase
        .from('field_mappings')
        .select('source_field, target_field')
        .eq('organization_id', connection.organization_id)
        .eq('connector_type', connection.provider)
        .eq('is_active', true);

      // 3. Resolve Scopes & Fetch Rosters
      let query = supabase.from('reference_rosters').select('*');
      
      if (targetTeamId && targetSeason) {
        // Restrict to single team and season if requested via contextual action
        query = query.eq('team_id', targetTeamId).eq('season_year', targetSeason);
      } else {
        // Filter by league scope if defined
        if (connection.leagues && connection.leagues.length > 0) {
          query = query.in('league_id', connection.leagues);
        }
        
        // Filter by team scope if defined
        if (connection.teams && connection.teams.length > 0) {
          query = query.in('team_id', connection.teams);
        }
      }

      const { data: rosters, error: rostersError } = await query;
      if (rostersError) {
        throw new Error(`Failed to fetch rosters: ${rostersError.message}`);
      }

      // Filter rosters based on connection.seasons scope (only if NOT targeting a specific team/season)
      let currentRosters = rosters || [];
      if (!targetTeamId || !targetSeason) {
        // Fetch current seasons for each league from league_seasons
        const { data: seasonsData } = await supabase
          .from('league_seasons')
          .select('league_id, current_season_year');
        
        const leagueSeasonMap = new Map<string, number>();
        if (seasonsData) {
          seasonsData.forEach(s => {
            leagueSeasonMap.set(s.league_id, s.current_season_year);
          });
        }

        const seasonsScope = connection.seasons || [];
        currentRosters = (rosters || []).filter(roster => {
          if (seasonsScope.includes('all')) {
            return true;
          }
          if (seasonsScope.includes('current') || seasonsScope.length === 0) {
            const currentSeason = leagueSeasonMap.get(roster.league_id);
            return currentSeason ? roster.season_year === currentSeason : true;
          }
          // Match specific season years
          return seasonsScope.includes(roster.season_year.toString());
        });
        console.log(`[Connector] Resolved ${rosters?.length || 0} rosters total. Syncing ${currentRosters.length} rosters based on seasons scope: ${JSON.stringify(seasonsScope)}.`);
      } else {
        console.log(`[Connector] Contextual sync matching specific team ${targetTeamId} and season ${targetSeason}. Resolved ${currentRosters.length} rosters.`);
      }

      let totalSuccess = 0;
      let totalFailed = 0;

      if (currentRosters.length > 0) {
        if (connection.provider === 'google_sheets') {
          for (const roster of currentRosters) {
            const { data: teamData } = await supabase
              .from('teams')
              .select('primary_color, secondary_color, abbreviation, name')
              .eq('id', roster.team_id)
              .maybeSingle();
            const res = await this.syncRosterToGoogleSheets(connectionId, roster, teamData, credentials);
            totalSuccess += res.totalSuccess;
            totalFailed += res.totalFailed;
          }
          await supabase.from('dam_connections').update({
            last_sync_at: new Date().toISOString(),
            last_error: totalFailed > 0 ? `${totalFailed} players failed to sync` : null,
            updated_at: new Date().toISOString()
          }).eq('id', connectionId);
          return { success: true, totalSuccess, totalFailed };
        }
        for (const roster of currentRosters) {
          if (!roster.roster_data || !Array.isArray(roster.roster_data)) continue;

          // Pre-fetch team metadata once per roster (colors, abbreviation, etc.)
          const { data: teamData } = await supabase
            .from('teams')
            .select('primary_color, secondary_color, abbreviation, name')
            .eq('id', roster.team_id)
            .maybeSingle();

          for (const athlete of roster.roster_data) {
            const rawName = athlete.fullName || athlete.name;
            if (!rawName) continue;

            let payload: Record<string, any> = {};
            try {
              // Fetch Enrichment Data
              const { data: enrichment } = await supabase
                .from('global_player_enrichment')
                .select('*')
                .eq('player_name', rawName)
                .maybeSingle();

              // Construct payload
              if (mappings && mappings.length > 0) {
                mappings.forEach(m => {
                  // Team-level fields resolved from teams table
                  if (m.source_field === 'team_primary_color') {
                    payload[m.target_field] = teamData?.primary_color || '';
                  } else if (m.source_field === 'team_secondary_color') {
                    payload[m.target_field] = teamData?.secondary_color || '';
                  } else {
                    const sourceVal = enrichment 
                      ? enrichment[m.source_field as keyof typeof enrichment] 
                      : athlete[m.source_field as keyof typeof athlete];
                    payload[m.target_field] = sourceVal || athlete[m.source_field as keyof typeof athlete] || '';
                  }
                });
              } else {
                // Default Mapping
                payload.full_name = rawName;
                payload.phonetic_ipa = enrichment?.ipa_name || athlete.phoneticIPA || '';
                payload.phonetic_simplified = enrichment?.phonetic_name || athlete.phoneticSimplified || '';
                payload.mandarin_name = enrichment?.chinese_name || athlete.nameMandarin || '';
              }

              // Execute DAM push
              await this.pushToExternalAPI(connection.provider, payload, credentials, connection.base_url || undefined);

              // Log success to dam_delivery_log
              const { error: logErr } = await supabase.from('dam_delivery_log').insert({
                connection_id: connectionId,
                status: 'delivered',
                event: `sync:${rawName}`,
                payload,
                created_at: new Date().toISOString()
              });
              if (logErr) {
                console.error(`[Connector] Failed to write success delivery log for ${rawName}:`, logErr.message);
              }

              totalSuccess++;

              // Add a small delay for CatDV to prevent database lock contention
              if (connection.provider === 'catdv') {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } catch (err: any) {
              console.error(`[Connector] Failed to sync ${rawName} for Connection ${connectionId}:`, err.message);
              
              // Log failure to dam_delivery_log
              const { error: logErr } = await supabase.from('dam_delivery_log').insert({
                connection_id: connectionId,
                status: 'failed',
                event: `sync:${rawName}`,
                payload,
                error_message: err.message,
                created_at: new Date().toISOString()
              });
              if (logErr) {
                console.error(`[Connector] Failed to write failure delivery log for ${rawName}:`, logErr.message);
              }

              totalFailed++;
            }
          }
        }
      }

      // Update connection's last sync time & error status
      await supabase.from('dam_connections').update({
        last_sync_at: new Date().toISOString(),
        last_error: totalFailed > 0 ? `${totalFailed} players failed to sync` : null,
        updated_at: new Date().toISOString()
      }).eq('id', connectionId);

      return { success: true, totalSuccess, totalFailed };
    } catch (err: any) {
      console.error(`[Connector] ❌ Full Sync Failed: ${err.message}`);
      
      // Update connection error
      await supabase.from('dam_connections').update({
        last_error: err.message,
        updated_at: new Date().toISOString()
      }).eq('id', connectionId);

      throw err;
    }
  }

  /**
   * Performs a single roster synchronization for a specific team and season.
   * Optimized for delta sync updates enqueued by the webhook handler.
   */
  async syncRosterToDAM(
    connectionId: string,
    teamId: string,
    seasonYear: number
  ): Promise<{ success: boolean; totalSuccess: number; totalFailed: number }> {
    console.log(`[Connector] 🔄 Delta Sync: syncRosterToDAM (Connection: ${connectionId}, team: ${teamId}, season: ${seasonYear})`);

    try {
      // 1. Fetch Connection Details
      const { data: connection, error: connError } = await supabase
        .from('dam_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      // Decrypt credentials
      const encryptionKey = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';
      let credentials: Record<string, string> = {};
      if (connection.credentials_encrypted && connection.credentials_iv) {
        credentials = await decryptCredentials(
          connection.credentials_encrypted,
          connection.credentials_iv,
          encryptionKey
        );
      } else {
        throw new Error(`Credentials not found for connection ${connectionId}`);
      }

      // Reset cache for this sync run
      this.catdvFieldsList = null;
      this.catdvSessionToken = null;
      this.catdvApiBase = null;

      // Pre-fetch CatDV field definitions once
      if (connection.provider === 'catdv') {
        const username = credentials.username;
        const password = credentials.password;
        const host = connection.base_url;
        if (!host) {
          throw new Error('CatDV Server URL must be specified');
        }
        if (!username || !password) {
          throw new Error('CatDV credentials must include username and password');
        }
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        const authHeader = `Basic ${authString}`;
        
        console.log(`[CatDV] Pre-fetching field definitions at start of sync...`);
        const { response: fieldsRes, resolvedUrl: fieldsUrl, sessionToken: newToken } = await resolveCatDVEndpoint(host, '/api/v1/fields', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });

        if (!fieldsRes.ok) {
          throw new Error(`Failed to fetch CatDV field definitions (Status: ${fieldsRes.status})`);
        }

        this.catdvApiBase = fieldsUrl.replace(/\/fields$/, '');
        const fieldsData = await fieldsRes.json();
        
        if (fieldsData && fieldsData.status && fieldsData.status !== 'OK') {
          throw new Error(`CatDV API error: ${fieldsData.status} - ${fieldsData.errorMessage || ''}`);
        }
        
        this.catdvFieldsList = fieldsData.data?.items || fieldsData.data || [];
        this.catdvSessionToken = newToken;
      }

      // 2. Fetch Field Mappings
      const { data: mappings, error: mappingError } = await supabase
        .from('field_mappings')
        .select('source_field, target_field')
        .eq('organization_id', connection.organization_id)
        .eq('connector_type', connection.provider)
        .eq('is_active', true);

      // 3. Fetch reference roster
      const { data: roster, error: rosterError } = await supabase
        .from('reference_rosters')
        .select('*')
        .eq('team_id', teamId)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (rosterError) {
        throw new Error(`Failed to fetch roster: ${rosterError.message}`);
      }

      if (!roster) {
        console.log(`[Connector] Roster not found for team: ${teamId}, season: ${seasonYear}. Sync skipped.`);
        return { success: true, totalSuccess: 0, totalFailed: 0 };
      }

      let totalSuccess = 0;
      let totalFailed = 0;

      if (roster.roster_data && Array.isArray(roster.roster_data)) {
        if (connection.provider === 'google_sheets') {
          const { data: teamData } = await supabase
            .from('teams')
            .select('primary_color, secondary_color, abbreviation, name')
            .eq('id', teamId)
            .maybeSingle();
          const res = await this.syncRosterToGoogleSheets(connectionId, roster, teamData, credentials);
          await supabase.from('dam_connections').update({
            last_sync_at: new Date().toISOString(),
            last_error: res.totalFailed > 0 ? `${res.totalFailed} players failed to sync` : null,
            updated_at: new Date().toISOString()
          }).eq('id', connectionId);
          return res;
        }
        // Pre-fetch team metadata once (colors, abbreviation, etc.)
        const { data: teamData } = await supabase
          .from('teams')
          .select('primary_color, secondary_color, abbreviation, name')
          .eq('id', teamId)
          .maybeSingle();

        for (const athlete of roster.roster_data) {
          const rawName = athlete.fullName || athlete.name;
          if (!rawName) continue;

          let payload: Record<string, any> = {};
          try {
            // Fetch Enrichment Data
            const { data: enrichment } = await supabase
              .from('global_player_enrichment')
              .select('*')
              .eq('player_name', rawName)
              .maybeSingle();

            // Construct payload
            if (mappings && mappings.length > 0) {
              mappings.forEach(m => {
                if (m.source_field === 'team_primary_color') {
                  payload[m.target_field] = teamData?.primary_color || '';
                } else if (m.source_field === 'team_secondary_color') {
                  payload[m.target_field] = teamData?.secondary_color || '';
                } else {
                  const sourceVal = enrichment 
                    ? enrichment[m.source_field as keyof typeof enrichment] 
                    : athlete[m.source_field as keyof typeof athlete];
                  payload[m.target_field] = sourceVal || athlete[m.source_field as keyof typeof athlete] || '';
                }
              });
            } else {
              payload.full_name = rawName;
              payload.phonetic_ipa = enrichment?.ipa_name || athlete.phoneticIPA || '';
              payload.phonetic_simplified = enrichment?.phonetic_name || athlete.phoneticSimplified || '';
              payload.mandarin_name = enrichment?.chinese_name || athlete.nameMandarin || '';
            }

            // Execute DAM push
            await this.pushToExternalAPI(connection.provider, payload, credentials, connection.base_url || undefined);

            // Log success to dam_delivery_log
            await supabase.from('dam_delivery_log').insert({
              connection_id: connectionId,
              status: 'delivered',
              event: `sync:${rawName}`,
              payload,
              created_at: new Date().toISOString()
            });

            totalSuccess++;

            if (connection.provider === 'catdv') {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (err: any) {
            console.error(`[Connector] Failed to sync ${rawName} for Connection ${connectionId}:`, err.message);
            
            // Log failure to dam_delivery_log
            await supabase.from('dam_delivery_log').insert({
              connection_id: connectionId,
              status: 'failed',
              event: `sync:${rawName}`,
              payload,
              error_message: err.message,
              created_at: new Date().toISOString()
            });

            totalFailed++;
          }
        }
      }

      // Update connection status
      await supabase.from('dam_connections').update({
        last_sync_at: new Date().toISOString(),
        last_error: totalFailed > 0 ? `${totalFailed} players failed to sync` : null,
        updated_at: new Date().toISOString()
      }).eq('id', connectionId);

      return { success: true, totalSuccess, totalFailed };
    } catch (err: any) {
      console.error(`[Connector] ❌ Roster Sync Failed: ${err.message}`);
      
      await supabase.from('dam_connections').update({
        last_error: err.message,
        updated_at: new Date().toISOString()
      }).eq('id', connectionId);

      throw err;
    }
  }

  /**
   * Refreshes the Google OAuth token and saves the updated credentials to the database.
   */
  private async refreshGoogleToken(connectionId: string, credentials: Record<string, string>): Promise<string> {
    console.log(`[Google Sheets] 🔄 Refreshing OAuth token for Connection [${connectionId}]...`);
    
    const clientId = process.env.GOOGLE_CLIENT_ID || 'google-client-id-placeholder';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'google-client-secret-placeholder';
    
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refresh_token || '',
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google token refresh failed: ${response.status} - ${errText}`);
    }

    const data = await response.json() as any;
    if (!data.access_token) {
      throw new Error('Google token refresh response did not contain access_token');
    }

    credentials.oauth_token = data.access_token;
    if (data.refresh_token) {
      credentials.refresh_token = data.refresh_token;
    }

    // Encrypt and update in database
    const encryptionKey = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';
    const { encrypted, iv } = await encryptCredentials(credentials, encryptionKey);
    
    const { error: updateError } = await supabase
      .from('dam_connections')
      .update({
        credentials_encrypted: encrypted,
        credentials_iv: iv,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error(`[Google Sheets] Failed to update refreshed credentials in DB:`, updateError.message);
    } else {
      console.log(`[Google Sheets] Saved refreshed OAuth token successfully in DB.`);
    }

    return credentials.oauth_token;
  }

  /**
   * Helper to perform requests to Google Sheets API, automatically refreshing the OAuth token if we receive a 401.
   */
  private async googleApiRequest(
    connectionId: string,
    credentials: Record<string, string>,
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let token = credentials.oauth_token;
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      console.log(`[Google Sheets] Request returned 401. Refreshing token...`);
      token = await this.refreshGoogleToken(connectionId, credentials);
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    }

    return response;
  }

  /**
   * Synchronizes an entire roster to Google Sheets.
   */
  async syncRosterToGoogleSheets(
    connectionId: string,
    roster: any,
    teamData: any,
    credentials: Record<string, string>
  ): Promise<{ success: boolean; totalSuccess: number; totalFailed: number }> {
    console.log(`[Google Sheets] 🚀 Starting roster sync to Google Sheets for connection: ${connectionId}`);

    let totalSuccess = 0;
    let totalFailed = 0;

    try {
      // 1. Fetch Field Mappings
      const { data: mappings } = await supabase
        .from('field_mappings')
        .select('source_field, target_field')
        .eq('organization_id', roster.organization_id || '')
        .eq('connector_type', 'google_sheets')
        .eq('is_active', true);

      // 2. Resolve spreadsheet ID. If empty, create a new one.
      let spreadsheetId = credentials.spreadsheet_id;
      if (!spreadsheetId) {
        const title = `RosterSync - ${teamData?.name || 'Team'} (${roster.season_year})`;
        console.log(`[Google Sheets] Spreadsheet ID is empty. Creating new spreadsheet: "${title}"`);

        const createRes = await this.googleApiRequest(connectionId, credentials, 'https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            properties: { title }
          })
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`Failed to create spreadsheet: ${createRes.status} - ${errText}`);
        }

        const data = await createRes.json() as any;
        spreadsheetId = data.spreadsheetId;
        console.log(`[Google Sheets] Created spreadsheet with ID: ${spreadsheetId}`);

        credentials.spreadsheet_id = spreadsheetId;
        const encryptionKey = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';
        const { encrypted, iv } = await encryptCredentials(credentials, encryptionKey);
        
        await supabase
          .from('dam_connections')
          .update({
            credentials_encrypted: encrypted,
            credentials_iv: iv,
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);
      }

      // 3. Resolve Sheet (Tab) name
      const sheetName = `${teamData?.name || 'Roster'} (${roster.season_year})`;

      // 4. Verify/Create Sheet (Tab)
      const metaRes = await this.googleApiRequest(connectionId, credentials, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        method: 'GET'
      });

      if (!metaRes.ok) {
        const errText = await metaRes.text();
        throw new Error(`Failed to fetch spreadsheet metadata: ${metaRes.status} - ${errText}`);
      }

      const metaData = await metaRes.json() as any;
      const sheets = metaData.sheets || [];
      const tabExists = sheets.some((s: any) => s.properties?.title === sheetName);

      if (!tabExists) {
        console.log(`[Google Sheets] Creating tab: "${sheetName}"`);
        const addRes = await this.googleApiRequest(connectionId, credentials, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: sheetName }
                }
              }
            ]
          })
        });

        if (!addRes.ok) {
          const errText = await addRes.text();
          throw new Error(`Failed to create sheet tab "${sheetName}": ${addRes.status} - ${errText}`);
        }
      }

      // 5. Read current values
      const readRes = await this.googleApiRequest(connectionId, credentials, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000`, {
        method: 'GET'
      });

      let existingRows: string[][] = [];
      if (readRes.ok) {
        const data = await readRes.json() as any;
        existingRows = data.values || [];
      }

      // Define default or mapped headers
      const headers = mappings && mappings.length > 0
        ? mappings.map(m => m.target_field)
        : ["Player Name", "Jersey", "Position", "Phonetic Name", "Mandarin Name", "Colors"];

      if (existingRows.length === 0) {
        existingRows.push(headers);
      }

      // Determine where the Player Name is in headers
      let nameColIndex = 0;
      if (mappings && mappings.length > 0) {
        const idx = mappings.findIndex(m => m.source_field === 'player_name' || m.source_field === 'full_name');
        if (idx !== -1) nameColIndex = idx;
      }

      // 6. Merge roster data into existingRows
      if (roster.roster_data && Array.isArray(roster.roster_data)) {
        for (const athlete of roster.roster_data) {
          const rawName = athlete.fullName || athlete.name;
          if (!rawName) continue;

          let rowValues: string[] = [];
          try {
            // Fetch enrichment data
            const { data: enrichment } = await supabase
              .from('global_player_enrichment')
              .select('*')
              .eq('player_name', rawName)
              .maybeSingle();

            if (mappings && mappings.length > 0) {
              rowValues = headers.map(header => {
                const mapping = mappings.find(m => m.target_field === header);
                if (!mapping) return '';
                const sourceField = mapping.source_field;
                if (sourceField === 'team_primary_color') {
                  return teamData?.primary_color || '';
                } else if (sourceField === 'team_secondary_color') {
                  return teamData?.secondary_color || '';
                } else if (sourceField === 'team_colors') {
                  return teamData ? `${teamData.primary_color || ''} / ${teamData.secondary_color || ''}` : '';
                } else {
                  const sourceVal = enrichment
                    ? enrichment[sourceField as keyof typeof enrichment]
                    : athlete[sourceField as keyof typeof athlete];
                  return sourceVal || athlete[sourceField as keyof typeof athlete] || '';
                }
              });
            } else {
              const jersey = athlete.jersey || athlete.jerseyNumber || '';
              const position = athlete.position || athlete.positionCode || '';
              const phonetic = enrichment?.phonetic_name || enrichment?.ipa_name || athlete.phoneticSimplified || athlete.phoneticIPA || '';
              const mandarin = enrichment?.chinese_name || athlete.nameMandarin || '';
              const colors = teamData ? `${teamData.primary_color || ''} / ${teamData.secondary_color || ''}` : '';

              rowValues = [
                rawName,
                jersey,
                position,
                phonetic,
                mandarin,
                colors
              ];
            }

            // Find match in existing rows
            let foundIndex = -1;
            for (let i = 1; i < existingRows.length; i++) {
              if (existingRows[i][nameColIndex]?.toLowerCase() === rawName.toLowerCase()) {
                foundIndex = i;
                break;
              }
            }

            if (foundIndex !== -1) {
              existingRows[foundIndex] = rowValues;
            } else {
              existingRows.push(rowValues);
            }

            // Log success to dam_delivery_log
            await supabase.from('dam_delivery_log').insert({
              connection_id: connectionId,
              status: 'delivered',
              event: `sync:${rawName}`,
              payload: { player: rawName, rowValues },
              created_at: new Date().toISOString()
            });

            totalSuccess++;
          } catch (athErr: any) {
            console.error(`[Google Sheets] Failed to process athlete ${rawName}:`, athErr.message);
            // Log failure to dam_delivery_log
            await supabase.from('dam_delivery_log').insert({
              connection_id: connectionId,
              status: 'failed',
              event: `sync:${rawName}`,
              payload: { player: rawName, rowValues },
              error_message: athErr.message,
              created_at: new Date().toISOString()
            });
            totalFailed++;
          }
        }
      }

      // 7. Write all values back
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z${existingRows.length}?valueInputOption=USER_ENTERED`;
      const writeRes = await this.googleApiRequest(connectionId, credentials, writeUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: `${sheetName}!A1:Z${existingRows.length}`,
          majorDimension: 'ROWS',
          values: existingRows
        })
      });

      if (!writeRes.ok) {
        const errText = await writeRes.text();
        throw new Error(`Google Sheets values update failed: ${writeRes.status} - ${errText}`);
      }

      console.log(`[Google Sheets] Successfully updated sheet "${sheetName}".`);
      return { success: true, totalSuccess, totalFailed };
    } catch (err: any) {
      console.error(`[Google Sheets] Sync failed:`, err.message);
      throw err;
    }
  }
}

