'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { CodeSampleTabs, type CodeSample } from '@/components/CodeSampleTabs'
import { useMerchantECredentials } from '@/components/CredentialsBox'
import { useCredentialMasking } from '@/lib/useCredentialMasking'

type NavGroup = {
  tag: string
  items: Array<{ path: string; title: string; href: string }>
}

type TryItOutField = {
  name: string
  type: string
  description?: string
  required: boolean
  enum?: any[]
  enumDescriptions?: Record<string, string>
  example?: any
  default?: any
  constraints?: Record<string, any>
}

type TryItOutGroup = {
  groupName: string
  description?: string
  conditional?: Array<{ oneOf?: string[]; note?: string }>
  fields: TryItOutField[]
}

type Props = {
  sidebarGroups: NavGroup[]
  currentPath: string
  footerContent?: React.ReactNode
  miniSpec: any
  codeSamples: CodeSample[]
  tryItOutGroups?: TryItOutGroup[] | null
  exampleValues?: Record<string, any> | null
  children: React.ReactNode
}

function applyEnvToCode(code: string, env: 'cert' | 'api') {
  let out = code
  out = out.replaceAll('{environment}', env)
  out = out.replaceAll('https://cert.merchante-solutions.com', `https://${env}.merchante-solutions.com`)
  out = out.replaceAll('https://api.merchante-solutions.com', `https://${env}.merchante-solutions.com`)
  return out
}

// Fields that should show "do not use real data" warnings
const SENSITIVE_FIELDS = ['profile_id', 'profile_key', 'card_number', 'card_id']

function shouldShowWarning(fieldName: string): boolean {
  return SENSITIVE_FIELDS.includes(fieldName.toLowerCase())
}

