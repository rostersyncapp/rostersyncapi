'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import ThemeToggle from '@/app/ThemeToggle'

interface DashboardSidebarProps {
  userEmail: string
  userName: string
  isAdmin: boolean
  organizationName: string
}

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: '◈' },
  { label: 'Rosters', href: '/dashboard/rosters', icon: '☰' },
  { label: 'Activity', href: '/dashboard/activity', icon: '⏱' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
]

export default function DashboardSidebar({
  userEmail,
  userName,
  isAdmin,
  organizationName,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-bg-surface border border-border-custom p-2 text-text-secondary"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-60 bg-bg-surface border-r border-border-custom
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col
        `}
      >
        {/* Brand */}
        <div className="p-4 border-b border-border-custom flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-text-primary font-mono font-bold tracking-widest text-sm flex items-center gap-1.5 group">
              <svg className="w-4 h-4 text-text-primary" viewBox="0 0 75 65" fill="currentColor">
                <path d="M37.59.25L75.02 65H.16L37.59.25z" />
              </svg>
              <span>ROSTERSYNC</span>
            </Link>
            <p className="text-text-muted font-mono text-[10px] mt-1.5 uppercase tracking-wider">
              {organizationName}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-mono transition-all ${
                isActive(item.href)
                  ? 'text-text-primary bg-bg-elevated border-l-2 border-accent font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-border-custom my-2" />
              <Link
                href="/internal/branding-audit"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-mono transition-all ${
                  pathname.startsWith('/internal')
                    ? 'text-text-primary bg-bg-elevated border-l-2 border-accent font-bold'
                    : 'text-warning hover:text-text-primary hover:bg-bg-primary/50'
                }`}
              >
                <span className="w-4 text-center">◆</span>
                Branding Audit
              </Link>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border-custom">
          <p className="text-xs font-mono text-text-secondary truncate">{userName}</p>
          <p className="text-[10px] font-mono text-text-muted truncate">{userEmail}</p>
          <form action={signOut} aria-label="Sign out form">
            <button
              type="submit"
              className="mt-2.5 w-full py-1.5 text-[10px] uppercase tracking-wider font-mono font-bold bg-transparent text-text-muted border border-border-custom hover:border-red-500 hover:text-red-500 transition-all cursor-pointer"
            >
              sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
