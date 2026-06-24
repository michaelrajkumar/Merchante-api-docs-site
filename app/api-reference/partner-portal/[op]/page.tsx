import clsx from 'clsx'
import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildFormPostSamples, buildJsonPostSamples, buildGetQuerySamples } from '@/lib/codeSamples'
import { Markdown } from '@/components/Markdown'
import {
  PARTNER_PORTAL_OPS,
  PARTNER_PORTAL_TAG_ORDER,
  getSchemaTree,
  schemaToExample,
  parsePartnerPortalSpec,
  getParameterGroups,
  groupSchemaNodesByParameterGroups,
  type SchemaNode,
} from '@/lib/partnerPortal'
import { PartnerPortalClient } from './PartnerPortalClient'

type Props = {
  params: Promise<{ op: string }>
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

function SchemaTable({ nodes }: { nodes: SchemaNode[] }) {
  if (!nodes.length) return null

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

export default async function PartnerPortalOpPage({ params }: Props) {
  const { op } = await params
  const current = PARTNER_PORTAL_OPS.find((o) => o.slug === op)
  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    )
  }

  const fullSpecUrl = `/openapi/partner-portal?download=1`
  const fullSpecJsonUrl = `/openapi/partner-portal?download=1&format=json`
  const opSpecUrl = `/openapi/partner-portal/?download=1`
  const opSpecJsonUrl = `/openapi/partner-portal/?download=1&format=json`

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'partner-portal.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = parsePartnerPortalSpec(yamlText)

  const opObj = spec?.paths?.[current.path]?.[current.method.toLowerCase()]
  if (!opObj) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Operation not found in spec</h1>
        <p className="mt-2 text-omise-gray-400">Path: {current.path}, Method: {current.method}</p>
      </main>
    )
  }

  const baseUrl = (spec?.servers?.[1]?.url as string) || 'https://test.salesforce.com'

  // Build mini spec for Swagger
  const miniSpec = {
    openapi: spec.openapi,
    info: spec.info,
    servers: spec.servers,
    paths: { [current.path]: { [current.method.toLowerCase()]: opObj } },
    components: spec.components,
  }

  // Build code samples based on operation type
  let samples
  if (current.slug === 'auth') {
    samples = buildFormPostSamples({
      servers: spec.servers,
      endpointPath: current.path,
      payloadExample: {
        grant_type: 'password',
        client_id: 'YOUR_CLIENT_ID',
        client_secret: 'YOUR_CLIENT_SECRET',
        username: 'partnerportalapi@merchante.com.cert',
        password: 'YOUR_PASSWORD_AND_SECURITY_TOKEN',
      },
    })
  } else if (current.method === 'GET') {
    const pathWithPlaceholder = current.path
      .replace('{opportunityId}', 'YOUR_OPPORTUNITY_ID')
      .replace('{quoteId}', 'YOUR_QUOTE_ID')
    samples = buildGetQuerySamples({
      baseUrl,
      endpointPath: pathWithPlaceholder,
    })
  } else {
    const examplePayload = current.slug === 'create-application'
      ? {
          Opp: { attributes: { type: 'Opportunity' }, BET_Table_ID_API_Field__c: '', Yearly_Net_Revenue__c: 0 },
          Mer: { attributes: { type: 'Account' }, Name: '', Legal_Name__c: '' },
        }
      : current.slug === 'submit-attachments'
      ? {
          Opportunity: { Id: 'YOUR_OPPORTUNITY_ID' },
          attachments: [{ Body: 'BASE64_ENCODED_FILE', ContentType: 'text/plain', Name: 'example.txt' }],
        }
      : {}

    samples = buildJsonPostSamples({
      baseUrl,
      endpointPath: current.path,
      payload: examplePayload,
      headers: { Authorization: 'Bearer YOUR_ACCESS_TOKEN' },
    })
  }

  // Get schema tree for request body
  let requestTree: ReturnType<typeof getSchemaTree> | null = null
  let requestSchema: any = null

  if (current.method === 'GET') {
    const paramsArr = (opObj.parameters || []) as any[]
    const nodes: SchemaNode[] = paramsArr.map((p: any) => ({
      path: p.name,
      name: p.name,
      depth: 0,
      required: !!p.required,
      type: p.schema?.type || 'string',
      description: p.description,
      enum: p.schema?.enum,
      constraints: {
        format: p.schema?.format,
        pattern: p.schema?.pattern,
        minLength: p.schema?.minLength,
        maxLength: p.schema?.maxLength,
      },
    }))
    requestTree = { nodes, enums: [], validations: [] }
  } else if (current.slug === 'auth') {
    requestSchema = opObj?.requestBody?.content?.['application/x-www-form-urlencoded']?.schema
    if (requestSchema) {
      requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })
    }
  } else {
    requestSchema = opObj?.requestBody?.content?.['application/json']?.schema
    if (requestSchema) {
      requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })
    }
  }

  // Get parameter groups for request if available
  let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | null = null

  // For POST/PATCH operations with schemas, check for parameter groups
  if (requestTree && requestSchema) {
    let parameterGroups = null

    // Check for x-parameterGroups on referenced schema
    if (requestSchema.$ref) {
      parameterGroups = getParameterGroups(spec, requestSchema.$ref)
    }
    // Check for x-parameterGroups on inline schema
    else if (requestSchema['x-parameterGroups']) {
      parameterGroups = requestSchema['x-parameterGroups'].map((g: any) => ({
        name: g.name || 'Other',
        fields: Array.isArray(g.fields) ? g.fields : [],
        conditional: g.conditional,
        description: g.description,
      }))
    }

    if (parameterGroups && parameterGroups.length > 0) {
      groupedNodes = groupSchemaNodesByParameterGroups(requestTree.nodes, parameterGroups)
    }
  } else if (current.method === 'GET') {
    // Handle GET request parameter grouping
    const parameters = opObj.parameters || []
    const opParamGroups = opObj['x-parameterGroups']

    if (opParamGroups && opParamGroups.length > 0 && parameters.length > 0) {
      // Convert parameters to SchemaNode format
      const paramNodes: SchemaNode[] = parameters.map((param: any) => ({
        name: param.name,
        path: param.name,
        type: param.schema?.type || 'string',
        required: param.required === true,
        description: param.description,
        enum: param.schema?.enum,
        enumDescriptions: param.schema?.['x-enumDescriptions'],
        example: param.example || param.schema?.example,
        default: param.schema?.default,
        constraints: {
          ...(param.schema?.maxLength && { maxLength: param.schema.maxLength }),
          ...(param.schema?.minLength && { minLength: param.schema.minLength }),
          ...(param.schema?.pattern && { pattern: param.schema.pattern }),
          ...(param.schema?.format && { format: param.schema.format }),
        },
        depth: 0,
      }))

      // Group the parameter nodes
      const parameterGroups = opParamGroups.map((g: any) => ({
        name: g.name || 'Other',
        fields: Array.isArray(g.fields) ? g.fields : [],
        conditional: g.conditional,
        description: g.description,
      }))

      groupedNodes = groupSchemaNodesByParameterGroups(paramNodes, parameterGroups)
    }
  }

  // Parse all responses (200, 201, 400, 404, etc.)
  const responses: {
    code: string
    description?: string
    schema?: any
    tree?: ReturnType<typeof getSchemaTree>
    groupedNodes?: ReturnType<typeof groupSchemaNodesByParameterGroups>
    example?: any
  }[] = []
  const respEntries = Object.entries<any>(opObj.responses || {}).sort(([a], [b]) => {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
  for (const [code, r] of respEntries) {
    const content = r?.content || {}
    const ct = Object.keys(content)[0]
    const schema = ct ? content?.[ct]?.schema : undefined
    const tree = schema ? getSchemaTree(spec, schema, { maxDepth: 8 }) : undefined
    const examples = ct ? content?.[ct]?.examples : undefined
    const firstExKey = examples ? Object.keys(examples)[0] : undefined
    const ex = firstExKey ? examples?.[firstExKey]?.value : schema ? schemaToExample(spec, schema) : undefined

    // Get response parameter groups if available
    // NOTE: Partner Portal specs incorrectly use "Required/Recommended/Others" for responses
    // Map these to the correct response group names: "Common/When Provided/Other Fields"
    let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | undefined
    if (tree && schema) {
      let respGroups = null

      // Check for x-parameterGroups on referenced schema
      if (schema.$ref) {
        respGroups = getParameterGroups(spec, schema.$ref)
      }
      // Check for array schemas with items.$ref (e.g., type: array, items: { $ref: ... })
      else if (schema.type === 'array' && schema.items?.$ref) {
        respGroups = getParameterGroups(spec, schema.items.$ref)
      }
      // Check for x-parameterGroups on inline schema
      else if (schema['x-parameterGroups']) {
        respGroups = schema['x-parameterGroups'].map((g: any) => ({
          name: g.name || 'Other Fields',
          fields: Array.isArray(g.fields) ? g.fields : [],
          conditional: g.conditional,
          description: g.description,
        }))
      }

      if (respGroups && respGroups.length > 0) {
        // Map incorrect response group names to correct ones
        const mappedGroups = respGroups.map((g: any) => ({
          ...g,
          name: g.name === 'Required' ? 'Common' :
                g.name === 'Recommended' ? 'When Provided' :
                g.name === 'Others' ? 'Other Fields' :
                g.name
        }))
        groupedNodes = groupSchemaNodesByParameterGroups(tree.nodes, mappedGroups)
      }
    }

    responses.push({ code, description: r?.description, schema, tree, groupedNodes, example: ex })
  }

  // Prepare Try It Out data (similar to Payment Gateway)
  const tryItOutGroups = groupedNodes ? groupedNodes.map((g) => ({
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

  // Get example values for the first request
  let exampleValues = requestSchema ? schemaToExample(spec, requestSchema) : null

  // For GET operations, create example values from path parameters
  if (current.method === 'GET' && requestTree && !exampleValues) {
    exampleValues = {}
    for (const node of requestTree.nodes) {
      if (!node.name) continue // Skip if name is undefined
      if (node.example !== undefined) {
        exampleValues[node.name] = node.example
      } else if (node.name.toLowerCase().includes('opportunityid')) {
        exampleValues[node.name] = 'YOUR_OPPORTUNITY_ID'
      } else if (node.name.toLowerCase().includes('quoteid')) {
        exampleValues[node.name] = 'YOUR_QUOTE_ID'
      } else {
        exampleValues[node.name] = ''
      }
    }
  }

  return (
    <PartnerPortalClient
      operations={PARTNER_PORTAL_OPS}
      currentOp={current}
      miniSpec={miniSpec}
      codeSamples={samples}
      tagOrder={PARTNER_PORTAL_TAG_ORDER}
      tryItOutGroups={tryItOutGroups}
      exampleValues={exampleValues}
    >
      {/* Documentation content */}
      <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            current.method === 'GET' ? 'bg-blue-50 text-blue-700' :
            current.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
            'bg-amber-50 text-amber-700'
          )}>
            {current.method}
          </span>
          <code className="rounded bg-omise-dark-tertiary px-2.5 py-1 text-xs font-medium text-omise-gray-100">
            {current.path}
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
          {opObj.summary || current.title}
        </h1>

        {/* Description */}
        {opObj.description ? (
          <div className="mt-4 text-sm leading-6 text-omise-gray-300">
            <Markdown>{String(opObj.description)}</Markdown>
          </div>
        ) : (
          <p className="mt-2 text-sm text-omise-gray-400">{current.description}</p>
        )}

        {/* Request Body - For POST */}
        {current.method !== 'GET' && requestTree && requestTree.nodes.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Request Body</h2>
            {current.slug === 'auth' ? (
              <p className="mt-1 text-sm text-omise-gray-400">
                Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">application/x-www-form-urlencoded</code>
              </p>
            ) : (
              <p className="mt-1 text-sm text-omise-gray-400">
                Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">application/json</code>
              </p>
            )}

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
              <SchemaTable nodes={requestTree.nodes} />
            )}

            {/* Enums and Validations collapsibles */}
            {(requestTree.enums.length > 0 || requestTree.validations.length > 0) && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {requestTree.enums.length > 0 && (
                  <details className="rounded-xl border border-omise-border p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">
                      Enums ({requestTree.enums.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {requestTree.enums.map((n) => (
                        <div key={n.path} className="rounded-lg bg-omise-dark-tertiary p-3">
                          <div className="font-mono text-xs text-omise-gray-100">{n.path}</div>
                          <div className="mt-1 font-mono text-[11px] text-omise-gray-300">{(n.enum || []).join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {requestTree.validations.length > 0 && (
                  <details className="rounded-xl border border-omise-border p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">
                      Validations ({requestTree.validations.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {requestTree.validations.map((n) => (
                        <div key={n.path} className="rounded-lg bg-omise-dark-tertiary p-3">
                          <div className="font-mono text-xs text-omise-gray-100">{n.path}</div>
                          <div className="mt-1">{renderConstraints(n.constraints)}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </>
        )}

        {/* Path Parameters - For GET */}
        {current.method === 'GET' && requestTree && requestTree.nodes.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Path Parameters</h2>

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
              <SchemaTable nodes={requestTree.nodes} />
            )}
          </>
        )}

        {/* Response Section - iterate through all response codes */}
        {responses.length > 0 && (
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
        )}

        {/* Business Rules for specific operations */}
        {current.slug === 'auth' && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Important Notes</h3>
            <ul className="mt-2 text-sm text-amber-800 list-disc list-inside space-y-1">
              <li>Auth token is valid for 24 hours</li>
              <li>Password field should contain: password + security token (concatenated)</li>
              <li>Security token may not be required depending on org configuration</li>
              <li>Use the returned <code className="bg-amber-100 px-1 rounded">access_token</code> for subsequent API calls</li>
            </ul>
          </div>
        )}

        {current.slug === 'create-application' && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Business Rules</h3>
            <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>At least one Primary Contact/Beneficial Owner must be identified</li>
              <li>Only one Control Owner is allowed per application</li>
              <li>Only one Authorized Signer is allowed per application</li>
              <li>Maximum 4 Beneficial Owners are allowed per application</li>
              <li>Only 1 Beneficial Owner is allowed for Sole Proprietorship</li>
              <li>Sum of % Ownership for all Beneficial Owners must not exceed 100%</li>
            </ul>
          </div>
        )}

        {current.slug === 'update-application' && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Update Restrictions</h3>
            <ul className="mt-2 text-sm text-amber-800 list-disc list-inside space-y-1">
              <li>Updates to applications in &quot;Pending Underwriting&quot; stage are not allowed</li>
              <li>Updates to applications in &quot;Closed Won&quot; stage are not allowed</li>
              <li>Include the Opportunity SFID for Update requests</li>
              <li>The &quot;id&quot; field represents the SFId of the ObjectType being updated</li>
            </ul>
          </div>
        )}

        {current.slug === 'submit-attachments' && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Attachment Requirements</h3>
            <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Opportunity ID is required</li>
              <li>File size limit: 100 MB per file</li>
              <li>Maximum total attachment size: 2 GB</li>
              <li>Files must be converted to Base64</li>
            </ul>
          </div>
        )}
      </div>
    </PartnerPortalClient>
  )
}
