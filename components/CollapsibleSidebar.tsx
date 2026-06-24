'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

type NavGroup = {
  tag: string
  items: Array<{ path: string; title: string; href: string }>
}

type Props = {
  title: string
  subtitle?: string
  groups: NavGroup[]
  currentPath: string
  children?: React.ReactNode // For credentials box or other content at the bottom
  footerContent?: React.ReactNode // For toggle links like "Show advanced"
}

export function CollapsibleSidebar({ title, subtitle, groups, currentPath, children, footerContent }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar.collapsed')
      if (saved === 'true') setCollapsed(true)
    } catch {}
  }, [])

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('sidebar.collapsed', String(collapsed))
    } catch {}
  }, [collapsed])

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [currentPath])

  // Close mobile drawer on escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-omise-border bg-gradient-to-r from-omise-dark-secondary to-omise-dark-tertiary">
        <div className="flex items-center justify-between">
          <div className={clsx(collapsed && 'lg:hidden')}>
            <div className="text-xs font-semibold uppercase tracking-wide text-omise-cyan">{title}</div>
            {subtitle && <div className="mt-1 text-sm text-omise-gray-300">{subtitle}</div>}
          </div>
          {/* Collapse toggle (desktop only) */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={clsx('w-4 h-4 transition-transform', collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={clsx('flex-1 overflow-y-auto p-4', collapsed && 'lg:px-2')}>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.tag}>
              <div className={clsx(
                'mb-2 text-xs font-semibold uppercase tracking-wide text-omise-cyan/70',
                collapsed && 'lg:text-center lg:text-[10px]'
              )}>
                {collapsed ? g.tag.slice(0, 3) : g.tag}
              </div>
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const active = item.path === currentPath
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.href}
                        className={clsx(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          active ? 'bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium' : 'text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan',
                          collapsed && 'lg:px-1 lg:text-center lg:text-xs'
                        )}
                        title={collapsed ? item.title : undefined}
                      >
                        {collapsed ? (
                          <span className="hidden lg:inline">{item.title.slice(0, 2)}</span>
                        ) : null}
                        <span className={clsx(collapsed && 'lg:hidden')}>{item.title}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer content (e.g., "Show advanced" toggle) */}
        {footerContent && (
          <div className={clsx('mt-4 pt-4 border-t border-omise-border', collapsed && 'lg:hidden')}>
            {footerContent}
          </div>
        )}
      </nav>

      {/* Credentials or other sticky content at bottom */}
      {children && (
        <div className={clsx(
          'shrink-0 border-t border-omise-border p-4 bg-omise-dark-secondary',
          collapsed && 'lg:hidden'
        )}>
          {children}
        </div>
      )}
    </>
  )

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] flex flex-col bg-omise-dark-secondary border-r border-omise-border transform transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex lg:flex-col lg:shrink-0 border-r border-omise-border bg-omise-dark-secondary transition-all duration-200',
          collapsed ? 'lg:w-16' : 'lg:w-72'
        )}
      >
        {sidebarContent}
      </aside>
    </SidebarContext.Provider>
  )
}

// Mobile menu button to be placed in header
export function MobileMenuButton() {
  const { setMobileOpen } = useSidebar()

  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      className="lg:hidden p-2 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
