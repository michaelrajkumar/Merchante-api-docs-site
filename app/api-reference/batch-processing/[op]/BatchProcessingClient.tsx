'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { CodeSampleTabs, type CodeSample } from '@/components/CodeSampleTabs'
import { useCredentialMasking } from '@/lib/useCredentialMasking'
import { useBatchProcessingCredentials, BatchProcessingEnvironmentSelector } from '@/components/BatchProcessingCredentialsBox'

type OpDef = {
  slug: string
  title: string
  method: 'POST'
  path: string
  tag: string
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
  operations: OpDef[]
  currentOp: OpDef
  miniSpec: any
  codeSamples: CodeSample[]
  tagOrder: string[]
  tryItOutGroups?: TryItOutGroup[] | null
  exampleValues?: Record<string, any> | null
  contentType: string
  children: React.ReactNode
}

function groupOpsByTag(ops: OpDef[], tagOrder: string[]) {
  const byTag = new Map<string, OpDef[]>()
  for (const op of ops) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, [])
    byTag.get(op.tag)!.push(op)
  }
  const result = new Map<string, OpDef[]>()
  for (const tag of tagOrder) {
    if (byTag.has(tag)) result.set(tag, byTag.get(tag)!)
  }
  for (const [tag, items] of byTag.entries()) {
    if (!result.has(tag)) result.set(tag, items)
  }
  return result
}

export function BatchProcessingClient({
  operations,
  currentOp,
  miniSpec,
  codeSamples,
  tagOrder,
  tryItOutGroups,
  exampleValues,
  contentType,
  children
}: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tryItExpanded, setTryItExpanded] = useState(false)

  // Batch Processing credentials
  const { creds, setServerUrl } = useBatchProcessingCredentials()

  // Mask credentials in Swagger UI cURL output
  useCredentialMasking()

  // Try It Out form state
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Required: true })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{ status: number; data: any; error?: string } | null>(null)

  // Initialize form with example values
  useEffect(() => {
    if (exampleValues && Object.keys(formValues).length === 0) {
      const initial: Record<string, string> = {}
      for (const [key, val] of Object.entries(exampleValues)) {
        initial[key] = typeof val === 'string' ? val : JSON.stringify(val ?? '')
      }
      setFormValues(initial)
    }
  }, [exampleValues])

  // Reset form when operation changes
  useEffect(() => {
    setFormValues({})
    setResponse(null)
    setExpandedGroups({ Required: true })
  }, [currentOp.slug])

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
      const baseUrl = creds.serverUrl || miniSpec?.servers?.[0]?.url || 'https://www.merchante-solutions.com/srv/api'
      const url = `${baseUrl.replace(/\/$/, '')}${currentOp.path}`
      const method = currentOp.method

      let headers: Record<string, string>
      let body: string

      if (contentType === 'multipart/form-data') {
        // For multipart, we'll need to use FormData
        const formData = new FormData()
        for (const [key, val] of Object.entries(formValues)) {
          if (val !== undefined && val !== '') {
            formData.append(key, String(val))
          }
        }
        headers = {}
        body = formData as any // Will be handled by fetch
      } else {
        // For form-urlencoded
        const formData = new URLSearchParams()
        for (const [key, val] of Object.entries(formValues)) {
          if (val !== undefined && val !== '') {
            formData.append(key, String(val))
          }
        }
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
        body = formData.toString()
      }

      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers,
          body,
        }),
      })

      let data: any
      const contentTypeHeader = res.headers.get('content-type')
      if (contentTypeHeader?.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      setResponse({ status: res.status, data })
    } catch (err) {
      setResponse({ status: 0, data: null, error: String(err) })
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const grouped = groupOpsByTag(operations, tagOrder)

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-omise-border">
        <div className="flex items-center justify-between">
          <div className={clsx(sidebarCollapsed && 'lg:hidden')}>
            <div className="text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Batch Processing</div>
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
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([tag, ops]) => (
            <div key={tag}>
              <div className={clsx(
                'mb-2 text-xs font-semibold uppercase tracking-wide text-omise-gray-500',
                sidebarCollapsed && 'lg:text-center lg:text-[10px]'
              )}>
                {sidebarCollapsed ? tag.slice(0, 3) : tag}
              </div>
              <ul className="space-y-1">
                {ops.map((o) => {
                  const href = `/api-reference/batch-processing/${o.slug}`
                  const active = o.slug === currentOp.slug
                  return (
                    <li key={o.slug}>
                      <Link
                        href={href}
                        className={clsx(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          active ? 'bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium' : 'text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan',
                          sidebarCollapsed && 'lg:px-1 lg:text-center lg:text-xs'
                        )}
                        title={sidebarCollapsed ? o.title : undefined}
                      >
                        {sidebarCollapsed ? (
                          <span className="hidden lg:inline">{o.title.slice(0, 2)}</span>
                        ) : null}
                        <span className={clsx(sidebarCollapsed && 'lg:hidden')}>{o.title}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
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
            <Link href="/api-reference/batch-processing" className="block rounded-md px-2 py-1.5 text-sm bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium">
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
          <div className="mt-8">
            <h2 className="text-base font-semibold text-omise-gray-100 mb-4">Code samples</h2>
            <p className="text-sm text-omise-gray-400 mb-4">
              Copy-paste ready code in your preferred language for {contentType === 'multipart/form-data' ? 'multipart file upload' : 'form POST'} requests.
            </p>
            <CodeSampleTabs title={contentType === 'multipart/form-data' ? 'Multipart Upload' : 'Form POST'} samples={codeSamples} />
          </div>

        </div>
      </main>
    </div>
  )
}
