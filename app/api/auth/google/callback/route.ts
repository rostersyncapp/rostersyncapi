import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { encryptCredentials, decryptCredentials } from '@/app/dashboard/settings/crypto-utils'

const ENCRYPTION_KEY = process.env.DAM_ENCRYPTION_KEY || 'default-dam-encryption-key-32-chars-long!';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_error=missing_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_error=not_configured`)
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user || user.id !== state) {
    return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_error=unauthorized`)
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3017'}/api/auth/google/callback`
    
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('Google token exchange error:', tokenData)
      return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_error=token_exchange_failed`)
    }

    const { access_token, refresh_token } = tokenData

    const { data: existingConnection } = await supabase
      .from('dam_connections')
      .select('*')
      .eq('organization_id', user.id)
      .eq('provider', 'google_sheets')
      .maybeSingle()

    let finalCredentials: Record<string, string> = {
      oauth_token: access_token,
      refresh_token: refresh_token || '',
      spreadsheet_id: '',
    }

    if (existingConnection) {
      try {
        const decrypted = await decryptCredentials(
          existingConnection.credentials_encrypted,
          existingConnection.credentials_iv,
          ENCRYPTION_KEY
        )
        finalCredentials.spreadsheet_id = decrypted.spreadsheet_id || ''
        if (!refresh_token && decrypted.refresh_token) {
          finalCredentials.refresh_token = decrypted.refresh_token
        }
      } catch (decErr) {
        console.error('Decryption error in oauth callback:', decErr)
      }
    }

    const { encrypted, iv } = await encryptCredentials(finalCredentials, ENCRYPTION_KEY)

    const dbPayload = {
      organization_id: user.id,
      name: existingConnection?.name || 'Google Sheets Integration',
      provider: 'google_sheets',
      credentials_encrypted: encrypted,
      credentials_iv: iv,
      active: true,
      updated_at: new Date().toISOString(),
    }

    if (existingConnection) {
      await supabase
        .from('dam_connections')
        .update(dbPayload)
        .eq('id', existingConnection.id)
    } else {
      await supabase
        .from('dam_connections')
        .insert({
          ...dbPayload,
          created_at: new Date().toISOString(),
        })
    }

    return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_success=true`)
  } catch (err) {
    console.error('Google OAuth callback handler error:', err)
    return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&google_error=unknown_error`)
  }
}
