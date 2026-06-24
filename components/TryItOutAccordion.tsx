'use client'

import { useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import clsx from 'clsx'

type Props = {
  spec: any
  defaultExpanded?: boolean
  environment?: 'cert' | 'api'
}

export function TryItOutAccordion({ spec, defaultExpanded = false, environment = 'cert' }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-2xl border border-omise-border overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-omise-dark-tertiary hover:bg-omise-dark-secondary transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-omise-blue text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Try it out</div>
            <div className="text-xs text-omise-gray-300">
              Send a test request using the interactive API explorer
            </div>
          </div>
        </div>
        <svg
          className={clsx('w-5 h-5 text-omise-gray-400 transition-transform duration-200', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion content */}
      <div
        className={clsx(
          'accordion-content border-t border-omise-border',
          expanded ? 'accordion-expanded' : ''
        )}
        data-expanded={expanded}
      >
        <div className="accordion-inner">
          {expanded && (
            <div
              className="swagger-panel p-4"
              onSubmitCapture={(e) => e.preventDefault()}
            >
              <div className="mb-4 p-3 rounded-xl bg-omise-dark-tertiary text-xs text-omise-gray-400">
                Requests are sent via the docs proxy (<code className="rounded bg-omise-dark px-1.5 py-0.5">/api/proxy</code>).
                Enter credentials in the form fields below.
              </div>
              <SwaggerUI
                spec={spec}
                deepLinking={false}
                displayRequestDuration
                docExpansion="list"
                defaultModelsExpandDepth={-1}
                requestInterceptor={(req: any) => {
                  let originalUrl = req.url

                  // Apply environment selection to the upstream host
                  try {
                    if (typeof originalUrl === 'string' && originalUrl.startsWith('http')) {
                      const u = new URL(originalUrl)
                      if (u.hostname === 'cert.merchante-solutions.com' || u.hostname === 'api.merchante-solutions.com') {
                        u.hostname = `${environment}.merchante-solutions.com`
                        originalUrl = u.toString()
                      }
                    }
                  } catch {}

                  // Avoid double-proxying
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
      </div>
    </div>
  )
}
