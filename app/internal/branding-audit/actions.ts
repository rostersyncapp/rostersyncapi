'use server';

import { createScopedClient } from '@/services/supabase';

export async function updateTeamBranding(teamId: string, primary: string | null, secondary: string | null) {
  const supabase = createScopedClient();
  
  const { error } = await supabase
    .from('teams')
    .update({ 
      primary_color: primary,
      secondary_color: secondary,
      updated_at: new Date().toISOString()
    })
    .eq('id', teamId);

  if (error) {
    console.error('Error updating branding:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
