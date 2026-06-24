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
  if (process.env.PROXY_API_KEY_HEADER && process.env.PROXY_API_KEY_VALUE) {
    injected[process.env.PROXY_API_KEY_HEADER] = process.env.PROXY_API_KEY_VALUE
  }
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

function buildTarget(req: NextRequest): URL | null {
  const url = new URL(req.url)
  const target = url.searchParams.get('target')
  if (!target) return null
  try {
    return new URL(target)
  } catch {
    return null
  }
}

async function forward(req: NextRequest) {
  const targetUrl = buildTarget(req)
  if (!targetUrl) return NextResponse.json({ error: 'Missing target' }, { status: 400 })
  if (!isAllowed(targetUrl)) return NextResponse.json({ error: 'Target not allowed' }, { status: 403 })

  const injected = readInjectedHeaders()

  // Copy headers, excluding hop-by-hop
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === 'host' || k === 'content-length' || k === 'connection') return
    headers.set(key, value)
  })
  for (const [k, v] of Object.entries(injected)) headers.set(k, v)

  const method = req.method.toUpperCase()

  // Read body if present
  let body: ArrayBuffer | undefined = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let resp: Response
  try {
    resp = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: body ? Buffer.from(body) : undefined,
      redirect: 'manual',
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

  const outHeaders = new Headers(resp.headers)
  outHeaders.set('cache-control', 'no-store')
  outHeaders.set('x-content-type-options', 'nosniff')
  // Allow browser access - restrict to same origin for security
  // In production, set ALLOWED_ORIGINS env var to your documentation site domain
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  const requestOrigin = req.headers.get('origin') || ''
  if (allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)) {
    outHeaders.set('access-control-allow-origin', requestOrigin)
  } else if (allowedOrigins.length === 0 && requestOrigin) {
    // Development fallback - only allow exact localhost origins (not subdomains like localhost.attacker.com)
    try {
      const originUrl = new URL(requestOrigin)
      if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        outHeaders.set('access-control-allow-origin', requestOrigin)
      }
    } catch {
      // Invalid origin URL, don't set CORS header
    }
  }

  const buf = await resp.arrayBuffer()
  return new NextResponse(Buffer.from(buf), { status: resp.status, headers: outHeaders })
}

export async function GET(req: NextRequest) {
  return forward(req)
}

export async function POST(req: NextRequest) {
  return forward(req)
}

export async function PUT(req: NextRequest) {
  return forward(req)
}

export async function DELETE(req: NextRequest) {
  return forward(req)
}
