'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signIn(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { error: 'Email and password are required' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: error.message }
    }
  } catch (err: any) {
    console.error('SignIn error:', err)
    return { error: err.message || 'An unexpected error occurred during sign in' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const organizationName = formData.get('organizationName') as string

    if (!email || !password || !fullName || !organizationName) {
      return { error: 'All fields are required' }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_name: organizationName,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (signUpData?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          full_name: fullName,
          organization_name: organizationName,
          subscription_tier: 'STUDIO',
          is_admin: false,
          booth_mode_enabled: false,
          created_at: new Date().toISOString()
        });
      if (profileError) {
        console.error('Failed to create profile for user:', profileError);
        return { error: profileError.message }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('SignUp error:', err)
    return { error: err.message || 'An unexpected error occurred during sign up' }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('SignOut error:', err)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function signInWithGoogle() {
  let redirectUrl: string | null = null

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3017'}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.url) {
      redirectUrl = data.url
    }
  } catch (err: any) {
    console.error('Google Auth error:', err)
    return { error: err.message || 'An unexpected error occurred during Google sign in' }
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }
}