export function PaymentGatewayClient({
  sidebarGroups,
  currentPath,
  footerContent,
  miniSpec,
  codeSamples,
  tryItOutGroups,
  exampleValues,
  children,
}: Props) {
  const { creds, setEnvironment } = useMerchantECredentials()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Mask credentials in Swagger UI cURL output
  useCredentialMasking()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tryItExpanded, setTryItExpanded] = useState(false)

  // Try It Out form state
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Required: true })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{ status: number; data: any; error?: string; parsedErrorCode?: string } | null>(null)

  // Initialize form with example values
  useEffect(() => {
    if (exampleValues && Object.keys(formValues).length === 0) {
      const initial: Record<string, string> = {}
      for (const [key, val] of Object.entries(exampleValues)) {
        initial[key] = typeof val === 'string' ? val : String(val ?? '')
      }
      setFormValues(initial)
    }
  }, [exampleValues])

  // Reset form when path changes
  useEffect(() => {
    setFormValues({})
    setResponse(null)
    setExpandedGroups({ Required: true })
  }, [currentPath])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  const handleFieldChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setResponse(null)

    try {
      const url = `https://${creds.environment}.merchante-solutions.com/mes-api/tridentApi`

      // Build form-urlencoded body
      const params = new URLSearchParams()
      for (const [key, val] of Object.entries(formValues)) {
        if (val !== undefined && val !== '') {
          params.append(key, val)
        }
      }

      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }),
      })

      const data = await res.text()

      // Parse error_code from URL-encoded response (e.g., "error_code=000" means success)
      let parsedErrorCode: string | undefined
      try {
        const responseParams = new URLSearchParams(data)
        parsedErrorCode = responseParams.get('error_code') || undefined
      } catch {
        // Response might not be URL-encoded, that's fine
      }

      setResponse({ status: res.status, data, parsedErrorCode })
    } catch (err) {
      setResponse({ status: 0, data: null, error: String(err) })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load sidebar collapsed state from localStorage
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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentPath])

  // Close mobile menu on escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Process code samples with environment
  const samplesWithEnv = codeSamples.map((s) => ({
    ...s,
    code: applyEnvToCode(s.code, creds.environment),
  }))

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-omise-border">
        <div className="flex items-center justify-between">
          <div className={clsx(sidebarCollapsed && 'lg:hidden')}>
            <div className="text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Payment Gateway</div>
            <div className="mt-1 text-sm text-omise-gray-400">Choose an operation</div>
          </div>
          {/* Collapse toggle (desktop only) */}
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
        <div className="space-y-5">
          {sidebarGroups.map((g) => (
            <div key={g.tag}>
              <div className={clsx(
                'mb-2 text-xs font-semibold uppercase tracking-wide text-omise-gray-500',
                sidebarCollapsed && 'lg:text-center lg:text-[10px]'
              )}>
                {sidebarCollapsed ? g.tag.slice(0, 3) : g.tag}
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
                          sidebarCollapsed && 'lg:px-1 lg:text-center lg:text-xs'
                        )}
                        title={sidebarCollapsed ? item.title : undefined}
                      >
                        {sidebarCollapsed ? (
                          <span className="hidden lg:inline">{item.title.slice(0, 2)}</span>
                        ) : null}
                        <span className={clsx(sidebarCollapsed && 'lg:hidden')}>{item.title}</span>
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
          <div className={clsx('mt-4 pt-4 border-t border-omise-border', sidebarCollapsed && 'lg:hidden')}>
            {footerContent}
          </div>
        )}
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
        {/* Close button */}
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
            <Link href="/api-reference/payment-gateway" className="block rounded-md px-2 py-1.5 text-sm bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium">
              Payment Gateway
            </Link>
            <Link href="/api-reference/account-updater" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Account Updater
            </Link>
            <Link href="/api-reference/partner-portal" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Partner Portal
            </Link>
            <Link href="/api-reference/hosted-payments" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Hosted Payments
            </Link>
            <Link href="/api-reference/split-funding" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Split Funding
            </Link>
            <Link href="/api-reference/batch-processing" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Batch Processing
            </Link>
            <Link href="/api-reference/sub-merchant" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Sub-Merchant
            </Link>
            <Link href="/api-reference/reporting" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Reporting
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

        <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
          {/* Documentation content */}
          {children}

          {/* Code samples section - inline */}
          <div className="mt-8">
            <h2 className="text-base font-semibold text-omise-gray-100 mb-4">Code samples</h2>
            <p className="text-sm text-omise-gray-400 mb-4">
              Copy-paste ready code in your preferred language for the Test environment.
            </p>
            <CodeSampleTabs title="API call" samples={samplesWithEnv} />
          </div>

          {/* Try it out accordion */}
          <div className="mt-8">
            <div className="rounded-2xl border border-omise-border overflow-hidden">
              <button
                type="button"
                onClick={() => setTryItExpanded(!tryItExpanded)}
                className="w-full flex items-center justify-between p-4 bg-omise-dark-secondary hover:bg-omise-dark-tertiary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-omise-teal/10 text-omise-cyan">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-omise-gray-100">Try it out</div>
                    <div className="text-xs text-omise-gray-400">
                      Send a test request using the interactive API explorer
                    </div>
                  </div>
                </div>
                <svg
                  className={clsx('w-5 h-5 text-omise-gray-400 transition-transform duration-200', tryItExpanded && 'rotate-180')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={clsx('accordion-content border-t border-omise-border', tryItExpanded ? 'accordion-expanded' : '')}
                data-expanded={tryItExpanded}
              >
                <div className="accordion-inner">
                  {tryItExpanded && (
                    <div className="p-4">
                      {/* Security Warning */}
                      <div className="mb-4 p-3 rounded-xl bg-amber-900/30 border border-amber-600/50 flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <div className="text-sm font-semibold text-amber-400">Security Notice</div>
                          <div className="text-xs text-amber-300/80 mt-1">
                            Do not share screenshots or copy responses when using real credentials.
                          </div>
                        </div>
                      </div>

                      {/* Environment Selection - Test Only */}
                      <div className="mb-4 p-3 rounded-xl bg-omise-dark-tertiary border border-omise-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-omise-gray-300">Server:</span>
                          <div className="flex rounded-lg border border-omise-border bg-omise-dark p-0.5">
                            <button
                              type="button"
                              onClick={() => setEnvironment('cert')}
                              className="rounded-md px-4 py-1.5 text-sm font-semibold bg-gradient-to-r from-omise-teal to-omise-cyan text-white"
                            >
                              Test
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Custom Grouped Form or Swagger UI fallback */}
                      {tryItOutGroups && tryItOutGroups.length > 0 ? (
                        <div className="space-y-4">
                          {/* Grouped Parameter Form */}
                          {tryItOutGroups.map((group) => {
                            const isExpanded = expandedGroups[group.groupName] ?? false
                            const groupStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                              Required: {
                                bg: 'bg-red-950/30',
                                border: 'border-red-900/50',
                                text: 'text-red-400',
                                badge: 'bg-red-900/50 text-red-300',
                              },
                              Recommended: {
                                bg: 'bg-amber-950/30',
                                border: 'border-amber-900/50',
                                text: 'text-amber-400',
                                badge: 'bg-amber-900/50 text-amber-300',
                              },
                              Others: {
                                bg: 'bg-omise-dark-tertiary',
                                border: 'border-omise-border',
                                text: 'text-omise-gray-400',
                                badge: 'bg-omise-dark text-omise-gray-400',
                              },
                            }
                            const style = groupStyles[group.groupName] || groupStyles.Others

                            return (
                              <div key={group.groupName} className="rounded-xl border border-omise-border overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(group.groupName)}
                                  className={clsx('w-full flex items-center justify-between px-4 py-3 cursor-pointer', style.bg)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={clsx('text-sm font-semibold', style.text)}>{group.groupName}</span>
                                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', style.badge)}>
                                      {group.fields.length} {group.fields.length === 1 ? 'field' : 'fields'}
                                    </span>
                                  </div>
                                  <svg
                                    className={clsx('w-4 h-4 text-omise-gray-500 transition-transform', isExpanded && 'rotate-180')}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>

                                {isExpanded && (
                                  <div className="px-4 py-3 bg-omise-dark-secondary space-y-3">
                                    {group.conditional && group.conditional.length > 0 && (
                                      <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900/50">
                                        <div className="text-xs text-blue-300">
                                          <strong>Conditional:</strong>{' '}
                                          {group.conditional.map((c, i) => (
                                            <span key={i}>
                                              {c.oneOf && <span>Provide one of: <code className="font-mono">{c.oneOf.join(' OR ')}</code></span>}
                                              {c.note && <span className="block mt-1 text-blue-400">{c.note}</span>}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {group.description && (
                                      <p className="text-xs text-omise-gray-400">{group.description}</p>
                                    )}
                                    {group.fields.map((field) => (
                                      <div key={field.name} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <label className="font-mono text-sm font-medium text-omise-gray-100">
                                            {field.name}
                                          </label>
                                          <span className="text-xs text-omise-gray-500">{field.type}</span>
                                          {field.enum && (
                                            <span className="rounded-full bg-omise-dark-tertiary px-1.5 py-0.5 text-[10px] text-omise-gray-400">
                                              enum
                                            </span>
                                          )}
                                        </div>
                                        {field.description && (
                                          <p className="text-xs text-omise-gray-400">{field.description.split('\n')[0]}</p>
                                        )}
                                        {field.enum ? (
                                          <select
                                            value={formValues[field.name] || ''}
                                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            className="w-full rounded-lg border border-omise-border bg-omise-dark px-3 py-2 text-sm text-omise-gray-100 focus:border-omise-cyan focus:outline-none focus:ring-1 focus:ring-omise-cyan"
                                          >
                                            <option value="">Select...</option>
                                            {field.enum.map((v) => (
                                              <option key={String(v)} value={String(v)}>
                                                {String(v)}{field.enumDescriptions?.[String(v)] ? ` — ${field.enumDescriptions[String(v)]}` : ''}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            value={formValues[field.name] || ''}
                                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            placeholder={field.example !== undefined ? String(field.example) : field.name}
                                            className="w-full rounded-lg border border-omise-border bg-omise-dark px-3 py-2 text-sm text-omise-gray-100 placeholder:text-omise-gray-600 focus:border-omise-cyan focus:outline-none focus:ring-1 focus:ring-omise-cyan"
                                          />
                                        )}
                                        {shouldShowWarning(field.name) && (
                                          <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-900/50">
                                            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="text-xs text-amber-300 font-medium">
                                              Do not enter real/live data for testing. Use test credentials only.
                                            </span>
                                          </div>
                                        )}
                                        {field.constraints && Object.keys(field.constraints).length > 0 && (
                                          <p className="text-[10px] text-omise-gray-500 font-mono">
                                            {Object.entries(field.constraints).map(([k, v]) => `${k}=${v}`).join(' · ')}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Submit Button */}
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full rounded-xl bg-gradient-to-r from-omise-teal to-omise-cyan px-4 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isSubmitting ? 'Sending...' : 'Send Request'}
                          </button>

                          {/* Response Display */}
                          {response && (() => {
                            // Determine success based on error_code (000 = success), not HTTP status
                            const isSuccess = response.parsedErrorCode === '000'
                            const isError = response.error || (response.parsedErrorCode && response.parsedErrorCode !== '000')

                            return (
                              <div className="rounded-xl border border-omise-border overflow-hidden">
                                <div className="px-4 py-2 bg-omise-dark-tertiary border-b border-omise-border flex items-center gap-2 flex-wrap">
                                  {/* HTTP Status */}
                                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-omise-dark text-omise-gray-400">
                                    HTTP {response.status || 'Error'}
                                  </span>
                                  {/* Gateway error_code - this is what actually matters */}
                                  {response.parsedErrorCode && (
                                    <span className={clsx(
                                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                                      isSuccess
                                        ? 'bg-emerald-900/50 text-emerald-300'
                                        : 'bg-red-900/50 text-red-300'
                                    )}>
                                      error_code={response.parsedErrorCode}
                                      {isSuccess ? ' (Success)' : ' (Error)'}
                                    </span>
                                  )}
                                  {response.error && (
                                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-900/50 text-red-300">
                                      Network Error
                                    </span>
                                  )}
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs text-omise-gray-100 bg-omise-dark max-h-[400px] overflow-y-auto">
                                  {response.error || response.data || 'No response body'}
                                </pre>
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        /* Fallback to Swagger UI when no grouped params */
                        <div className="swagger-panel">
                          <SwaggerUI
                            spec={miniSpec}
                            deepLinking={false}
                            displayRequestDuration
                            docExpansion="list"
                            defaultModelsExpandDepth={-1}
                            requestInterceptor={(req: any) => {
                              let originalUrl = req.url

                              try {
                                if (typeof originalUrl === 'string' && originalUrl.startsWith('http')) {
                                  const u = new URL(originalUrl)
                                  if (u.hostname === 'cert.merchante-solutions.com' || u.hostname === 'api.merchante-solutions.com') {
                                    u.hostname = `${creds.environment}.merchante-solutions.com`
                                    originalUrl = u.toString()
                                  }
                                }
                              } catch {}

                              if (typeof originalUrl === 'string' && originalUrl.startsWith('/api/proxy')) {
                                return req
                              }

                              const method = req.method
                              const headers = req.headers || {}

                              let body: any = undefined
                              try {
                                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
                              } catch {
                                body = req.body
                              }

                              req.url = '/api/proxy'
                              req.method = 'POST'
                              req.headers = { 'content-type': 'application/json' }
                              req.body = JSON.stringify({ url: originalUrl, method, headers, body })

                              return req
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
