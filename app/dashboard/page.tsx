import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })

  const { count: leagueCount } = await supabase
    .from('leagues')
    .select('*', { count: 'exact', head: true })

  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { label: 'Teams', value: teamCount ?? 0 },
    { label: 'Leagues', value: leagueCount ?? 0 },
    { label: 'Activities', value: recentActivity?.length ?? 0 },
  ]

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-mono font-bold text-text-primary mb-6 uppercase tracking-wider">// Overview</h1>

      {/* Onboarding Welcome Banner - Brutalist Technical Edition */}
      <div className="border border-accent/30 bg-accent/5 p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-accent/40 uppercase tracking-widest select-none">
          SYSTEM_OK // PIPELINE_ACTIVE
        </div>
        <h2 className="text-base font-mono font-bold text-text-primary uppercase tracking-wider mb-2">
          RosterSync Metadata Portal
        </h2>
        <p className="text-xs font-mono text-text-secondary max-w-2xl leading-relaxed">
          Here is your roster dashboard. You can download instant CSV spreadsheets, configure daily email summaries of roster changes, or connect auto-updating Google Sheets and DAM channels (Iconik/CatDV) directly to sync data with zero manual management.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/rosters"
            className="bg-text-primary text-bg-primary hover:opacity-90 text-[10px] px-4 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md cursor-pointer"
          >
            Get Roster CSV
          </Link>
          <Link
            href="/dashboard/settings"
            className="bg-transparent hover:bg-bg-primary border border-border-custom text-text-primary hover:border-accent text-[10px] px-4 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer"
          >
            Connect Sheets & DAM
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-bg-surface border border-border-custom p-4 transition-all hover:border-accent">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-mono font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/rosters"
          className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-4 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md cursor-pointer"
        >
          Browse Rosters
        </Link>
      </div>

      <div className="bg-bg-surface border border-border-custom">
        <div className="p-3 border-b border-border-custom">
          <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
            Recent Activity
          </h2>
        </div>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="divide-y divide-border-custom">
            {recentActivity.map((log) => (
              <div key={log.id} className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 whitespace-nowrap">
                    {log.action_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono text-text-secondary truncate">
                    {log.description}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-text-muted whitespace-nowrap ml-3">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs font-mono text-text-muted">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  )
}
