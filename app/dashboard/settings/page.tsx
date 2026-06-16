import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SettingsTabs from './SettingsTabs';
import { getDAMConnections, getFieldMappings } from './actions';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Test User',
        organization_name: user.user_metadata?.organization_name || 'My Workspace',
        subscription_tier: 'STUDIO',
        is_admin: false,
        booth_mode_enabled: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (!createError && newProfile) {
      profile = newProfile;
    }
  }

  let connections: any[] = [];
  let fieldMappings: any[] = [];
  try {
    connections = await getDAMConnections();
    fieldMappings = await getFieldMappings();
  } catch (err) {
    console.error('Failed to load settings datasets:', err);
  }

  return (
    <div className="w-full">
      <h1 className="text-lg font-mono font-bold text-white mb-6 uppercase tracking-wider">
        Settings
      </h1>
      <SettingsTabs
        profile={profile}
        email={user.email}
        initialConnections={connections}
        initialFieldMappings={fieldMappings}
      />
    </div>
  );
}

