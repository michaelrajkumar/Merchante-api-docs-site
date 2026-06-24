'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { CodeSampleTabs, type CodeSample } from '@/components/CodeSampleTabs'
import { useCredentialMasking } from '@/lib/useCredentialMasking'
import { type AccountUpdaterOp, ACCOUNT_UPDATER_TAG_ORDER } from '@/lib/accountUpdater'
import { useAusCredentials, AusEnvironmentSelector } from '@/components/AusCredentialsBox'

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
  conditional?: any
  fields: TryItOutField[]
}

type Props = {
  operations: AccountUpdaterOp[]
  currentOp: AccountUpdaterOp
  miniSpec: any
  codeSamples: CodeSample[]
  tagOrder: string[]
  tryItOutGroups: TryItOutGroup[] | null
  exampleValues: Record<string, any> | null
  queryParams: any[]
  children: React.ReactNode
}

function groupOpsByTag(ops: AccountUpdaterOp[], tagOrder: string[]) {
  const groups = new Map<string, AccountUpdaterOp[]>()
  for (const tag of tagOrder) {
    groups.set(tag, [])
  }
  for (const op of ops) {
    const existing = groups.get(op.tag) || []
    existing.push(op)
    groups.set(op.tag, existing)
  }
  return groups
}

export function AccountUpdaterClient({
  operations,
  currentOp,
  miniSpec,
  codeSamples,
  tagOrder,
  tryItOutGroups,
  exampleValues,
  queryParams,
  children,
}: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tryItExpanded, setTryItExpanded] = useState(false)

  // Account Updater credentials
  const { creds, setServerUrl } = useAusCredentials()

  // Custom form state for POST
  const [formValues, setFormValues] = useState<Record<string, any>>(exampleValues || {})
  const [fileInputKey, setFileInputKey] = useState(0)
  const [submitStatus, setSubmitStatus] = useState<{
    state: 'idle' | 'loading' | 'success' | 'error'
    message?: string
    response?: string
  }>({ state: 'idle' })

  // Custom form state for GET
  const [queryFormValues, setQueryFormValues] = useState<Record<string, any>>({
    userId: 'ausmerchant',
    userPass: 'SecureP@ss123',
    merchId: '941000057778',
    rspfId: '',
  })
  const [getSubmitStatus, setGetSubmitStatus] = useState<{
    state: 'idle' | 'loading' | 'success' | 'error'
    message?: string
    response?: string
  }>({ state: 'idle' })

  // Mask credentials in Swagger UI cURL output
  useCredentialMasking()

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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentOp.slug])

  // Close mobile menu on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Reset form values when operation changes
  useEffect(() => {
    setFormValues(exampleValues || {})
    setFileInputKey((k) => k + 1)
    setSubmitStatus({ state: 'idle' })
    setGetSubmitStatus({ state: 'idle' })
  }, [currentOp.slug, exampleValues])

  const hasCustomForm = currentOp.method === 'POST' && tryItOutGroups && tryItOutGroups.length > 0

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitStatus({ state: 'loading' })

    try {
      const formData = new FormData()
      for (const [key, value] of Object.entries(formValues)) {
        if (key === 'file' && value instanceof File) {
          formData.append(key, value)
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value))
        }
      }

      const baseUrl = creds.serverUrl || miniSpec?.servers?.[0]?.url || 'https://www.merchante-solutions.com/srv/api'
      const url = `${baseUrl}${currentOp.path}`

      const response = await fetch('/api/proxy-raw?target=' + encodeURIComponent(url), {
        method: 'POST',
        body: formData,
      })

      const responseText = await response.text()

      if (response.ok) {
        setSubmitStatus({
          state: 'success',
          message: `${response.status} ${response.statusText}`,
          response: responseText,
        })
      } else {
        setSubmitStatus({
          state: 'error',
          message: `${response.status} ${response.statusText}`,
          response: responseText,
        })
      }
    } catch (err: any) {
      setSubmitStatus({
        state: 'error',
        message: err?.message || 'Network error',
      })
    }
  }

  async function handleGetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGetSubmitStatus({ state: 'loading' })

    try {
      const baseUrl = creds.serverUrl || miniSpec?.servers?.[0]?.url || 'https://www.merchante-solutions.com/srv/api'
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(queryFormValues)) {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      }
      const url = `${baseUrl}${currentOp.path}?${params.toString()}`

      const response = await fetch('/api/proxy-raw?target=' + encodeURIComponent(url), {
        method: 'GET',
      })

      const responseText = await response.text()

      if (response.ok) {
        setGetSubmitStatus({
          state: 'success',
          message: `${response.status} ${response.statusText}`,
          response: responseText,
        })
      } else {
        setGetSubmitStatus({
          state: 'error',
          message: `${response.status} ${response.statusText}`,
          response: responseText,
        })
      }
    } catch (err: any) {
      setGetSubmitStatus({
        state: 'error',
        message: err?.message || 'Network error',
      })
    }
  }

  function updateFormValue(name: string, value: any) {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  function updateQueryFormValue(name: string, value: any) {
    setQueryFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const grouped = groupOpsByTag(operations, tagOrder)

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-omise-border">
        <div className="flex items-center justify-between">
          <div className={clsx(sidebarCollapsed && 'lg:hidden')}>
            <div className="text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Account Updater</div>
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
        {Array.from(grouped.entries()).map(([tag, ops]) => {
          if (ops.length === 0) return null
          return (
            <div key={tag} className="mb-6 last:mb-0">
              <div className={clsx('mb-2 text-xs font-semibold uppercase tracking-wide text-omise-gray-500', sidebarCollapsed && 'lg:hidden')}>
                {tag}
              </div>
              <ul className="space-y-1">
                {ops.map((o) => {
                  const href = `/api-reference/account-updater/${o.slug}`
                  const active = o.slug === currentOp.slug
                  return (
                    <li key={o.slug}>
                      <Link
                        href={href}
                        className={clsx(
                          'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          active ? 'bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium' : 'text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan',
                          sidebarCollapsed && 'lg:justify-center lg:px-2'
                        )}
                        title={sidebarCollapsed ? o.title : undefined}
                      >
                        <span className={clsx(sidebarCollapsed && 'lg:hidden')}>{o.title}</span>
                        <span className={clsx(sidebarCollapsed ? 'lg:inline hidden' : 'hidden')}>{o.title.slice(0, 2)}</span>
                        <span className={clsx('text-xs', active ? 'text-white/80' : 'text-omise-gray-500', sidebarCollapsed && 'lg:hidden')}>
                          {o.method}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        <div className={clsx('mt-5 border-t border-omise-border pt-4 text-xs text-omise-gray-500', sidebarCollapsed && 'lg:hidden')}>
          Uses request/response files. See <Link href="/api-reference/account-updater/file-formats" className="font-semibold text-omise-cyan hover:text-omise-teal underline">File formats</Link> documentation.
        </div>
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
            <Link href="/api-reference/payment-gateway" className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
              Payment Gateway
            </Link>
            <Link href="/api-reference/account-updater" className="block rounded-md px-2 py-1.5 text-sm bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium">
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

          {/* Code samples section */}
          {codeSamples && codeSamples.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-omise-gray-100 mb-4">Code samples</h2>
              <p className="text-sm text-omise-gray-400 mb-4">
                Copy-paste ready code in your preferred language.
              </p>
              <CodeSampleTabs title="API call" samples={codeSamples} />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
