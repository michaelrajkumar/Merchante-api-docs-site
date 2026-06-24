'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { APIS } from '@/lib/apis'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <Link
      href={href}
      className={clsx(
        'text-sm font-medium transition-colors',
        active ? 'text-white' : 'text-omise-gray-400 hover:text-white'
      )}
    >
      {children}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const inApiRef = pathname?.startsWith('/api-reference')

  return (
    <header className="sticky top-0 z-40 w-full border-b border-omise-border bg-omise-dark/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-omise-teal to-omise-cyan shadow-glow-cyan" />
          <span className="text-sm font-semibold tracking-tight text-white">MerchantE API Docs</span>
        </Link>

        <nav className="ml-4 flex items-center gap-4">
          <NavLink href="/">Guides</NavLink>
          <NavLink href="/api-reference/payment-gateway">API Reference</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {inApiRef ? (
            <div className="hidden items-center gap-2 md:flex">
              {APIS.map((api) => {
                const href = `/api-reference/${api.key}`
                const active = pathname === href || pathname?.startsWith(`${href}/`)
                return (
                  <Link
                    key={api.key}
                    href={href}
                    className={clsx(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-omise-cyan bg-gradient-to-r from-omise-teal to-omise-cyan text-white shadow-glow-cyan'
                        : 'border-omise-border bg-omise-dark-secondary text-omise-gray-300 hover:border-omise-cyan/50 hover:text-omise-cyan'
                    )}
                  >
                    {api.label}
                    {!api.specUrl ? <span className="ml-1 opacity-60">(soon)</span> : null}
                  </Link>
                )
              })}
            </div>
          ) : null}

        </div>
      </div>
    </header>
  )
}
