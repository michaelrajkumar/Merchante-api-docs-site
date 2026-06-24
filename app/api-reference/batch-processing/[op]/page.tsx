import clsx from 'clsx'
import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildFormPostSamples, buildMultipartPostSamples } from '@/lib/codeSamples'
import { Markdown } from '@/components/Markdown'
import {
  BATCH_PROCESSING_OPS,
  BATCH_PROCESSING_TAG_ORDER,
  getSchemaTree,
  schemaToExample,
  parseBatchProcessingSpec,
  getParameterGroups,
  groupSchemaNodesByParameterGroups,
  type SchemaNode,
} from '@/lib/batchProcessing'
import { BatchProcessingClient } from './BatchProcessingClient'

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

  // Check for "**Important:**" callout
  const importantMatch = text.match(/^\*\*Important:\*\*\s*(.*)$/i)
  if (importantMatch) {
    return (
      <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-900/50">
        <span className="text-xs font-semibold text-amber-400">Important: </span>
        <span className="text-xs text-amber-300">{importantMatch[1]}</span>
      </div>
    )
  }

  // Check for "**Warning:**" callout
  const warningMatch = text.match(/^\*\*Warning:\*\*\s*(.*)$/i)
  if (warningMatch) {
    return (
      <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-900/50">
        <span className="text-xs font-semibold text-red-400">Warning: </span>
        <span className="text-xs text-red-300">{warningMatch[1]}</span>
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
        if (/^Note:/i.test(p) || /^\*\*Important:\*\*/i.test(p) || /^\*\*Warning:\*\*/i.test(p)) {
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

function SchemaTable({ nodes }: { nodes: SchemaNode[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-omise-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-omise-dark-tertiary">
            <tr>
              <th className="sticky left-0 z-10 w-[320px] bg-omise-dark-tertiary px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">
                Field
              </th>
              <th className="sticky left-[320px] z-10 w-[140px] bg-omise-dark-tertiary px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">Required</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-omise-gray-500">
                Constraints
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-omise-border bg-omise-dark-secondary">
            {nodes.map((n, idx) => (
              <tr key={`${n.path}-${idx}`} className="align-top">
                <td className="sticky left-0 z-10 w-[320px] bg-omise-dark-secondary px-4 py-3">
                  <div>
                    <code className="font-mono text-sm font-medium text-omise-gray-100" style={{ paddingLeft: n.depth * 14 }}>
                      {n.name}
                    </code>
                    {n.enum && n.enumDescriptions ? (
                      <div className="mt-2 rounded-lg bg-omise-dark-tertiary p-2" style={{ marginLeft: n.depth * 14 }}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-omise-gray-500">
                          Options
                        </div>
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
  )
}

export default async function BatchProcessingOpPage({ params }: Props) {
  const { op } = await params
  const current = BATCH_PROCESSING_OPS.find((o) => o.slug === op)
  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    )
  }

  const fullSpecUrl = `/openapi/batch-processing?download=1`
  const fullSpecJsonUrl = `/openapi/batch-processing?download=1&format=json`
  const opSpecUrl = `/openapi/batch-processing/?download=1`
  const opSpecJsonUrl = `/openapi/batch-processing/?download=1&format=json`

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'batch-processing.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = parseBatchProcessingSpec(yamlText)

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

  // Determine content type
  const contentType = current.slug === 'upload' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'
  const requestSchema = opObj?.requestBody?.content?.[contentType]?.schema

  // Build code samples
  let samples
  if (contentType === 'multipart/form-data') {
    samples = buildMultipartPostSamples({
      baseUrl,
      endpointPath: current.path,
      fields: {
        userId: 'merchant123',
        userPass: 'password123',
        profileId: '12345678901234567890',
        testFlag: 'N',
      },
      fileFieldName: 'reqFile',
      filePlaceholder: '(binary file content)',
    })
  } else {
    const examplePayload = {
      userId: 'merchant123',
      userPass: 'password123',
      respFileId: '123456789012345',
    }
    samples = buildFormPostSamples({
      servers: spec.servers,
      endpointPath: current.path,
      payloadExample: examplePayload,
    })
  }

  // Get schema tree for request body
  let requestTree: ReturnType<typeof getSchemaTree> | null = null

  if (requestSchema) {
    requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })
  }

  // Get parameter groups for request if available
  let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | null = null

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
  }

  // Parse all responses (200, 400, 401, 500, etc.)
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
    let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | undefined
    if (tree && schema) {
      let respGroups = null

      // Check for x-parameterGroups on referenced schema
      if (schema.$ref) {
        respGroups = getParameterGroups(spec, schema.$ref)
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
        groupedNodes = groupSchemaNodesByParameterGroups(tree.nodes, respGroups)
      }
    }

    responses.push({ code, description: r?.description, schema, tree, groupedNodes, example: ex })
  }

  // Prepare Try It Out data
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

  // Get example values for the request
  let exampleValues = requestSchema ? schemaToExample(spec, requestSchema) : null

  return (
    <BatchProcessingClient
      operations={BATCH_PROCESSING_OPS}
      currentOp={current}
      miniSpec={miniSpec}
      codeSamples={samples}
      tagOrder={BATCH_PROCESSING_TAG_ORDER}
      tryItOutGroups={tryItOutGroups}
      exampleValues={exampleValues}
      contentType={contentType}
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

        {/* Request Section */}
        {requestTree && requestTree.nodes.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">Request Body</h2>
            <p className="mt-1 text-sm text-omise-gray-400">
              Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">{contentType}</code>
            </p>

            {groupedNodes ? (
              <div className="mt-4 space-y-3">
                {groupedNodes.map((g, idx) => (
                  <ParameterGroupSection
                    key={idx}
                    groupName={g.groupName}
                    nodes={g.nodes}
                    conditional={g.conditional}
                    description={g.description}
                    defaultOpen={g.groupName === 'Required'}
                  />
                ))}
              </div>
            ) : (
              <SchemaTable nodes={requestTree.nodes} />
            )}
          </>
        )}

        {/* Responses Section */}
        {responses.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-semibold text-omise-gray-100">Responses</h2>
            <div className="mt-4 space-y-6">
              {responses.map((resp) => (
                <div key={resp.code} className="rounded-xl border border-omise-border p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        resp.code.startsWith('2')
                          ? 'bg-emerald-100 text-emerald-700'
                          : resp.code.startsWith('4')
                          ? 'bg-amber-100 text-amber-700'
                          : resp.code.startsWith('5')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-omise-dark-tertiary text-omise-gray-300'
                      )}
                    >
                      {resp.code}
                    </span>
                    <div className="text-sm font-medium text-omise-gray-100">
                      {resp.description?.split('.')[0] || 'Response'}
                    </div>
                  </div>

                  {resp.description && (
                    <div className="mt-2 text-sm text-omise-gray-400">
                      <Markdown>{resp.description}</Markdown>
                    </div>
                  )}

                  {resp.tree && resp.tree.nodes.length > 0 && (
                    <>
                      {resp.groupedNodes ? (
                        <div className="mt-4 space-y-3">
                          {resp.groupedNodes.map((g, idx) => (
                            <ParameterGroupSection
                              key={idx}
                              groupName={g.groupName}
                              nodes={g.nodes}
                              conditional={g.conditional}
                              description={g.description}
                              defaultOpen={g.groupName === 'Common'}
                            />
                          ))}
                        </div>
                      ) : (
                        <SchemaTable nodes={resp.tree.nodes} />
                      )}
                    </>
                  )}

                  {resp.example && (
                    <>
                      <h4 className="mt-4 text-sm font-semibold text-omise-gray-100">Example Response</h4>
                      <pre className="mt-2 rounded-lg border border-omise-border bg-omise-dark p-3 text-xs text-omise-gray-100 overflow-x-auto">
{typeof resp.example === 'string' ? resp.example : JSON.stringify(resp.example, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BatchProcessingClient>
  )
}
