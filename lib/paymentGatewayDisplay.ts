import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseYamlSafe } from '@/lib/yamlSafe'
import YAML from 'yaml'

/**
 * MerchantE Payment Gateway is implemented as a single POST /transaction endpoint.
 * The business operation is selected by form field `transaction_type`.
 *
 * Stripe-like docs UX: generate a DISPLAY spec with virtual endpoints
 * (sale/refund/void/...) and (optionally) expose the raw /transaction endpoint.
 */

export type VirtualOp = {
  path: string
  tag: string
  summary: string
  description: string
  schemaRef: string
  txType?: string
}

export type ApiOperation = {
  slug: string
  method: 'post' | 'get' | 'put' | 'patch' | 'delete' | 'options' | 'head'
  path: string
  tag: string
  summary?: string
  description?: string
  operationId?: string
}

export const VIRTUAL_OPS: VirtualOp[] = [
  {
    path: '/sale',
    tag: 'Sales',
    summary: 'Create a sale',
    description: 'Processes a sale transaction (transaction_type=D).',
    schemaRef: '#/components/schemas/SaleRequest',
    txType: 'D',
  },
  {
    path: '/preauth',
    tag: 'Authorization',
    summary: 'Create a pre-authorization',
    description: 'Authorizes payment without capture (transaction_type=P).',
    schemaRef: '#/components/schemas/PreAuthorizationRequest',
    txType: 'P',
  },
  {
    path: '/capture',
    tag: 'Capture',
    summary: 'Capture a pre-authorization',
    description: 'Captures/settles a prior authorization (transaction_type=S).',
    schemaRef: '#/components/schemas/CaptureRequest',
    txType: 'S',
  },
  {
    path: '/refund',
    tag: 'Refunds',
    summary: 'Refund a transaction',
    description: 'Refunds a settled transaction (transaction_type=U).',
    schemaRef: '#/components/schemas/RefundRequest',
    txType: 'U',
  },
  {
    path: '/credit',
    tag: 'Refunds',
    summary: 'Create a credit',
    description: 'Credits a card without referencing an original sale (transaction_type=C).',
    schemaRef: '#/components/schemas/CreditRequest',
    txType: 'C',
  },
  {
    path: '/void',
    tag: 'Voids',
    summary: 'Void a transaction',
    description: 'Voids a transaction prior to settlement (transaction_type=V).',
    schemaRef: '#/components/schemas/VoidRequest',
    txType: 'V',
  },
  {
    path: '/verify',
    tag: 'Verification',
    summary: 'Verify a card',
    description: 'Performs AVS/CVV verification without charging (transaction_type=A).',
    schemaRef: '#/components/schemas/VerificationRequest',
    txType: 'A',
  },
  {
    path: '/create-temporary-token',
    tag: 'Tokens',
    summary: 'Create a temporary token',
    description: 'Creates a temporary token (transaction_type=T).',
    schemaRef: '#/components/schemas/StoreCardRequest',
    txType: 'T',
  },
  {
    path: '/delete-card',
    tag: 'Tokens',
    summary: 'Delete a stored card token',
    description: 'Deletes a stored card token (transaction_type=X).',
    schemaRef: '#/components/schemas/DeleteCardRequest',
    txType: 'X',
  },
  {
    path: '/batch-close',
    tag: 'Batch',
    summary: 'Close the current batch',
    description: 'Closes the current batch (transaction_type=Z).',
    schemaRef: '#/components/schemas/BatchCloseRequest',
    txType: 'Z',
  },
  {
    path: '/offline',
    tag: 'Sales',
    summary: 'Offline / force post',
    description: 'Offline/force post transaction (transaction_type=F).',
    schemaRef: '#/components/schemas/OfflineRequest',
    txType: 'F',
  },
  {
    path: '/apple-pay',
    tag: 'Digital Wallets',
    summary: 'Apple Pay sale',
    description: 'Processes an Apple Pay transaction (transaction_type=D with wallet fields).',
    schemaRef: '#/components/schemas/ApplePayRequest',
    txType: 'D',
  },
  {
    path: '/google-pay',
    tag: 'Digital Wallets',
    summary: 'Google Pay sale',
    description: 'Processes a Google Pay transaction (transaction_type=D with wallet fields).',
    schemaRef: '#/components/schemas/GooglePayRequest',
    txType: 'D',
  },
]

