import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import clsx from 'clsx'
import YAML from 'yaml'
import { buildFormPostSamples } from '@/lib/codeSamples'
import {
  PAYMENT_GATEWAY_OPS,
  PAYMENT_GATEWAY_TAG_ORDER,
  buildPaymentGatewayDisplaySpec,
  getParameterGroups,
  getSchemaTree,
  groupSchemaNodesByParameterGroups,
  makeMiniSpec,
  parsePaymentGatewaySpecYaml,
  schemaToExample,
  type SchemaNode,
} from '@/lib/paymentGateway'
import { ExampleRequestBlock } from '@/components/ExampleRequestBlock'
import { PaymentGatewayClient } from './PaymentGatewayClient'

type Props = {
  params: Promise<{ op: string }>
  searchParams?: Promise<{ advanced?: string }>
}

function splitParagraphs(text?: string) {
  if (!text) return []
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean)
}

function groupOps() {
  const byTag = new Map<string, typeof PAYMENT_GATEWAY_OPS>()
  for (const op of PAYMENT_GATEWAY_OPS) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, [])
    byTag.get(op.tag)!.push(op)
  }
  const out: { tag: string; ops: typeof PAYMENT_GATEWAY_OPS }[] = []
  for (const tag of PAYMENT_GATEWAY_TAG_ORDER) {
    const ops = byTag.get(tag)
    if (ops && ops.length) out.push({ tag, ops })
  }
  for (const [tag, ops] of byTag.entries()) {
    if (!out.some((g) => g.tag === tag)) out.push({ tag, ops })
  }
  return out
}

function renderConstraints(c?: Record<string, any>) {
  if (!c) return <span className="text-omise-gray-500">—</span>
  const parts: string[] = []
  const push = (k: string, v: any) => {
    if (v === undefined) return
    parts.push(`${k}=${String(v)}`)
  }
  push('format', c.format)
  push('pattern', c.pattern)
  push('minLength', c.minLength)
  push('maxLength', c.maxLength)
  push('minimum', c.minimum)
  push('maximum', c.maximum)
  push('minItems', c.minItems)
  push('maxItems', c.maxItems)
  return parts.length ? (
    <span className="font-mono text-[11px] text-omise-gray-300">{parts.join(' · ')}</span>
  ) : (
    <span className="text-omise-gray-500">—</span>
  )
}

type ParsedOptionList = {
  intro: string
  items: Array<{ code: string; meaning: string }>
}

function parseInlineOptionList(description: string): ParsedOptionList | null {
  const desc = (description || '').trim()
  if (!desc) return null

  const re = /\s-\s*([A-Za-z0-9]{1,3})\s*=\s*([\s\S]*?)(?=\s-\s*[A-Za-z0-9]{1,3}\s*=|$)/g
  const items: ParsedOptionList['items'] = []
  let firstIndex: number | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(desc))) {
    if (firstIndex === null) firstIndex = m.index
    const code = String(m[1]).trim()
    const meaning = String(m[2]).trim().replace(/^[-–—]\s*/, '')
    if (code && meaning) items.push({ code, meaning })
  }
  if (items.length < 3 || firstIndex === null) return null

  const intro = desc.slice(0, firstIndex).trim().replace(/[:\s]+$/, '')
  return { intro, items }
}

/** Render a single line/paragraph with callout styling */
function renderTextWithCallouts(text: string) {
  // Check for "Note:" callout
  const noteMatch = text.match(/^Note:\s*(.*)$/i)
  if (noteMatch) {
    return (
      <div className="mt-2 p-2 rounded-lg bg-sky-950/40 border border-sky-900/50">
        <span className="text-xs font-semibold text-sky-400">Note: </span>
        <span className="text-xs text-sky-300">{noteMatch[1]}</span>
      </div>
    )
  }

  // Check for "**Required auth fields:**" callout
  const authMatch = text.match(/^\*\*Required auth fields:\*\*\s*(.*)$/i)
  if (authMatch) {
    return (
      <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-900/50">
        <span className="text-xs font-semibold text-amber-400">Required auth fields: </span>
        <span className="text-xs text-amber-300 font-mono">{authMatch[1]}</span>
      </div>
    )
  }

  // Plain text
  return <span>{text}</span>
}

