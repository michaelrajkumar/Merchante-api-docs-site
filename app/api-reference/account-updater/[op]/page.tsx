import clsx from 'clsx'
import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildGetQuerySamples, buildMultipartPostSamples } from '@/lib/codeSamples'
import { Markdown } from '@/components/Markdown'
import {
  ACCOUNT_UPDATER_OPS,
  ACCOUNT_UPDATER_TAG_ORDER,
  getSchemaTree,
  schemaToExample,
  parseAccountUpdaterSpec,
  getParameterGroups,
  groupSchemaNodesByParameterGroups,
  type SchemaNode,
} from '@/lib/accountUpdater'
import { AccountUpdaterClient } from './AccountUpdaterClient'

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

export default async function AccountUpdaterOpPage({ params }: Props) {
  const { op } = await params
  const current = ACCOUNT_UPDATER_OPS.find((o) => o.slug === op)
  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    )
  }

  const fullSpecUrl = `/openapi/account-updater?download=1`
  const fullSpecJsonUrl = `/openapi/account-updater?download=1&format=json`
  const opSpecUrl = `/openapi/account-updater/${op}?download=1`
  const opSpecJsonUrl = `/openapi/account-updater/${op}?download=1&format=json`

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'account-updater.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = parseAccountUpdaterSpec(yamlText)

  const opObj = spec?.paths?.[current.path]?.[current.method.toLowerCase()]
  if (!opObj) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Operation not found in spec</h1>
        <p className="mt-2 text-omise-gray-400">Path: {current.path}, Method: {current.method}</p>
      </main>
    )
  }

  const baseUrl = (spec?.servers?.[0]?.url as string) || 'https://www.merchante-solutions.com/srv/api'

  // Build mini spec for Swagger
  const miniSpec = {
    openapi: spec.openapi,
    info: spec.info,
    servers: spec.servers,
    paths: { [current.path]: { [current.method.toLowerCase()]: opObj } },
    components: spec.components,
  }

  // Build code samples
  let samples = []
  if (current.method === 'GET') {
    samples = buildGetQuerySamples({
      baseUrl,
      endpointPath: current.path,
      params: {
        userId: 'ausmerchant',
        userPass: 'SecureP@ss123',
        merchId: '941000057778',
      },
    })
  } else {
    samples = buildMultipartPostSamples({
      baseUrl,
      endpointPath: current.path,
      fields: {
        userId: 'ausmerchant',
        userPass: 'SecureP@ss123',
        merchId: '941000057778',
      },
      fileFieldName: 'file',
      filePlaceholder: '(binary file content)',
    })
  }

  // Get schema tree for POST request body
  let requestTree: ReturnType<typeof getSchemaTree> | null = null
  let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | null = null

  if (current.method === 'POST') {
    const requestSchema = opObj?.requestBody?.content?.['multipart/form-data']?.schema
    if (requestSchema) {
      requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })

      let parameterGroups = null
      if (requestSchema.$ref) {
        parameterGroups = getParameterGroups(spec, requestSchema.$ref)
      } else if (requestSchema['x-parameterGroups']) {
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

  // Prepare Try It Out data for POST
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

  // Get example values
  const requestSchema = current.method === 'POST' ? opObj?.requestBody?.content?.['multipart/form-data']?.schema : null
  let exampleValues = requestSchema ? schemaToExample(spec, requestSchema) : null

  // Get query parameters for GET requests
  const queryParams = current.method === 'GET' ? (opObj.parameters || []) : []

  // Process responses and add parameter grouping
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
    const ex = firstExKey ? examples?.[firstExKey]?.value : undefined

    // Get response parameter groups if available
    let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | undefined
    if (tree && schema?.$ref) {
      const respGroups = getParameterGroups(spec, schema.$ref)
      if (respGroups && respGroups.length > 0) {
        groupedNodes = groupSchemaNodesByParameterGroups(tree.nodes, respGroups)
      }
    }

    responses.push({ code, description: r?.description, schema, tree, groupedNodes, example: ex })
  }

  return (
    <AccountUpdaterClient
      operations={ACCOUNT_UPDATER_OPS}
      currentOp={current}
      miniSpec={miniSpec}
      codeSamples={samples}
      tagOrder={ACCOUNT_UPDATER_TAG_ORDER}
      tryItOutGroups={tryItOutGroups}
      exampleValues={exampleValues}
      queryParams={queryParams}
    >
      {/* Documentation content */}
      <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            current.method === 'POST' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
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
        {current.method === 'POST' && requestTree && requestTree.nodes.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Request Body</h2>
            <p className="mt-1 text-sm text-omise-gray-400">
              Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">multipart/form-data</code>
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
            ) : null}
          </>
        )}

        {/* Query Parameters - For GET */}
        {current.method === 'GET' && (groupedNodes || queryParams.length > 0) && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Query Parameters</h2>

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
            ) : queryParams.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-omise-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-omise-dark-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Parameter</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Required</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-omise-border bg-omise-dark-secondary">
                    {queryParams.map((param: any, idx: number) => (
                      <tr key={idx} className="align-top">
                        <td className="px-4 py-3">
                          <code className="font-mono text-sm font-medium text-omise-gray-100">{param.name}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-omise-gray-300">{param.schema?.type || 'string'}</td>
                        <td className="px-4 py-3 text-xs">
                          {param.required ? (
                            <span className="rounded-full bg-omise-blue px-2 py-0.5 font-semibold text-white">Yes</span>
                          ) : (
                            <span className="text-omise-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-omise-gray-300 max-w-md">
                          <Markdown>{param.description || '—'}</Markdown>
                          {param.schema?.enum && (
                            <div className="mt-1">
                              <span className="text-omise-gray-500">Values:</span>{' '}
                              <code className="font-mono text-xs">{param.schema.enum.join(', ')}</code>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}

        {/* Responses Section */}
        <div className="mt-10">
          <h2 className="text-base font-semibold text-omise-gray-100">Responses</h2>
          <div className="mt-4 space-y-6">
            {responses.map((r) => (
              <div key={r.code} className="rounded-xl border border-omise-border p-4">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    r.code.startsWith('2') ? 'bg-emerald-100 text-emerald-700' :
                    r.code.startsWith('4') ? 'bg-amber-100 text-amber-700' :
                    r.code.startsWith('5') ? 'bg-red-100 text-red-700' :
                    'bg-omise-dark-tertiary text-omise-gray-300'
                  )}>
                    {r.code}
                  </span>
                  <div className="text-sm font-medium text-omise-gray-100">
                    {r.description?.split('.')[0] || 'Response'}
                  </div>
                </div>

                {r.description && (
                  <div className="mt-2 text-sm text-omise-gray-400">
                    <Markdown>{r.description}</Markdown>
                  </div>
                )}

                {/* Response schema with parameter groups */}
                {r.tree && (
                  <>
                    {r.groupedNodes && r.groupedNodes.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {r.groupedNodes.map((group) => (
                          <ParameterGroupSection
                            key={group.groupName}
                            groupName={group.groupName}
                            nodes={group.nodes}
                            conditional={group.conditional}
                            description={group.description}
                            defaultOpen={group.groupName === 'Common'}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                )}

                {r.example && (
                  <>
                    <h4 className="mt-4 text-sm font-semibold text-omise-gray-100">Example Response</h4>
                    <pre className="mt-2 rounded-lg border border-omise-border bg-omise-dark p-3 text-xs text-omise-gray-100 overflow-x-auto">
{typeof r.example === 'string' ? r.example : JSON.stringify(r.example, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AccountUpdaterClient>
  )
}
