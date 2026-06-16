import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div 
      className="min-h-screen text-text-primary selection:bg-white selection:text-black antialiased font-sans flex relative overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
        backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)'
      }}
    >
      {/* High-Intensity Vivid Ambient Side Glows */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none z-0" 
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, rgba(20, 184, 166, 0.05) 50%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[10%] right-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none z-0" 
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.12) 0%, rgba(34, 197, 94, 0.04) 50%, transparent 70%)' }}
      />

      <DashboardSidebar
        userEmail={user.email ?? ''}
        userName={profile?.full_name ?? user.email ?? ''}
        isAdmin={profile?.is_admin ?? false}
        organizationName={profile?.organization_name ?? ''}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto relative z-10">
        {children}
      </main>
    </div>
  )
}
