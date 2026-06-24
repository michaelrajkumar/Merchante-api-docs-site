import Link from 'next/link'
import clsx from 'clsx'

export type NavItem = {
  title: string
  href: string
}

export type NavSection = {
  title: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    title: 'Get started',
    items: [
      { title: 'Overview', href: '/' },
      { title: 'Authentication', href: '/#authentication' },
      { title: 'Environments', href: '/#environments' },
      { title: 'Errors', href: '/#errors' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Payment Gateway', href: '/api-reference/payment-gateway' },
      { title: 'Account Updater', href: '/api-reference/account-updater' },
      { title: 'Partner Portal', href: '/api-reference/partner-portal' },
      { title: 'Hosted Payments', href: '/api-reference/hosted-payments' },
      { title: 'Split Funding', href: '/api-reference/split-funding' },
      { title: 'Batch Processing', href: '/api-reference/batch-processing' },
      { title: 'Sub Merchant', href: '/api-reference/sub-merchant' },
      { title: 'Reporting', href: '/api-reference/reporting' },
    ],
  },
]

export function LeftNav({ activeHref }: { activeHref: string }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-omise-border bg-omise-dark-secondary md:block">
      <div className="sticky top-14 h-[calc(100vh-56px)] overflow-y-auto px-4 py-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-omise-cyan">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = item.href === activeHref
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'block rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium'
                          : 'text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan'
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
