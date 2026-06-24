'use client'

import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { getApiLabel, getApiSpecUrl } from '@/lib/apis'

export function ApiRefClient({ apiKey }: { apiKey: string }) {
  const label = getApiLabel(apiKey as any)
  const url = getApiSpecUrl(apiKey as any)

  const isPaymentGateway = apiKey === 'payment-gateway'
  const advanced =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('advanced') === '1'
  const resolvedUrl = isPaymentGateway && advanced ? `${url}?advanced=1` : url

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-omise-gray-100">{label}</h1>
        <p className="mt-3 text-omise-gray-400">
          The OpenAPI spec for this API hasn't been added to the site yet.
        </p>
        <p className="mt-2 text-sm text-omise-gray-500">Drop the spec into <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">public/openapi</code> and wire it in <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">lib/apis.ts</code>.</p>
      </div>
    )
  }

  return (
    <div className="swagger-container">
      {isPaymentGateway && (
        <div className="mx-auto mb-3 max-w-6xl px-4">
          <div className="flex items-center justify-end gap-3">
            <a
              className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
              href={advanced ? `/api-reference/${apiKey}` : `/api-reference/${apiKey}?advanced=1`}
            >
              {advanced ? 'Hide advanced /transaction' : 'Show advanced /transaction'}
            </a>
          </div>
        </div>
      )}
      <SwaggerUI
        url={resolvedUrl}
        deepLinking
        displayRequestDuration
        docExpansion="none"
        defaultModelsExpandDepth={-1}
        requestInterceptor={(req: any) => {
          // NOTE: requestInterceptor runs for *all* Swagger UI network calls,
          // including the initial OpenAPI document fetch. If we proxy that spec
          // fetch, the proxy will receive a relative URL (e.g. "/openapi/..."),
          // which breaks URL parsing and causes "Failed to load API definition".
          // So: only proxy "Try it out" calls, not the local spec download.

          // Swagger UI runs in the browser. To avoid CORS + keep secrets off the client,
          // we route "Try it out" traffic through our server-side proxy.
          //
          // IMPORTANT: This assumes JSON bodies. If you later need multipart/file upload,
          // we can extend the proxy + interceptor.

          const originalUrl = req.url

          // Let Swagger fetch OpenAPI docs directly (either from /public/openapi/*
          // or from our generated /openapi/* routes).
          if (typeof originalUrl === 'string' && originalUrl.startsWith('/openapi')) {
            return req
          }

          // Avoid double-proxying.
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
  )
}