export const TAG_ORDER = [
  'Sales',
  'Authorization',
  'Capture',
  'Refunds',
  'Voids',
  'Verification',
  'Tokens',
  'Batch',
  'Digital Wallets',
  'All',
] as const

export const TAG_DESCRIPTIONS: Record<string, string> = {
  Sales: 'Create sales and force-post/offline transactions.',
  Authorization: 'Authorize funds.',
  Capture: 'Capture/settle prior authorizations.',
  Refunds: 'Refund settled transactions or issue standalone credits.',
  Voids: 'Void transactions prior to settlement.',
  Verification: 'Run AVS/CVV verification without charging.',
  Tokens: 'Tokenize/store cards and delete stored tokens.',
  Batch: 'Batch close operations.',
  'Digital Wallets': 'Apple Pay and Google Pay flows.',
  All: 'Advanced: the raw /transaction endpoint (all operations via transaction_type).',
}

export function slugFromPath(p: string): string {
  const trimmed = p.replace(/^\//, '')
  return trimmed.length ? trimmed.replace(/\//g, '-') : 'root'
}

export function pathFromSlug(slug: string): string {
  const s = slug.replace(/\-/g, '/')
  return s.startsWith('/') ? s : `/${s}`
}

function resolveRef(doc: any, ref: string): any {
  const m = ref.match(/^#\/components\/schemas\/(.+)$/)
  if (!m) return null
  return doc?.components?.schemas?.[m[1]] ?? null
}

function placeholderForType(t?: string) {
  switch (t) {
    case 'integer':
    case 'number':
      return 1
    case 'boolean':
      return true
    case 'array':
      return []
    default:
      return 'string'
  }
}

function mergeExamples(target: Record<string, any>, src: Record<string, any>) {
  for (const [k, v] of Object.entries(src)) {
    if (target[k] === undefined) target[k] = v
  }
}

function schemaToExample(doc: any, schema: any, seen = new Set<any>()): Record<string, any> {
  if (!schema || typeof schema !== 'object') return {}
  if (seen.has(schema)) return {}
  seen.add(schema)

  if (schema.example && typeof schema.example === 'object') return schema.example

  if (schema.$ref && typeof schema.$ref === 'string') {
    const resolved = resolveRef(doc, schema.$ref)
    return schemaToExample(doc, resolved, seen)
  }

  if (Array.isArray(schema.allOf)) {
    const out: Record<string, any> = {}
    for (const s of schema.allOf) mergeExamples(out, schemaToExample(doc, s, seen))
    return out
  }

  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {}
    const out: Record<string, any> = {}
    for (const [name, prop] of Object.entries<any>(props)) {
      if (!prop || typeof prop !== 'object') continue
      if (prop.example !== undefined) out[name] = prop.example
      else if (prop.default !== undefined) out[name] = prop.default
      else if (Array.isArray(prop.enum) && prop.enum.length > 0) out[name] = prop.enum[0]
      else if (prop.$ref) out[name] = schemaToExample(doc, prop, seen)
      else out[name] = placeholderForType(prop.type)
    }

    if (Array.isArray(schema.required)) {
      for (const r of schema.required) {
        if (out[r] === undefined) out[r] = 'string'
      }
    }

    return out
  }

  return {}
}

function exampleForSchemaRef(doc: any, schemaRef: string): Record<string, any> {
  const resolved = resolveRef(doc, schemaRef)
  return schemaToExample(doc, resolved)
}

export function buildPaymentGatewayDisplaySpec(sourceDoc: any, includeAdvanced: boolean) {
  const baseOp = sourceDoc?.paths?.['/transaction']?.post
  if (!baseOp) return sourceDoc

  const display = structuredClone(sourceDoc)

  // The Payment Gateway authenticates via form fields (profile_id/profile_key) rather than
  // HTTP auth headers. Swagger UI's "Authorize" modal is therefore misleading and can
  // render poorly in an embedded panel. Remove security metadata from the DISPLAY spec
  // so the UI focuses on request-body auth fields.
  if (display?.components?.securitySchemes) delete display.components.securitySchemes
  if (display?.security) delete display.security

  const usedTags = new Set<string>(['All'])
  for (const v of VIRTUAL_OPS) usedTags.add(v.tag)
  display.tags = TAG_ORDER.filter((t) => usedTags.has(t)).map((name) => ({
    name,
    description: TAG_DESCRIPTIONS[name] || undefined,
  }))

  const newPaths: Record<string, any> = {}

  if (includeAdvanced) {
    newPaths['/transaction'] = {
      post: {
        ...baseOp,
        security: [],
        tags: ['All'],
        summary: 'Process a payment gateway transaction (raw)',
        description:
          'Advanced: The Payment Gateway is implemented as a single endpoint. ' +
          'Use `transaction_type` to select the business operation (sale, refund, void, etc.).',
        operationId: baseOp.operationId || 'pg_transaction_raw',
      },
    }
  }

  for (const v of VIRTUAL_OPS) {
    const example = exampleForSchemaRef(sourceDoc, v.schemaRef)
    newPaths[v.path] = {
      post: {
        ...baseOp,
        security: [],
        tags: [v.tag],
        summary: v.summary,
        description: v.description,
        operationId: `pg_${v.path.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`,
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: { $ref: v.schemaRef },
              examples: {
                example: {
                  summary: 'Example request',
                  value: example,
                },
              },
            },
          },
        },
        'x-merchante-upstream-path': '/transaction',
        ...(v.txType ? { 'x-merchante-transaction-type': v.txType } : {}),
      },
    }
  }

  display.paths = newPaths
  return display
}

