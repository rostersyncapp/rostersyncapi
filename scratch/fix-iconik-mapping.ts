import * as dotenv from 'dotenv';
dotenv.config();

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function fix() {
  // Show all active iconik field mappings first
  const { data: all } = await supabase
    .from('field_mappings')
    .select('id, source_field, target_field, is_active, connector_type, organization_id')
    .eq('connector_type', 'iconik')
    .order('created_at', { ascending: true });

  console.log('All Iconik field mappings:');
  for (const m of all || []) {
    console.log(`  [${m.is_active ? 'ACTIVE' : 'inactive'}] id=${m.id} | ${m.source_field} → ${m.target_field}`);
  }

  // Deactivate the stale inter-miami-fc mapping
  const stale = (all || []).filter(m => m.target_field === 'inter-miami-fc');
  if (!stale.length) {
    console.log('\n✅ No stale inter-miami-fc mapping found — already clean.');
    return;
  }

  for (const m of stale) {
    const { error } = await supabase
      .from('field_mappings')
      .update({ is_active: false })
      .eq('id', m.id);
    if (error) console.error(`Failed to deactivate ${m.id}:`, error);
    else console.log(`\n✅ Deactivated stale mapping: ${m.source_field} → ${m.target_field} (id: ${m.id})`);
  }
}

fix().catch(console.error);
