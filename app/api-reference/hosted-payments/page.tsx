'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { HOSTED_PAYMENTS_OPS, HOSTED_PAYMENTS_TAG_ORDER } from '@/lib/hostedPayments'

export default function HostedPaymentsIndex() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load sidebar collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar.collapsed')
      if (saved === 'true') setSidebarCollapsed(true)
    } catch {}
  }, [])

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('sidebar.collapsed', String(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  // Close mobile menu on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Group operations by tag
  const grouped = new Map<string, typeof HOSTED_PAYMENTS_OPS>()
  for (const tag of HOSTED_PAYMENTS_TAG_ORDER) {
    grouped.set(tag, [])
  }
  for (const op of HOSTED_PAYMENTS_OPS) {
    const existing = grouped.get(op.tag) || []
    existing.push(op)
    grouped.set(op.tag, existing)
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-omise-border">
        <div className="flex items-center justify-between">
          <div className={clsx(sidebarCollapsed && 'lg:hidden')}>
            <div className="text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Hosted Payments</div>
            <div className="mt-1 text-sm text-omise-gray-400">Choose an operation</div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={clsx('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={clsx('flex-1 overflow-y-auto p-4', sidebarCollapsed && 'lg:px-2')}>
        {Array.from(grouped.entries()).map(([tag, ops]) => (
          <div key={tag} className="mb-6 last:mb-0">
            <div className={clsx('mb-2 text-xs font-semibold uppercase tracking-wide text-omise-gray-500', sidebarCollapsed && 'lg:hidden')}>
              {tag}
            </div>
            <ul className="space-y-1">
              {ops.map((o) => {
                const href = `/api-reference/hosted-payments/${o.slug}`
                return (
                  <li key={o.slug}>
                    <Link
                      href={href}
                      className={clsx(
                        'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan',
                        sidebarCollapsed && 'lg:justify-center lg:px-2'
                      )}
                      title={sidebarCollapsed ? o.title : undefined}
                    >
                      <span className={clsx(sidebarCollapsed && 'lg:hidden')}>{o.title}</span>
                      <span className={clsx(sidebarCollapsed ? 'lg:inline hidden' : 'hidden')}>{o.title.slice(0, 2)}</span>
                      <span className={clsx('text-xs text-omise-gray-500', sidebarCollapsed && 'lg:hidden')}>
                        {o.method}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] flex flex-col bg-omise-dark-secondary border-r border-omise-border transform transition-transform duration-300 lg:hidden overflow-y-auto',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100 z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* API Switcher (Mobile Only) */}
        <div className="p-4 border-b border-omise-border">
          <div className="text-xs font-semibold uppercase tracking-wide text-omise-cyan mb-2">Switch API</div>
          <div className="space-y-1">
            <Link
              href="/api-reference/payment-gateway"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Payment Gateway
            </Link>
            <Link
              href="/api-reference/account-updater"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Account Updater
            </Link>
            <Link
              href="/api-reference/reporting"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Reporting
            </Link>
            <Link
              href="/api-reference/sub-merchant"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Sub Merchant
            </Link>
            <Link
              href="/api-reference/partner-portal"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Partner Portal
            </Link>
            <Link
              href="/api-reference/split-funding"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Split Funding
            </Link>
            <Link
              href="/api-reference/batch-processing"
              className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan transition-colors"
            >
              Batch Processing
            </Link>
            <Link
              href="/api-reference/hosted-payments"
              className="block rounded-md px-2 py-1.5 text-sm bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium"
            >
              Hosted Payments
            </Link>
          </div>
        </div>

        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex lg:flex-col lg:shrink-0 border-r border-omise-border bg-omise-dark-secondary transition-all duration-200 sticky top-14 h-[calc(100vh-56px)]',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-72'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile menu button */}
        <div className="lg:hidden sticky top-0 z-30 bg-omise-dark border-b border-omise-border px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 text-sm text-omise-gray-300 hover:text-omise-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>

        <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="rounded-2xl border border-omise-border bg-gradient-to-br from-omise-dark-secondary to-omise-dark p-8 shadow-soft-dark">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-omise-teal to-omise-cyan shadow-glow-cyan">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-omise-gray-100">
              Hosted Payments Page
            </h1>
            <p className="text-sm text-omise-gray-400 mt-1">
              Secure, PCI-compliant payment pages hosted by MerchantE
            </p>
          </div>
        </div>

        <p className="text-base leading-7 text-omise-gray-300 mt-4">
          MerchantE's Hosted Payments Page allows merchants to integrate a secure payment checkout experience into their e-commerce websites. Customers can checkout as guests, create payment accounts, or log in to make a payment.
        </p>
      </div>

      {/* Quick Start */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-omise-gray-100 mb-4">Getting Started</h2>
        <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-6">
          <p className="text-sm text-omise-gray-300 mb-4">
            Basic requirements to begin integration:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-omise-teal/20 text-omise-cyan flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-omise-gray-100">Web Hosting</div>
                <div className="text-xs text-omise-gray-400 mt-0.5">
                  Merchant must have a publicly available website. The Cascading Style Sheet and company logo are hosted by the merchant.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-omise-teal/20 text-omise-cyan flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-omise-gray-100">HTML or plain text editor</div>
                <div className="text-xs text-omise-gray-400 mt-0.5">
                  Form elements need to be added to existing or new HTML pages.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-omise-teal/20 text-omise-cyan flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-omise-gray-100">Merchant Account</div>
                <div className="text-xs text-omise-gray-400 mt-0.5">
                  Required to begin processing live transactions.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-omise-teal/20 text-omise-cyan flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-omise-gray-100">Submit Final Amount Only</div>
                <div className="text-xs text-omise-gray-400 mt-0.5">
                  ME Hosted Checkout will only process the amount sent in the payment_amount field. Shipping charges, local tax, etc. will need to be accommodated before the transaction is submitted.
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Transaction Flow */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-omise-gray-100 mb-4">Transaction Flow</h2>
        <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-6">
          <ol className="space-y-4">
            {[
              {
                step: '1',
                title: 'Customer Checkout',
                description: 'Customer is on merchant\'s e-Commerce website and clicks Checkout',
              },
              {
                step: '2',
                title: 'Redirect to Hosted Page',
                description: 'Customer is redirected to MerchantE Hosted Payment Page',
              },
              {
                step: '3',
                title: 'Payment Submission',
                description: 'Customer enters payment details and submits payment',
              },
              {
                step: '4',
                title: 'Approval Response',
                description: 'If approved: Customer is presented with payment receipt and has the option to return to merchant\'s website',
              },
              {
                step: '5',
                title: 'Decline Response',
                description: 'If declined: Customer is presented with generic payment decline and advised to reach out to issuer for more details',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-omise-teal to-omise-cyan text-white font-semibold text-sm flex-shrink-0 shadow-glow-cyan">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-medium text-omise-gray-100">{item.title}</div>
                  <div className="text-xs text-omise-gray-400 mt-1">{item.description}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Integration Steps */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-omise-gray-100 mb-4">Integration Steps</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-5 hover:border-omise-cyan/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-omise-teal/20 flex items-center justify-center text-omise-cyan text-xs font-bold">
                1
              </div>
              <h3 className="text-sm font-semibold text-omise-gray-100">Obtain Profile ID</h3>
            </div>
            <p className="text-xs text-omise-gray-400">
              Get your profile ID once the merchant account setup has been completed
            </p>
          </div>

          <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-5 hover:border-omise-cyan/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-omise-teal/20 flex items-center justify-center text-omise-cyan text-xs font-bold">
                2
              </div>
              <h3 className="text-sm font-semibold text-omise-gray-100">Update HTML Pages</h3>
            </div>
            <p className="text-xs text-omise-gray-400">
              Modify or create HTML pages with 'buy now' or 'checkout' links or images
            </p>
          </div>

          <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-5 hover:border-omise-cyan/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-omise-teal/20 flex items-center justify-center text-omise-cyan text-xs font-bold">
                3
              </div>
              <h3 className="text-sm font-semibold text-omise-gray-100">Insert Payment Form</h3>
            </div>
            <p className="text-xs text-omise-gray-400">
              Insert Payment Page URL form in HTML
            </p>
          </div>

          <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-5 hover:border-omise-cyan/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-omise-teal/20 flex items-center justify-center text-omise-cyan text-xs font-bold">
                4
              </div>
              <h3 className="text-sm font-semibold text-omise-gray-100">Test Integration</h3>
            </div>
            <p className="text-xs text-omise-gray-400">
              If necessary, test the form by processing a sale. Ensure that both response URLs function properly.
            </p>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-omise-gray-100 mb-4">Security Settings</h2>
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-6">
          <div className="flex items-start gap-3 mb-4">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8V7m0 0V5m0 2h.01" />
            </svg>
            <div>
              <p className="text-sm text-amber-300 font-medium">Advanced Integration Options</p>
              <p className="text-xs text-amber-200/80 mt-1">
                These settings are intended for advanced integrations of ME Hosted Checkout, and will require a server-side programming language to implement properly, such as PHP, JSP, ASP, etc.
              </p>
            </div>
          </div>

          <div className="space-y-3 ml-8">
            <div>
              <div className="text-sm font-medium text-amber-300">Security Code</div>
              <div className="text-xs text-amber-200/80 mt-1">
                MD5 hash validation using Profile Key + Security Code + Transaction Amount. When enabled, requests without valid transaction_key will be redirected to cancel_url with resp_text=invalid_tran_key.
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-amber-300">HTTP Authentication</div>
              <div className="text-xs text-amber-200/80 mt-1">
                Optional Resp HTTP Username and Password for response URL callbacks using standard HTTP authentication (BASIC + Base64 encoded username:password).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Reference Links */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-omise-gray-100 mb-4">API Reference</h2>
        <div className="grid gap-4">
          <Link
            href="/api-reference/hosted-payments/checkout"
            className="group rounded-xl border border-omise-border bg-omise-dark-secondary p-6 hover:border-omise-cyan/50 hover:bg-omise-dark-tertiary transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                    POST
                  </span>
                  <code className="text-xs font-mono text-omise-gray-300">/checkout/sign-in</code>
                </div>
                <h3 className="text-base font-semibold text-omise-gray-100 group-hover:text-omise-cyan transition-colors">
                  Initiate Hosted Payment Page Checkout
                </h3>
                <p className="text-sm text-omise-gray-400 mt-1">
                  Redirects customer to MerchantE Hosted Payment Page for checkout. The customer will be presented with options to checkout as guest, create a payment account, or log in to existing payment account.
                </p>
              </div>
              <svg className="w-5 h-5 text-omise-gray-500 group-hover:text-omise-cyan group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/api-reference/hosted-payments/credit-card-response"
            className="group rounded-xl border border-omise-border bg-omise-dark-secondary p-6 hover:border-omise-cyan/50 hover:bg-omise-dark-tertiary transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                    POST
                  </span>
                  <code className="text-xs font-mono text-omise-gray-300">/webhooks/response-credit-card</code>
                </div>
                <h3 className="text-base font-semibold text-omise-gray-100 group-hover:text-omise-cyan transition-colors">
                  Credit Card Transaction Response (Webhook)
                </h3>
                <p className="text-sm text-omise-gray-400 mt-1">
                  HTTP POST callback sent to merchant's configured response_url after a credit card transaction has been processed.
                </p>
              </div>
              <svg className="w-5 h-5 text-omise-gray-500 group-hover:text-omise-cyan group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/api-reference/hosted-payments/ach-response"
            className="group rounded-xl border border-omise-border bg-omise-dark-secondary p-6 hover:border-omise-cyan/50 hover:bg-omise-dark-tertiary transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                    POST
                  </span>
                  <code className="text-xs font-mono text-omise-gray-300">/webhooks/response-ach</code>
                </div>
                <h3 className="text-base font-semibold text-omise-gray-100 group-hover:text-omise-cyan transition-colors">
                  ACH Transaction Response (Webhook)
                </h3>
                <p className="text-sm text-omise-gray-400 mt-1">
                  HTTP POST callback sent to merchant's configured response_url after an ACH transaction has been processed.
                </p>
              </div>
              <svg className="w-5 h-5 text-omise-gray-500 group-hover:text-omise-cyan group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Contact Support */}
      <div className="mt-10 rounded-xl border border-omise-border bg-gradient-to-br from-omise-dark-secondary to-omise-dark p-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-omise-blue/20 text-omise-blue flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-omise-gray-100">Need Help?</h3>
            <p className="text-sm text-omise-gray-400 mt-1">
              Contact MerchantE Support for assistance with integration, testing, or troubleshooting.
            </p>
            <a
              href="https://merchante.atlassian.net/servicedesk/customer/portal/12/create/101"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-omise-cyan hover:text-omise-teal transition-colors"
            >
              Contact us
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
        </div>
      </main>
    </div>
  )
}
