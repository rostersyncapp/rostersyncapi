'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/app/auth/actions'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signIn(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen text-text-primary selection:bg-white selection:text-black antialiased font-sans flex flex-col items-center justify-center px-4 relative overflow-hidden page-hero-bg"
    >
      {/* Soft Ambient Background Glows */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none z-0 select-none opacity-50" 
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--glow-1) 0%, var(--glow-3) 60%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        
        {/* Branding Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="flex flex-col items-center group mb-2">
            <svg className="w-8 h-8 text-text-primary transition-transform group-hover:scale-105 mb-3" viewBox="0 0 75 65" fill="currentColor">
              <path d="M37.59.25L75.02 65H.16L37.59.25z" />
            </svg>
            <span className="text-text-primary font-bold text-xl tracking-tight">
              rostersync
            </span>
          </Link>
          <p className="text-text-muted font-mono text-xs uppercase tracking-widest mt-1">
            sign in to your workspace
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-bg-surface/50 border border-border-custom rounded-xl p-8 backdrop-blur-md shadow-2xl hover:border-accent/50 transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2 font-semibold">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-bg-surface/80 border border-border-custom rounded-md px-3.5 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="you@workspace.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2 font-semibold">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-bg-surface/80 border border-border-custom rounded-md px-3.5 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/25 border border-red-900/50 rounded-md px-4 py-2.5">
                <p className="text-red-400 text-xs font-mono">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs uppercase tracking-wider font-bold bg-text-primary text-bg-primary hover:opacity-90 rounded-md transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Account redirect */}
          <div className="mt-6 text-center text-xs font-mono text-text-muted border-t border-border-custom pt-5">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-text-primary hover:text-accent hover:underline cursor-pointer font-bold"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
