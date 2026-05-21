import { Agent } from './Agent.ts';
import { supabase } from '../supabase.ts';

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

/**
 * ConnectorAgent (Tier 3)
 * Handles enterprise metadata delivery to DAMs and Broadcast systems.
 */
export class ConnectorAgent extends Agent {
  
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

      // 2. Fetch Field Mappings
      const { data: mappings, error: mappingError } = await supabase
        .from('field_mappings')
        .select('source_field, target_field')
        .eq('organization_id', organizationId)
        .eq('connector_type', connectorType)
        .eq('is_active', true);

      if (mappingError || !mappings || mappings.length === 0) {
        console.warn(`[Connector] 🟡 No active field mappings found for ${connectorType}. Using default mapping.`);
      }

      // 3. Prepare Payload
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

      // 4. Retrieve API Key from Supabase Vault (via RPC or Direct Query if allowed)
      // Note: Accessing vault.secrets usually requires a dedicated function or higher privileges.
      // We assume an RPC 'get_connector_secret' exists or we query the vault if authorized.
      const apiKey = await this.getVaultSecret(organizationId, connectorType);

      if (!apiKey) {
        throw new Error(`Missing API Key for ${connectorType} in Supabase Vault`);
      }

      // 5. Execute DAM-specific Push
      return await this.pushToExternalAPI(connectorType, payload, apiKey);

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

  private async pushToExternalAPI(type: string, payload: any, apiKey: string): Promise<any> {
    console.log(`[Connector] 🚀 Pushing payload to ${type}...`);
    
    // Placeholder logic for specific DAMs
    switch (type) {
      case 'iconik':
        return { status: 'success', system: 'iconik', message: 'Metadata ingested' };
      case 'catdv':
        return { status: 'success', system: 'catdv', message: 'XML metadata updated' };
      default:
        console.log(`[Connector] Payload:`, JSON.stringify(payload, null, 2));
        return { status: 'success', system: 'generic', message: 'Payload logged' };
    }
  }
}