export async function loadPaymentGatewaySourceSpec(): Promise<any> {
  const specPath = path.join(process.cwd(), 'public', 'openapi', 'payment-gateway.yaml')
  const raw = await readFile(specPath, 'utf8')
  return parseYamlSafe(raw)
}

export async function getPaymentGatewayDisplaySpec(includeAdvanced: boolean): Promise<any> {
  const source = await loadPaymentGatewaySourceSpec()
  return buildPaymentGatewayDisplaySpec(source, includeAdvanced)
}

export async function getPaymentGatewayDisplaySpecYaml(includeAdvanced: boolean): Promise<string> {
  const spec = await getPaymentGatewayDisplaySpec(includeAdvanced)
  return YAML.stringify(spec)
}

export async function getPaymentGatewayOperations(includeAdvanced: boolean): Promise<ApiOperation[]> {
  const spec = await getPaymentGatewayDisplaySpec(includeAdvanced)

  const order = new Map<string, number>()
  VIRTUAL_OPS.forEach((v, idx) => order.set(v.path, idx))
  order.set('/transaction', 999)

  const out: ApiOperation[] = []
  for (const [p, methods] of Object.entries<any>(spec.paths || {})) {
    for (const [m, op] of Object.entries<any>(methods || {})) {
      const method = m.toLowerCase() as ApiOperation['method']
      const tag = Array.isArray(op.tags) && op.tags.length ? String(op.tags[0]) : 'Other'
      out.push({
        slug: slugFromPath(p),
        method,
        path: p,
        tag,
        summary: op.summary,
        description: op.description,
        operationId: op.operationId,
      })
    }
  }

  out.sort((a, b) => {
    const ao = order.get(a.path) ?? 500
    const bo = order.get(b.path) ?? 500
    if (ao !== bo) return ao - bo
    return a.path.localeCompare(b.path)
  })

  return out
}

export async function getPaymentGatewayNav(includeAdvanced: boolean): Promise<{
  tags: Array<{ name: string; description?: string }>
  sections: Array<{ tag: string; description?: string; ops: ApiOperation[] }>
}> {
  const spec = await getPaymentGatewayDisplaySpec(includeAdvanced)
  const ops = await getPaymentGatewayOperations(includeAdvanced)

  const tagMeta: Array<{ name: string; description?: string }> = Array.isArray(spec.tags)
    ? spec.tags.map((t: any) => ({ name: String(t.name), description: t.description ? String(t.description) : undefined }))
    : []

  const byTag = new Map<string, ApiOperation[]>()
  for (const op of ops) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, [])
    byTag.get(op.tag)!.push(op)
  }

  const orderedTags = tagMeta.length ? tagMeta.map((t) => t.name) : Array.from(byTag.keys())

  const sections = orderedTags
    .filter((t) => byTag.has(t))
    .map((t) => ({
      tag: t,
      description: tagMeta.find((x) => x.name === t)?.description,
      ops: byTag.get(t)!,
    }))

  return { tags: tagMeta, sections }
}

export async function getPaymentGatewayOperationBySlug(
  slug: string,
  includeAdvanced: boolean
): Promise<ApiOperation | null> {
  const ops = await getPaymentGatewayOperations(includeAdvanced)
  const wantedPath = pathFromSlug(slug)
  return ops.find((o) => o.path === wantedPath && o.method === 'post') ?? null
}
