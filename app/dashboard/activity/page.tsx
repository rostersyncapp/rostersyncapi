import { createClient } from '@/utils/supabase/server'

export default async function ActivityPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-mono font-bold text-text-primary mb-6 uppercase tracking-wider">// Activity Log</h1>

      <div className="bg-bg-surface border border-border-custom">
        {logs && logs.length > 0 ? (
          <div className="divide-y divide-border-custom">
            {logs.map((log) => (
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
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs font-mono text-text-muted">No activity logs</p>
          </div>
        )}
      </div>
    </div>
  )
}
