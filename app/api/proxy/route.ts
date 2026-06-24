import { NextRequest, NextResponse } from 'next/server'

// Default allowlist of MerchantE domains for security
// Can be overridden via PROXY_ALLOWLIST environment variable
const DEFAULT_ALLOWLIST = [
  'www.merchante-solutions.com',
  'test.merchante-solutions.com',
  'cert.merchante-solutions.com',
  'api.merchante-solutions.com',
  'api.merchante.com',
  'sandbox.merchante.com',
  'merchante-solutions.com',
  'merchante-solutions.my.salesforce.com',
  'merchante-solutions--cert.my.salesforce.com',
  'test.salesforce.com',
]

const ALLOWLIST = (process.env.PROXY_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Use configured allowlist if provided, otherwise use secure defaults
const EFFECTIVE_ALLOWLIST = ALLOWLIST.length > 0 ? ALLOWLIST : DEFAULT_ALLOWLIST

function isAllowed(targetUrl: URL) {
  // Only allow HTTPS for security
  if (targetUrl.protocol !== 'https:') {
    return false
  }
  const hostport = targetUrl.port ? `${targetUrl.hostname}:${targetUrl.port}` : targetUrl.hostname
  return EFFECTIVE_ALLOWLIST.includes(hostport) || EFFECTIVE_ALLOWLIST.includes(targetUrl.hostname)
}

function readInjectedHeaders(): Record<string, string> {
  const injected: Record<string, string> = {}

  // Simple single header injection
  if (process.env.PROXY_API_KEY_HEADER && process.env.PROXY_API_KEY_VALUE) {
    injected[process.env.PROXY_API_KEY_HEADER] = process.env.PROXY_API_KEY_VALUE
  }

  // Optional JSON map injection
  if (process.env.PROXY_INJECT_HEADERS_JSON) {
    try {
      const obj = JSON.parse(process.env.PROXY_INJECT_HEADERS_JSON)
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'string') injected[k] = v
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return injected
}

// Virtual doc-only endpoints we expose in the generated display spec.
// These map back to MerchantE's real /transaction endpoint.
const VIRTUAL_PATHS = new Set([
  'sale',
  'preauth',
  'capture',
  'reauthorize',
  'refund',
  'credit',
  'void',
  'verify',
  'store-card',
  'delete-card',
  'batch-close',
  'inquiry',
  'offline',
  'apple-pay',
  'google-pay',
])

function rewriteVirtualPathToTransaction(target: URL): URL {
  // Example incoming (from Swagger UI servers + path):
  // https://cert.merchante-solutions.com/mes-api/tridentApi/sale
  // Rewrite only the last segment if it's one of our virtual paths.
  const parts = target.pathname.split('/').filter(Boolean)
  if (parts.length === 0) return target

  const last = parts[parts.length - 1]
  if (!VIRTUAL_PATHS.has(last)) return target

  parts[parts.length - 1] = 'transaction'
  target.pathname = '/' + parts.join('/')
  return target
}

export async function POST(req: NextRequest) {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { url, method, headers, body } = payload || {}

  if (!url || !method) {
    return NextResponse.json({ error: 'Missing url/method' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 })
  }

  // If Swagger UI is using our display spec, it will call doc-only endpoints
  // like /sale, /refund etc. MerchantE doesn't have these paths, so rewrite
  // the outgoing call back to /transaction.
  target = rewriteVirtualPathToTransaction(target)

  if (!isAllowed(target)) {
    return NextResponse.json({ error: 'Target not allowlisted' }, { status: 403 })
  }

  const injectedHeaders = readInjectedHeaders()

  // Clean hop-by-hop/unsafe headers
  const forwardedHeaders: Record<string, string> = {}
  if (headers && typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      const key = String(k).toLowerCase()
      if (
        ['host', 'connection', 'content-length', 'accept-encoding', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'].includes(
          key,
        )
      ) {
        continue
      }
      if (typeof v === 'string') forwardedHeaders[k] = v
    }
  }

  let upstreamBody: BodyInit | undefined = undefined
  if (body !== undefined && body !== null) {
    const contentTypeHeader = Object.entries(forwardedHeaders).find(([h]) => h.toLowerCase() === 'content-type')
    const contentType = (contentTypeHeader?.[1] || '').toLowerCase()

    // If Swagger produced an object body but the request is urlencoded, encode it.
    if (typeof body === 'object' && body && contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        if (v === undefined || v === null) continue
        params.set(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
      upstreamBody = params.toString()
    } else {
      // Keep as-is if already a string; otherwise JSON stringify.
      upstreamBody = typeof body === 'string' ? body : JSON.stringify(body)
    }

    // If no content-type provided, default to JSON.
    const hasContentType = Object.keys(forwardedHeaders).some((h) => h.toLowerCase() === 'content-type')
    if (!hasContentType) forwardedHeaders['content-type'] = 'application/json'
  }

  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(target.toString(), {
      method: String(method).toUpperCase(),
      headers: {
        ...forwardedHeaders,
        ...injectedHeaders,
      },
      body: upstreamBody,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }
  clearTimeout(timeoutId)

  const contentType = upstreamRes.headers.get('content-type') || 'text/plain; charset=utf-8'
  const raw = await upstreamRes.text()

  return new NextResponse(raw, {
    status: upstreamRes.status,
    headers: {
      'content-type': contentType,
      'x-content-type-options': 'nosniff',
      'x-proxied-by': 'merchant-e-docs-proxy',
    },
  })
}
