import clsx from 'clsx'
import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildFormPostSamples } from '@/lib/codeSamples'
import type { CodeSample } from '@/components/CodeSampleTabs'
import { Markdown } from '@/components/Markdown'
import { ReportingClient } from './ReportingClient'
import {
  getParameterGroups,
  getSchemaTree,
  groupSchemaNodesByParameterGroups,
  schemaToExample,
} from '@/lib/paymentGateway'

type OpDef = {
  slug: string
  title: string
  method: 'GET' | 'POST'
  path: string
  description: string
}

const OPS: OpDef[] = [
  { slug: 'generate-report', title: 'Generate Report', method: 'POST', path: '/jsp/reports/report_api.jsp', description: 'Generate and download reports in CSV or XML format' },
]

function resolveRef(spec: any, ref: string): any {
  if (!ref || !ref.startsWith('#/')) return null
  const parts = ref.replace('#/', '').split('/')
  let result = spec
  for (const part of parts) {
    result = result?.[part]
    if (!result) return null
  }
  return result
}

function getSchemaProperties(spec: any, schema: any, depth = 0, maxDepth = 4): Array<{
  name: string
  path: string
  type: string
  required: boolean
  description: string
  constraints: Record<string, any>
  depth: number
  enum?: string[]
}> {
  if (depth > maxDepth) return []

  const resolved = schema?.$ref ? resolveRef(spec, schema.$ref) : schema
  if (!resolved) return []

  const results: ReturnType<typeof getSchemaProperties> = []
  const props = resolved.properties || {}
  const requiredFields = new Set<string>(resolved.required || [])

  for (const [name, propSchema] of Object.entries<any>(props)) {
    const propResolved = propSchema?.$ref ? resolveRef(spec, propSchema.$ref) : propSchema
    const propPath = depth === 0 ? name : name

    const constraints: Record<string, any> = {}
    if (propResolved?.minLength != null) constraints.minLength = propResolved.minLength
    if (propResolved?.maxLength != null) constraints.maxLength = propResolved.maxLength
    if (propResolved?.pattern) constraints.pattern = propResolved.pattern
    if (propResolved?.minimum != null) constraints.minimum = propResolved.minimum
    if (propResolved?.maximum != null) constraints.maximum = propResolved.maximum
    if (propResolved?.minItems != null) constraints.minItems = propResolved.minItems
    if (propResolved?.maxItems != null) constraints.maxItems = propResolved.maxItems

    let type = propResolved?.type || 'object'
    if (type === 'array' && propResolved?.items) {
      const itemsResolved = propResolved.items?.$ref ? resolveRef(spec, propResolved.items.$ref) : propResolved.items
      const itemType = itemsResolved?.title || itemsResolved?.type || 'object'
      type = `array<${itemType}>`
    }

    results.push({
      name,
      path: propPath,
      type,
      required: requiredFields.has(name),
      description: propResolved?.description || '',
      constraints,
      depth,
      enum: propResolved?.enum,
    })

    // Recurse into nested objects
    if (propResolved?.type === 'object' && propResolved?.properties) {
      const nested = getSchemaProperties(spec, propResolved, depth + 1, maxDepth)
      for (const n of nested) {
        results.push({
          ...n,
          path: `${name}.${n.path}`,
          depth: depth + 1,
        })
      }
    }

    // Recurse into array items
    if (propResolved?.type === 'array' && propResolved?.items) {
      const itemsResolved = propResolved.items?.$ref ? resolveRef(spec, propResolved.items.$ref) : propResolved.items
      if (itemsResolved?.properties) {
        const nested = getSchemaProperties(spec, itemsResolved, depth + 1, maxDepth)
        for (const n of nested) {
          results.push({
            ...n,
            path: `${name}[].${n.path}`,
            depth: depth + 1,
          })
        }
      }
    }
  }

  return results
}