function renderDescription(description?: string) {
  if (!description) return <span className="text-omise-gray-500">—</span>
  const parsed = parseInlineOptionList(description)
  if (parsed) {
    return (
      <div className="space-y-2">
        {parsed.intro ? <div className="text-xs text-omise-gray-300">{parsed.intro}</div> : null}
        <ul className="list-disc pl-5 space-y-1">
          {parsed.items.map((it) => (
            <li key={it.code} className="text-[12px] text-omise-gray-300">
              <span className="font-mono text-xs text-omise-gray-100">{it.code}</span>
              <span className="mx-2 text-omise-gray-500">—</span>
              {it.meaning}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const parts = description
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="space-y-1">
      {parts.map((p, idx) => {
        // Check if this part is a callout
        if (/^Note:/i.test(p) || /^\*\*Required auth fields:\*\*/i.test(p)) {
          return <div key={idx}>{renderTextWithCallouts(p)}</div>
        }
        return (
          <div key={idx} className="text-xs text-omise-gray-300">
            {p}
          </div>
        )
      })}
    </div>
  )
}

/** Compact parameter row for grouped display */
function ParameterRow({ node }: { node: SchemaNode }) {
  const hasValidation = node.constraints && Object.keys(node.constraints).length > 0
  const hasEnum = node.enum && node.enum.length > 0

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm font-medium text-omise-gray-100">{node.name}</code>
            <span className="text-xs text-omise-gray-500">{node.type}</span>
            {hasEnum && (
              <span className="rounded-full bg-omise-dark-tertiary px-1.5 py-0.5 text-[10px] text-omise-gray-400">
                enum
              </span>
            )}
          </div>
          {node.description && (
            <div className="mt-1">
              {renderDescription(node.description)}
            </div>
          )}
          {hasEnum && node.enumDescriptions && Object.keys(node.enumDescriptions).length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-omise-gray-400 hover:text-omise-gray-300">
                Show values ({node.enum!.length})
              </summary>
              <ul className="mt-1.5 space-y-0.5 pl-2 border-l-2 border-omise-border">
                {node.enum!.map((v) => String(v)).map((v) => (
                  <li key={v} className="text-[11px] text-omise-gray-300">
                    <code className="font-mono text-omise-gray-100">{v}</code>
                    {node.enumDescriptions?.[v] && (
                      <span className="text-omise-gray-500"> — {node.enumDescriptions[v]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {hasValidation && (
            <div className="mt-1 text-[11px] text-omise-gray-500">
              {renderConstraints(node.constraints)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Parameter group section with header and field list */
function ParameterGroupSection({
  groupName,
  nodes,
  conditional,
  description,
  defaultOpen = true,
}: {
  groupName: string
  nodes: SchemaNode[]
  conditional?: Array<{ oneOf?: string[]; note?: string }>
  description?: string
  defaultOpen?: boolean
}) {
  // Styling based on group type (supports both request and response group names)
  const headerStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    // Request groups
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
    // Response groups
    Common: {
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-900/50',
      text: 'text-emerald-400',
      badge: 'bg-emerald-900/50 text-emerald-300',
    },
    'When Provided': {
      bg: 'bg-sky-950/30',
      border: 'border-sky-900/50',
      text: 'text-sky-400',
      badge: 'bg-sky-900/50 text-sky-300',
    },
    'Other Fields': {
      bg: 'bg-omise-dark-tertiary',
      border: 'border-omise-border',
      text: 'text-omise-gray-400',
      badge: 'bg-omise-dark text-omise-gray-400',
    },
  }
  const style = headerStyles[groupName] || headerStyles.Others

  return (
    <details className="group rounded-xl border border-omise-border overflow-hidden" open={defaultOpen}>
      <summary className={clsx('flex items-center justify-between cursor-pointer px-4 py-3', style.bg, style.border)}>
        <div className="flex items-center gap-2">
          <span className={clsx('text-sm font-semibold', style.text)}>{groupName}</span>
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', style.badge)}>
            {nodes.length} {nodes.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
        <svg
          className="w-4 h-4 text-omise-gray-500 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 py-3 bg-omise-dark-secondary">
        {conditional && conditional.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-blue-950/30 border border-blue-900/50">
            <div className="text-xs text-blue-300">
              <strong>Conditional:</strong>{' '}
              {conditional.map((c, i) => (
                <span key={i}>
                  {c.oneOf && <span>Provide one of: <code className="font-mono">{c.oneOf.join(' OR ')}</code></span>}
                  {c.note && <span className="block mt-1 text-blue-400">{c.note}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
        {description && (
          <p className="mb-3 text-xs text-omise-gray-400">{description}</p>
        )}
        {nodes.length > 0 ? (
          <div className="divide-y divide-omise-border">
            {nodes.map((node) => (
              <ParameterRow key={node.path} node={node} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-omise-gray-500 italic">No additional fields</p>
        )}
      </div>
    </details>
  )
}

function SchemaTable({ nodes }: { nodes: ReturnType<typeof getSchemaTree>['nodes'] }) {
  return (
    <div className="mt-4 rounded-xl border border-omise-border">
      {/* Mobile: stacked rows */}
      <div className="md:hidden">
        <div className="divide-y divide-omise-border">
          {nodes.map((n) => (
            <div key={n.path} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="font-mono text-xs text-omise-gray-100"
                    style={{ paddingLeft: n.depth * 12 }}
                  >
                    {n.name}
                    {n.enum ? (
                      <span className="ml-2 rounded-full bg-omise-dark-tertiary px-2 py-0.5 text-[10px] font-semibold text-omise-gray-300">
                        enum
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mt-0.5 truncate font-mono text-[11px] text-omise-gray-500"
                    style={{ paddingLeft: n.depth * 12 }}
                    title={n.path}
                  >
                    {n.path}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-omise-gray-300">{n.type}</div>
                  <div className="mt-1 text-xs">
                    {n.required ? (
                      <span className="rounded-full bg-omise-blue px-2 py-0.5 font-semibold text-white">Yes</span>
                    ) : (
                      <span className="text-omise-gray-500">No</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-omise-gray-500">Validations</div>
                <div className="mt-1">
                  {n.enum && n.enum.length ? (
                    <span className="font-mono text-[11px] text-omise-gray-300">{n.enum.join(', ')}</span>
                  ) : (
                    renderConstraints(n.constraints)
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-omise-gray-300">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-omise-gray-500">Description</div>
                <div className="mt-1">
                  {renderDescription(n.description)}
                </div>

                {n.enum && n.enumDescriptions ? (
                  <div className="mt-2 rounded-lg bg-omise-dark-tertiary p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-omise-gray-500">Options</div>
                    <ul className="mt-1 space-y-1">
                      {n.enum
                        .map((v) => String(v))
                        .filter((v) => n.enumDescriptions?.[v])
                        .map((v) => (
                          <li key={v} className="text-[12px] text-omise-gray-300">
                            <span className="font-mono text-xs text-omise-gray-100">{v}</span>
                            <span className="mx-2 text-omise-gray-500">—</span>
                            {n.enumDescriptions?.[v]}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop/tablet: table with sticky first two columns */}
      <div className="hidden md:block">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-400">
              <tr>
                <th className="sticky left-0 z-20 w-[320px] px-4 py-3 bg-omise-dark-tertiary">Field</th>
                <th className="sticky left-[320px] z-20 w-[140px] px-4 py-3 bg-omise-dark-tertiary">Type</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Validations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-omise-border">
              {nodes.map((n) => (
                <tr key={n.path} className="align-top">
                  <td className="sticky left-0 z-10 w-[320px] bg-omise-dark-secondary px-4 py-3">
                    <div className="font-mono text-xs text-omise-gray-100" style={{ paddingLeft: n.depth * 14 }}>
                      {n.name}
                      {n.enum ? (
                        <span className="ml-2 rounded-full bg-omise-dark-tertiary px-2 py-0.5 text-[10px] font-semibold text-omise-gray-300">
                          enum
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-omise-gray-500" style={{ paddingLeft: n.depth * 14 }}>
                      {n.path}
                    </div>

                    <div className="mt-2" style={{ paddingLeft: n.depth * 14 }}>
                      {renderDescription(n.description)}
                      {n.enum && n.enumDescriptions ? (
                        <div className="mt-2 rounded-lg bg-omise-dark-tertiary p-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-omise-gray-500">Options</div>
                          <ul className="mt-1 space-y-1">
                            {n.enum
                              .map((v) => String(v))
                              .filter((v) => n.enumDescriptions?.[v])
                              .map((v) => (
                                <li key={v} className="text-[12px] text-omise-gray-300">
                                  <span className="font-mono text-xs text-omise-gray-100">{v}</span>
                                  <span className="mx-2 text-omise-gray-500">—</span>
                                  {n.enumDescriptions?.[v]}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="sticky left-[320px] z-10 w-[140px] bg-omise-dark-secondary px-4 py-3 text-xs text-omise-gray-300">
                    {n.type}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {n.required ? (
                      <span className="rounded-full bg-omise-blue px-2 py-0.5 font-semibold text-white">Yes</span>
                    ) : (
                      <span className="text-omise-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {n.enum && n.enum.length ? (
                      <span className="font-mono text-[11px] text-omise-gray-300">{n.enum.join(', ')}</span>
                    ) : (
                      renderConstraints(n.constraints)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default async function PaymentGatewayOperationPage({ params, searchParams }: Props) {
  const { op: opKey } = await params
  const resolvedSearchParams = await searchParams
  const includeAdvanced = resolvedSearchParams?.advanced === '1'

  const fullSpecUrl = `/openapi/payment-gateway?download=1${includeAdvanced ? '&advanced=1' : ''}`
  const fullSpecJsonUrl = `/openapi/payment-gateway?download=1&format=json${includeAdvanced ? '&advanced=1' : ''}`
  const opSpecUrl = `/openapi/payment-gateway/${opKey}?download=1${includeAdvanced ? '&advanced=1' : ''}`
  const opSpecJsonUrl = `/openapi/payment-gateway/${opKey}?download=1&format=json${includeAdvanced ? '&advanced=1' : ''}`

  const specPath = path.join(process.cwd(), 'public', 'openapi', 'payment-gateway.yaml')
  const raw = await readFile(specPath, 'utf8')
  const baseDoc = parsePaymentGatewaySpecYaml(raw)
  const displayDoc = buildPaymentGatewayDisplaySpec(baseDoc, includeAdvanced)

  const selected = PAYMENT_GATEWAY_OPS.find((o) => o.path.replace(/^\//, '') === opKey)

  const isRaw = opKey === 'transaction'
  if (!selected && !isRaw) return notFound()
  if (isRaw && !includeAdvanced) return notFound()

  const virtualPath = isRaw ? '/transaction' : selected!.path
  const op = displayDoc.paths?.[virtualPath]?.post
  if (!op) return notFound()

  const miniSpec = makeMiniSpec(displayDoc, virtualPath)

  const requestSchemaRef = !isRaw && selected ? selected.schemaRef : null
  const requestTree = requestSchemaRef ? getSchemaTree(baseDoc, requestSchemaRef, { maxDepth: 10 }) : null
  const parameterGroups = requestSchemaRef ? getParameterGroups(baseDoc, requestSchemaRef) : null
  const groupedNodes = requestTree && parameterGroups
    ? groupSchemaNodesByParameterGroups(requestTree.nodes, parameterGroups)
    : null

  const reqCt = 'application/x-www-form-urlencoded'
  const opReqExamples = op?.requestBody?.content?.[reqCt]?.examples
  const firstReqExampleKey = opReqExamples ? Object.keys(opReqExamples)[0] : undefined
  const opReqExampleVal = firstReqExampleKey ? opReqExamples?.[firstReqExampleKey]?.value : undefined
  let example = requestSchemaRef ? opReqExampleVal ?? schemaToExample(baseDoc, { $ref: requestSchemaRef }) : null

  const codeSamples = buildFormPostSamples({
    servers: baseDoc?.servers,
    endpointPath: '/transaction',
    payloadExample: example,
  })

  const rawReqContent = isRaw ? (op?.requestBody?.content || {}) : {}
  const rawReqCt = isRaw ? Object.keys(rawReqContent)[0] : undefined
  const rawReqSchema = isRaw && rawReqCt ? rawReqContent?.[rawReqCt]?.schema : undefined

  // Extract parameter groups for raw transaction endpoint
  let rawParameterGroups = null
  let rawGroupedNodes = null
  let rawRequestTree = null

  if (isRaw && rawReqSchema) {
    let schemaForTree = rawReqSchema

    // Handle oneOf schemas (raw endpoint has multiple transaction types)
    if (rawReqSchema.oneOf && Array.isArray(rawReqSchema.oneOf) && rawReqSchema.oneOf.length > 0) {
      // Use the first schema in the oneOf (e.g., SaleRequest) for both tree and parameter groups
      const firstSchema = rawReqSchema.oneOf[0]
      if (firstSchema.$ref) {
        schemaForTree = firstSchema
        rawParameterGroups = getParameterGroups(baseDoc, firstSchema.$ref)
      }
    }
    // Handle direct $ref
    else if (rawReqSchema.$ref) {
      rawParameterGroups = getParameterGroups(baseDoc, rawReqSchema.$ref)
    }
    // Handle inline x-parameterGroups
    else if (rawReqSchema['x-parameterGroups']) {
      rawParameterGroups = rawReqSchema['x-parameterGroups'].map((g: any) => ({
        name: g.name || 'Other',
        fields: Array.isArray(g.fields) ? g.fields : [],
        conditional: g.conditional,
        description: g.description,
      }))
    }

    // Build tree from the same schema we're getting parameter groups from
    rawRequestTree = getSchemaTree(baseDoc, schemaForTree, { maxDepth: 10 })

    if (rawRequestTree && rawParameterGroups && rawParameterGroups.length > 0) {
      rawGroupedNodes = groupSchemaNodesByParameterGroups(rawRequestTree.nodes, rawParameterGroups)
    }

    // Generate example for raw endpoint
    if (!example && rawReqSchema) {
      example = schemaToExample(baseDoc, rawReqSchema)
    }
  }

  const responses: {
    code: string
    description?: string
    schema?: any
    tree?: ReturnType<typeof getSchemaTree>
    groupedNodes?: ReturnType<typeof groupSchemaNodesByParameterGroups>
    example?: any
  }[] = []
  const respEntries = Object.entries<any>(op.responses || {}).sort(([a], [b]) => {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
  for (const [code, r] of respEntries) {
    const content = r?.content || {}
    const ct = Object.keys(content)[0]
    const schema = ct ? content?.[ct]?.schema : undefined
    const tree = schema ? getSchemaTree(baseDoc, schema, { maxDepth: 8 }) : undefined
    const examples = ct ? content?.[ct]?.examples : undefined
    const firstExKey = examples ? Object.keys(examples)[0] : undefined
    const ex = firstExKey ? examples?.[firstExKey]?.value : schema ? schemaToExample(baseDoc, schema) : undefined

    // Get response parameter groups if available
    let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | undefined
    if (tree && schema) {
      let respGroups: ReturnType<typeof getParameterGroups> = null

      // Try getting groups from $ref first
      if (schema.$ref) {
        respGroups = getParameterGroups(baseDoc, schema.$ref)
      }
      // If no $ref, check for x-parameterGroups directly on the schema
      else if (schema['x-parameterGroups']) {
        respGroups = schema['x-parameterGroups'].map((g: any) => ({
          name: g.name || 'Other',
          fields: Array.isArray(g.fields) ? g.fields : [],
          conditional: g.conditional,
          description: g.description,
        }))
      }

      if (respGroups && respGroups.length > 0) {
        groupedNodes = groupSchemaNodesByParameterGroups(tree.nodes, respGroups)
      }
    }

    responses.push({ code, description: r?.description, schema, tree, groupedNodes, example: ex })
  }

  const errorCodes = baseDoc?.['x-error-codes'] || null
  const avsCodes = baseDoc?.['x-avs-codes'] || null
  const cvvCodes = baseDoc?.['x-cvv-codes'] || null

  const groups = groupOps()

  // Prepare data for client component
  const sidebarGroups = groups.map((g) => ({
    tag: g.tag,
    items: g.ops.map((item) => ({
      path: item.path,
      title: item.title,
      href: `/api-reference/payment-gateway/${item.path.replace(/^\//, '')}`,
    })),
  }))

  // Inject "Recurring Payment Rules" link before the Recurring section
  const recurringIndex = sidebarGroups.findIndex((g) => g.tag === 'Recurring')
  if (recurringIndex !== -1) {
    sidebarGroups[recurringIndex].items.unshift({
      path: '/recurring-rules',
      title: '📘 Recurring Payment Rules',
      href: '/api-reference/payment-gateway/recurring-rules',
    })
  }

  const footerContent = (
    <div>
      <div className="mb-3">
        <Link
          className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
          href="/api-reference/payment-gateway/recurring-rules"
        >
          📘 Recurring Payment Rules
        </Link>
      </div>
      <Link
        className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
        href={includeAdvanced ? '/api-reference/payment-gateway/sale' : '/api-reference/payment-gateway/transaction?advanced=1'}
      >
        {includeAdvanced ? 'Hide advanced /transaction' : 'Show advanced /transaction'}
      </Link>
      {includeAdvanced && (
        <div className="mt-2">
          <Link
            className={clsx(
              'block rounded-md px-2 py-1.5 text-sm transition-colors',
              isRaw ? 'bg-omise-blue text-white' : 'text-omise-gray-300 hover:bg-omise-dark-tertiary'
            )}
            href="/api-reference/payment-gateway/transaction?advanced=1"
          >
            Raw /transaction
          </Link>
        </div>
      )}
    </div>
  )

  // Prepare grouped parameters for Try It Out form (serialize for client)
  const activeGroupedNodes = isRaw ? rawGroupedNodes : groupedNodes
  const tryItOutGroups = activeGroupedNodes ? activeGroupedNodes.map((g) => ({
    groupName: g.groupName,
    description: g.description,
    conditional: g.conditional,
    fields: g.nodes.map((n) => ({
      name: n.name,
      type: n.type,
      description: n.description,
      required: n.required,
      enum: n.enum,
      enumDescriptions: n.enumDescriptions,
      example: n.example,
      default: n.default,
      constraints: n.constraints,
    })),
  })) : null

  return (
    <PaymentGatewayClient
      sidebarGroups={sidebarGroups}
      currentPath={virtualPath}
      footerContent={footerContent}
      miniSpec={miniSpec}
      codeSamples={codeSamples}
      tryItOutGroups={tryItOutGroups}
      exampleValues={example}
    >
      {/* Main documentation content */}
      <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
        {/* Endpoint header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            POST
          </span>
          <code className="rounded bg-omise-dark-tertiary px-2.5 py-1 text-xs font-medium text-omise-gray-100">
            {virtualPath}
          </code>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <Link className="font-semibold text-omise-gray-300 hover:text-omise-gray-100" href={opSpecUrl}>
              Download OpenAPI (this endpoint)
            </Link>
            <Link className="text-omise-gray-500 hover:text-omise-gray-100" href={opSpecJsonUrl}>
              JSON
            </Link>
            <span className="text-omise-gray-400">|</span>
            <Link className="font-semibold text-omise-gray-300 hover:text-omise-gray-100" href={fullSpecUrl}>
              Download OpenAPI (generated)
            </Link>
            <Link className="text-omise-gray-500 hover:text-omise-gray-100" href={fullSpecJsonUrl}>
              JSON
            </Link>
          </div>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-omise-gray-100">
          {op.summary || (selected ? selected.title : 'Process a transaction')}
        </h1>

        <div className="mt-3 space-y-3 text-sm leading-6 text-omise-gray-300">
          {splitParagraphs(op.description).map((p, idx) => {
            // Check for "**Required auth fields:**" callout
            const authMatch = p.match(/^\*\*Required auth fields:\*\*\s*(.*)$/i)
            if (authMatch) {
              return (
                <div key={idx} className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/50">
                  <span className="text-sm font-semibold text-amber-400">Required auth fields: </span>
                  <span className="text-sm text-amber-300 font-mono">{authMatch[1]}</span>
                </div>
              )
            }
            // Check for "Note:" callout
            const noteMatch = p.match(/^Note:\s*(.*)$/i)
            if (noteMatch) {
              return (
                <div key={idx} className="p-3 rounded-lg bg-sky-950/40 border border-sky-900/50">
                  <span className="text-sm font-semibold text-sky-400">Note: </span>
                  <span className="text-sm text-sky-300">{noteMatch[1]}</span>
                </div>
              )
            }
            return <p key={idx}>{p}</p>
          })}
        </div>

        {!isRaw && requestTree ? (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Request Parameters</h2>
            <p className="mt-1 text-sm text-omise-gray-400">
              Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">application/x-www-form-urlencoded</code>
            </p>

            {/* Use grouped display if parameter groups are defined */}
            {groupedNodes && groupedNodes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {groupedNodes.map((group) => (
                  <ParameterGroupSection
                    key={group.groupName}
                    groupName={group.groupName}
                    nodes={group.nodes}
                    conditional={group.conditional}
                    description={group.description}
                    defaultOpen={group.groupName === 'Required'}
                  />
                ))}
              </div>
            ) : (
              /* Fallback to table display if no parameter groups */
              <SchemaTable nodes={requestTree.nodes} />
            )}

            <h3 className="mt-8 text-sm font-semibold text-omise-gray-100">Example request</h3>
            <p className="mt-1 text-sm text-omise-gray-400">Starter values are pre-filled; replace with your own credentials and test data.</p>
            {example ? <ExampleRequestBlock example={example} /> : null}
          </>
        ) : null}

        {isRaw && rawRequestTree ? (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Request</h2>
            <p className="mt-1 text-sm text-omise-gray-400">
              This raw endpoint has a large request schema (multiple transaction types). The table shows a shallow overview.
            </p>
            <SchemaTable nodes={rawRequestTree.nodes} />
          </>
        ) : null}

        {responses.length ? (
          <>
            <h2 className="mt-10 text-base font-semibold text-omise-gray-100">Responses</h2>
            <div className="mt-3 space-y-6">
              {responses.map((r) => (
                <div key={r.code} className="rounded-xl border border-omise-border p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-omise-blue px-2.5 py-1 text-xs font-semibold text-white">
                      {r.code}
                    </span>
                    <div className="text-sm font-medium text-omise-gray-100">{r.description || 'Response'}</div>
                  </div>

                  {r.description ? (
                    <p className="mt-2 text-sm text-omise-gray-400">{r.description}</p>
                  ) : null}

                  {r.tree ? (
                    <>
                      {/* Use grouped display for responses if available */}
                      {r.groupedNodes && r.groupedNodes.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {r.groupedNodes.map((group) => (
                            <ParameterGroupSection
                              key={group.groupName}
                              groupName={group.groupName}
                              nodes={group.nodes}
                              conditional={group.conditional}
                              description={group.description}
                              defaultOpen={group.groupName === 'Common' || group.groupName === 'Required'}
                            />
                          ))}
                        </div>
                      ) : (
                        <SchemaTable nodes={r.tree.nodes} />
                      )}

                      {r.example ? (
                        <>
                          <h3 className="mt-6 text-sm font-semibold text-omise-gray-100">Example response</h3>
                          <pre className="mt-2 overflow-x-auto rounded-xl border border-omise-border bg-omise-dark p-4 text-xs text-omise-gray-100">
{YAML.stringify(r.example)}
                          </pre>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {(errorCodes || avsCodes || cvvCodes) ? (
          <>
            <h2 className="mt-10 text-base font-semibold text-omise-gray-100">Error and result codes</h2>
            <p className="mt-2 text-sm text-omise-gray-400">
              The gateway response includes fields such as <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">error_code</code>,
              <code className="ml-2 rounded bg-omise-dark-tertiary px-1.5 py-0.5">avs_result</code>, and
              <code className="ml-2 rounded bg-omise-dark-tertiary px-1.5 py-0.5">cvv2_result</code>. Use the tables to interpret them.
            </p>

            {errorCodes ? (
              <details className="mt-4 rounded-xl border border-omise-border p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">Gateway error codes</summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {Object.entries<any>(errorCodes).map(([brand, codes]) => (
                    <div key={brand} className="rounded-xl border border-omise-border p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-omise-gray-500">{brand}</div>
                      <div className="mt-2 max-h-[320px] overflow-auto rounded-lg border border-omise-border">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-400">
                            <tr>
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Meaning</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-omise-border">
                            {Object.entries<string>(codes).map(([code, meaning]) => (
                              <tr key={code} className="align-top">
                                <td className="px-3 py-2 font-mono text-xs text-omise-gray-100">{code}</td>
                                <td className="px-3 py-2 text-xs text-omise-gray-300">{meaning}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {avsCodes ? (
              <details className="mt-4 rounded-xl border border-omise-border p-4">
                <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">AVS result codes</summary>
                <div className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-omise-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-400">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-omise-border">
                      {Object.entries<string>(avsCodes).map(([code, meaning]) => (
                        <tr key={code}>
                          <td className="px-3 py-2 font-mono text-xs text-omise-gray-100">{code}</td>
                          <td className="px-3 py-2 text-xs text-omise-gray-300">{meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}

            {cvvCodes ? (
              <details className="mt-4 rounded-xl border border-omise-border p-4">
                <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">CVV result codes</summary>
                <div className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-omise-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-400">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-omise-border">
                      {Object.entries<string>(cvvCodes).map(([code, meaning]) => (
                        <tr key={code}>
                          <td className="px-3 py-2 font-mono text-xs text-omise-gray-100">{code}</td>
                          <td className="px-3 py-2 text-xs text-omise-gray-300">{meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </PaymentGatewayClient>
  )
}