function renderConstraints(c: Record<string, any>) {
  if (!c || Object.keys(c).length === 0) return <span className="text-omise-gray-500">—</span>
  const parts: string[] = []
  if (c.pattern) parts.push(`pattern: ${c.pattern}`)
  if (c.minLength != null) parts.push(`minLength: ${c.minLength}`)
  if (c.maxLength != null) parts.push(`maxLength: ${c.maxLength}`)
  if (c.minimum != null) parts.push(`min: ${c.minimum}`)
  if (c.maximum != null) parts.push(`max: ${c.maximum}`)
  if (c.minItems != null) parts.push(`minItems: ${c.minItems}`)
  if (c.maxItems != null) parts.push(`maxItems: ${c.maxItems}`)
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
function ParameterRow({ node }: { node: ReturnType<typeof getSchemaTree>['nodes'][0] }) {
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
          {hasValidation && node.constraints && (
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
  nodes: ReturnType<typeof getSchemaTree>['nodes']
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

function SchemaTable({ rows }: { rows: ReturnType<typeof getSchemaProperties> }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-omise-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-500">
            <tr>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Validations</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-omise-border">
            {rows.map((r, idx) => (
              <tr key={`${r.path}-${idx}`} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-omise-gray-100" style={{ paddingLeft: r.depth * 12 }}>
                    {r.name}
                  </div>
                  {r.depth > 0 && (
                    <div className="font-mono text-[11px] text-omise-gray-500 mt-0.5" style={{ paddingLeft: r.depth * 12 }}>
                      {r.path}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-omise-gray-300">{r.type}</td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', r.required ? 'bg-omise-blue text-white' : 'bg-omise-dark-tertiary text-omise-gray-300')}>
                    {r.required ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.enum && r.enum.length ? (
                    <span className="font-mono text-[11px] text-omise-gray-300">enum: {r.enum.join(', ')}</span>
                  ) : (
                    renderConstraints(r.constraints)
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-omise-gray-300 max-w-md">
                  <Markdown>{r.description || '—'}</Markdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function ReportingOpPage({ params }: { params: Promise<{ op: string }> }) {
  const { op } = await params
  const current = OPS.find((o) => o.slug === op)
  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-omise-gray-100">Not found</h1>
        <p className="mt-2 text-omise-gray-400">The requested operation was not found.</p>
      </main>
    )
  }

  const fullSpecUrl = `/openapi/reporting?download=1`
  const fullSpecJsonUrl = `/openapi/reporting?download=1&format=json`
  const opSpecUrl = `/openapi/reporting/?download=1`
  const opSpecJsonUrl = `/openapi/reporting/?download=1&format=json`

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'reporting.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = YAML.parse(yamlText)

  const opObj = spec?.paths?.[current.path]?.[current.method.toLowerCase()]
  if (!opObj) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-omise-gray-100">Operation not found in spec</h1>
      </main>
    )
  }

  // Get servers
  const servers = spec?.servers || []
  const testServer = servers.find((s: any) => s.description?.toLowerCase().includes('test'))
  const baseUrl = testServer?.url || servers[0]?.url || 'https://test.merchante-solutions.com'

  // Build mini spec for Swagger
  const miniSpec = {
    openapi: spec.openapi,
    info: spec.info,
    servers: spec.servers,
    paths: { [current.path]: { [current.method.toLowerCase()]: opObj } },
    components: spec.components,
    security: spec.security,
  }

  // Get request schema
  const requestSchema = opObj?.requestBody?.content?.['application/x-www-form-urlencoded']?.schema
  const requestRows = requestSchema ? getSchemaProperties(spec, requestSchema) : []

  // Get request tree and parameter groups for Try It Out
  const requestTree = requestSchema ? getSchemaTree(spec, requestSchema, { maxDepth: 10 }) : null

  let parameterGroups = null
  if (requestSchema?.$ref) {
    parameterGroups = getParameterGroups(spec, requestSchema.$ref)
  } else if (requestSchema?.['x-parameterGroups']) {
    parameterGroups = requestSchema['x-parameterGroups'].map((g: any) => ({
      name: g.name || 'Other',
      fields: Array.isArray(g.fields) ? g.fields : [],
      conditional: g.conditional,
      description: g.description,
    }))
  }

  const groupedNodes = requestTree && parameterGroups
    ? groupSchemaNodesByParameterGroups(requestTree.nodes, parameterGroups)
    : null

  // Get response schemas
  const responses = Object.entries<any>(opObj?.responses || {}).sort(([a], [b]) => {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })

  // Get example from spec
  const requestExample = {
    userId: 'YOUR_USER_ID',
    userPass: 'YOUR_PASSWORD',
    dsReportId: '1',
    reportDateBegin: '04/06/2024',
    reportDateEnd: '04/09/2024',
    nodeId: '941000123456',
    reportType: '1',
    includeTridentTranId: 'true',
    includePurchaseId: 'true',
  }

  // Build code samples for form-urlencoded
  const samples: CodeSample[] = buildFormPostSamples({
    servers: spec.servers,
    endpointPath: current.path,
    payloadExample: requestExample,
  })

  // Prepare grouped parameters for Try It Out form (serialize for client)
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

  return (
    <ReportingClient
      operations={OPS}
      currentOp={current}
      miniSpec={miniSpec}
      codeSamples={samples}
      tryItOutGroups={tryItOutGroups}
      exampleValues={requestExample}
    >
      {/* Documentation content */}
      <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
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

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-omise-gray-100">{current.title}</h1>
        <p className="mt-2 text-sm text-omise-gray-400">{opObj.summary || current.description}</p>

        {/* Description */}
        {opObj.description && (
          <div className="mt-6">
            <Markdown>{String(opObj.description)}</Markdown>
          </div>
        )}

        {/* Authentication */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-omise-gray-100">Authentication</h2>
          <div className="mt-3 rounded-xl border border-omise-border p-4 bg-omise-dark-tertiary">
            <p className="text-sm text-omise-gray-300">
              This API uses <strong>form-based authentication</strong>. Include the following parameters in every request:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-omise-gray-300">
              <li><code className="rounded bg-omise-dark px-1.5 py-0.5">userId</code> — Your ME web reporting login ID</li>
              <li><code className="rounded bg-omise-dark px-1.5 py-0.5">userPass</code> — Your ME web reporting password</li>
            </ul>
            <p className="mt-3 text-xs text-omise-gray-400">
              Only reports enabled for your user account will be accessible.
            </p>
          </div>
        </div>

        {/* Request Parameters */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-omise-gray-100">Request Body</h2>
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
            requestRows.length > 0 && <SchemaTable rows={requestRows} />
          )}
        </div>

        {/* Available Reports */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-omise-gray-100">Available Reports</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-omise-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-omise-dark-tertiary text-xs font-semibold uppercase tracking-wide text-omise-gray-500">
                  <tr>
                    <th className="px-4 py-3">Report ID</th>
                    <th className="px-4 py-3">Report Name</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-omise-border text-omise-gray-300">
                  <tr><td className="px-4 py-2 font-mono">1</td><td className="px-4 py-2">Batch Summary</td><td className="px-4 py-2">Pre-settlement card totals by date and batch</td></tr>
                  <tr><td className="px-4 py-2 font-mono">2</td><td className="px-4 py-2">Settlement Summary</td><td className="px-4 py-2">Settled transactions to merchant&apos;s bank</td></tr>
                  <tr><td className="px-4 py-2 font-mono">3</td><td className="px-4 py-2">Deposit Summary</td><td className="px-4 py-2">ACH entries to merchant&apos;s account</td></tr>
                  <tr><td className="px-4 py-2 font-mono">5</td><td className="px-4 py-2">Chargeback Adjustments</td><td className="px-4 py-2">Individual chargebacks with status</td></tr>
                  <tr><td className="px-4 py-2 font-mono">7</td><td className="px-4 py-2">Retrieval Requests</td><td className="px-4 py-2">Retrieval request tracking</td></tr>
                  <tr><td className="px-4 py-2 font-mono">8</td><td className="px-4 py-2">Daily Interchange</td><td className="px-4 py-2">Interchange qualification categories</td></tr>
                  <tr><td className="px-4 py-2 font-mono">9</td><td className="px-4 py-2">Custom Queries</td><td className="px-4 py-2">Visa/MC/Discover ARDEF tables</td></tr>
                  <tr><td className="px-4 py-2 font-mono">10</td><td className="px-4 py-2">FX Batch Summary</td><td className="px-4 py-2">International FX transactions</td></tr>
                  <tr><td className="px-4 py-2 font-mono">12</td><td className="px-4 py-2">International Retrieval Requests</td><td className="px-4 py-2">International retrieval tracking</td></tr>
                  <tr><td className="px-4 py-2 font-mono">13</td><td className="px-4 py-2">FX Interchange Summary</td><td className="px-4 py-2">FX interchange rates</td></tr>
                  <tr><td className="px-4 py-2 font-mono">14</td><td className="px-4 py-2">International Settlement Summary</td><td className="px-4 py-2">Settled international transactions</td></tr>
                  <tr><td className="px-4 py-2 font-mono">15</td><td className="px-4 py-2">Authorization Log</td><td className="px-4 py-2">Real-time authorization attempts</td></tr>
                  <tr><td className="px-4 py-2 font-mono">21</td><td className="px-4 py-2">Payment Gateway Unsettled</td><td className="px-4 py-2">Pending settlement transactions</td></tr>
                  <tr><td className="px-4 py-2 font-mono">22</td><td className="px-4 py-2">Payment Gateway Settled</td><td className="px-4 py-2">Settled gateway transactions</td></tr>
                  <tr><td className="px-4 py-2 font-mono">23</td><td className="px-4 py-2">Payment Gateway Rejected</td><td className="px-4 py-2">Declined transactions</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Example Request */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-omise-gray-100">Example Request (Batch Summary Detail)</h3>
          <pre className="mt-3 rounded-xl border border-omise-border bg-omise-dark p-4 text-xs text-omise-gray-100 overflow-x-auto">
            <code>{`userId=YOUR_USER_ID&userPass=YOUR_PASSWORD&dsReportId=1&reportDateBegin=04/06/2024&reportDateEnd=04/09/2024&nodeId=941000123456&reportType=1&includeTridentTranId=true&includePurchaseId=true`}</code>
          </pre>
        </div>

        {/* Responses */}
        <div className="mt-10">
          <h2 className="text-base font-semibold text-omise-gray-100">Responses</h2>
          <div className="mt-4 space-y-6">
            {responses.map(([code, resp]) => {
              const csvExample = resp?.content?.['text/csv']?.examples?.batchSummaryDetail?.value ||
                resp?.content?.['text/csv']?.examples?.settlementSummary?.value

              return (
                <div key={code} className="rounded-xl border border-omise-border p-4">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      code.startsWith('2') ? 'bg-emerald-100 text-emerald-700' :
                      code.startsWith('4') ? 'bg-amber-100 text-amber-700' :
                      code.startsWith('5') ? 'bg-red-100 text-red-700' :
                      'bg-omise-dark-tertiary text-omise-gray-300'
                    )}>
                      {code}
                    </span>
                    <div className="text-sm font-medium text-omise-gray-100">
                      {resp.description?.split('.')[0] || 'Response'}
                    </div>
                  </div>

                  {resp.description && (
                    <p className="mt-2 text-sm text-omise-gray-400">{resp.description}</p>
                  )}

                  {csvExample && (
                    <>
                      <h4 className="mt-4 text-sm font-semibold text-omise-gray-100">Example Response (CSV)</h4>
                      <pre className="mt-2 rounded-lg border border-omise-border bg-omise-dark p-3 text-xs text-omise-gray-100 overflow-x-auto whitespace-pre-wrap">
                        <code>{csvExample}</code>
                      </pre>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Response Formats */}
        <div className="mt-10">
          <h2 className="text-base font-semibold text-omise-gray-100">Response Formats</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-omise-border p-4">
              <h3 className="text-sm font-semibold text-omise-gray-100">CSV (Default)</h3>
              <p className="mt-2 text-sm text-omise-gray-400">
                Reports are returned in CSV format by default, with a header row containing column names.
              </p>
            </div>
            <div className="rounded-xl border border-omise-border p-4">
              <h3 className="text-sm font-semibold text-omise-gray-100">XML</h3>
              <p className="mt-2 text-sm text-omise-gray-400">
                Use the <code className="rounded bg-omise-dark px-1.5 py-0.5">xmlEncoding</code> parameter to receive XML output:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-omise-gray-400">
                <li><code className="rounded bg-omise-dark px-1.5 py-0.5">xmlEncoding=0</code> — Name/value attribute style</li>
                <li><code className="rounded bg-omise-dark px-1.5 py-0.5">xmlEncoding=1</code> — Element name style</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Info */}
        <div className="mt-10">
          <details className="rounded-2xl border border-omise-border p-4">
            <summary className="cursor-pointer text-sm font-semibold text-omise-gray-100">API Information</summary>
            <div className="mt-4 space-y-3 text-sm text-omise-gray-400">
              <p><strong className="text-omise-gray-300">Version:</strong> {spec?.info?.version}</p>
              <p><strong className="text-omise-gray-300">Servers:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                {servers.map((s: any, i: number) => (
                  <li key={i}>
                    <code className="text-xs">{s.url}</code> — {s.description}
                  </li>
                ))}
              </ul>
              {spec?.info?.contact && (
                <p><strong className="text-omise-gray-300">Contact:</strong> {spec.info.contact.name} — <a href={spec.info.contact.url} className="text-omise-blue hover:underline">{spec.info.contact.url}</a></p>
              )}
            </div>
          </details>
        </div>
      </div>
    </ReportingClient>
  )
}
