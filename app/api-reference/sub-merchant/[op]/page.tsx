import clsx from 'clsx'
import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildFormPostSamples, buildJsonPostSamples, buildGetQuerySamples } from '@/lib/codeSamples'
import { Markdown } from '@/components/Markdown'
import {
  SUB_MERCHANT_OPS,
  SUB_MERCHANT_TAG_ORDER,
  getSchemaTree,
  schemaToExample,
  parseSubMerchantSpec,
  getParameterGroups,
  groupSchemaNodesByParameterGroups,
  type SchemaNode,
} from '@/lib/subMerchant'
import { SubMerchantClient } from './SubMerchantClient'

type Props = {
  params: Promise<{ op: string }>
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

function renderDescription(description?: string) {
  if (!description) return <span className="text-omise-gray-500">—</span>

  const parts = description
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 1 ? (
    <div className="space-y-2">
      {parts.map((p, idx) => (
        <div key={idx} className="text-xs text-omise-gray-300">
          {p}
        </div>
      ))}
    </div>
  ) : (
    <div className="text-xs text-omise-gray-300">{description}</div>
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

export default async function SubMerchantOpPage({ params }: Props) {
  const { op } = await params
  const current = SUB_MERCHANT_OPS.find((o) => o.slug === op)
  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    )
  }

  const fullSpecUrl = `/openapi/sub-merchant?download=1`
  const fullSpecJsonUrl = `/openapi/sub-merchant?download=1&format=json`
  const opSpecUrl = `/openapi/sub-merchant/?download=1`
  const opSpecJsonUrl = `/openapi/sub-merchant/?download=1&format=json`

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'sub-merchant.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = parseSubMerchantSpec(yamlText)

  const opObj = spec?.paths?.[current.path]?.[current.method.toLowerCase()]
  if (!opObj) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Operation not found in spec</h1>
        <p className="mt-2 text-omise-gray-400">Path: {current.path}, Method: {current.method}</p>
      </main>
    )
  }

  const baseUrl = (spec?.servers?.[1]?.url as string) || 'https://merchante-solutions--cert.my.salesforce.com'

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
    samples = buildGetQuerySamples({
      baseUrl,
      endpointPath: pathWithPlaceholder,
    })
  } else {
    let examplePayload: any = {}

    if (current.slug === 'create-application') {
      examplePayload = {
        Opp: {
          attributes: { type: 'Opportunity' },
          Is_ME_Underwriting__c: true,
        },
        Mer: {
          attributes: { type: 'Account' },
          Association_ID_API_Field__c: '3941803045',
          Legal_Name__c: 'Acme Corporation LLC',
          Tax_ID__c: '123456789',
          State_of_Entity_Formation_Incorporation__c: 'CA',
          Name: 'Acme Corp',
          BillingStreet: '123 Main Street',
          BillingCity: 'San Francisco',
          BillingState: 'California',
          BillingPostalCode: '94105',
          BillingCountry: 'United States',
          Phone: '(415) 555-1234',
          App_Email__c: 'contact@acmecorp.com',
          Website: 'www.acmecorp.com',
          Customer_Service_Phone__c: '888-555-1234',
          Industry: 'Retail',
          Location_Type__c: 'Ecommerce',
          Ownership: 'Limited Liability Company',
          Years_at_Location__c: 3,
          Date_Established__c: '2020-01-15',
          Chain_Non_Chain__c: 'Single Outlet',
          Description: 'Online retailer specializing in eco-friendly products',
          MCC_API_Field__c: '5045',
          Ever_accepted_credit_cards_before__c: true,
          Ever_had_a_merchant_account_canceled__c: false,
        },
        lstbussCheckAcc: [
          {
            attributes: { type: 'Business_Checking_Account__c' },
            Bank_Name__c: 'Wells Fargo',
            Bank_Street_Address__c: '100 Market Street',
            Bank_City__c: 'San Francisco',
            Bank_State__c: 'CA',
            Bank_Zipcode__c: '94105',
            Checking_Account__c: '1234567890',
            Transit_Routing__c: '121000248',
            Years_Open__c: 5,
            DDA_Type__c: 'Deposit',
          },
        ],
        lstContact: [
          {
            attributes: { type: 'Contact' },
            FirstName: 'John',
            LastName: 'Smith',
            Email: 'john.smith@acmecorp.com',
            Date_of_Birth__c: '1975-06-15',
            MailingStreet: '456 Oak Avenue',
            MailingCity: 'San Francisco',
            MailingStateCode: 'CA',
            MailingPostalCode: '94102',
            SSN__c: '123456789',
            Contact_Role__c: 'Principal;Control Prong',
            Percentage_Owned__c: 100,
            Title: 'CEO',
          },
        ],
      }
    } else if (current.slug === 'upload-attachments') {
      examplePayload = {
        records: [
          {
            attributes: {
              type: 'Attachment',
              referenceId: 'attachment0',
            },
            ParentId: 'YOUR_OPPORTUNITY_ID',
            Name: 'business_license.pdf',
            body: 'BASE64_ENCODED_FILE_CONTENT',
          },
        ],
      }
    }

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
  let groupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | null = null

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
  } else if (current.slug === 'auth') {
    requestSchema = opObj?.requestBody?.content?.['application/x-www-form-urlencoded']?.schema
    if (requestSchema) {
      requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })

      // Extract parameter groups for auth endpoint
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
  } else {
    requestSchema = opObj?.requestBody?.content?.['application/json']?.schema
    if (requestSchema) {
      requestTree = getSchemaTree(spec, requestSchema, { maxDepth: 6 })

      // Extract parameter groups for other POST endpoints
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
  }

  // Extract parameter groups for Try It Out form (POST requests)
  if (current.method !== 'GET') {
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

    if (requestTree && parameterGroups) {
      groupedNodes = groupSchemaNodesByParameterGroups(requestTree.nodes, parameterGroups)
    }
  }

  // Generate example values for form initialization
  const exampleValues = requestSchema ? schemaToExample(spec, requestSchema) : null

  // Response schema and example
  const responseSchema = opObj?.responses?.['200']?.content?.['application/json']?.schema
  const responseTree = responseSchema ? getSchemaTree(spec, responseSchema, { maxDepth: 4 }) : null
  const responseExample = responseSchema
    ? schemaToExample(spec, responseSchema)
    : null

  // Extract parameter groups for response schemas
  let responseGroupedNodes: ReturnType<typeof groupSchemaNodesByParameterGroups> | null = null
  if (responseSchema && responseTree) {
    let responseParameterGroups = null

    // Handle oneOf responses (like status endpoint with multiple response types)
    if (responseSchema.oneOf) {
      // For oneOf, we'll process each schema separately and combine the groups
      const allGroups: any[] = []

      for (const oneOfSchema of responseSchema.oneOf) {
        let currentSchema = oneOfSchema

        // Resolve $ref if present
        if (oneOfSchema.$ref) {
          const refPath = oneOfSchema.$ref.replace('#/components/schemas/', '')
          currentSchema = spec?.components?.schemas?.[refPath]
        }

        // Get parameter groups from this schema
        if (currentSchema?.['x-parameterGroups']) {
          const schemaGroups = currentSchema['x-parameterGroups'].map((g: any) => ({
            name: g.name || 'Other',
            fields: Array.isArray(g.fields) ? g.fields : [],
            conditional: g.conditional,
            description: g.description,
          }))
          allGroups.push(...schemaGroups)
        }
      }

      // Merge groups with same name
      if (allGroups.length > 0) {
        const mergedGroups = new Map<string, any>()

        for (const group of allGroups) {
          if (mergedGroups.has(group.name)) {
            const existing = mergedGroups.get(group.name)
            existing.fields = [...new Set([...existing.fields, ...group.fields])]
          } else {
            mergedGroups.set(group.name, { ...group })
          }
        }

        responseParameterGroups = Array.from(mergedGroups.values())
      }
    } else {
      // Handle regular response schema
      let targetSchema = responseSchema

      // For array responses, check the items schema
      if (responseSchema.type === 'array' && responseSchema.items) {
        targetSchema = responseSchema.items

        // Resolve $ref if present in items
        if (targetSchema.$ref) {
          const refPath = targetSchema.$ref.replace('#/components/schemas/', '')
          targetSchema = spec?.components?.schemas?.[refPath]
        }
      } else if (responseSchema.$ref) {
        // Resolve $ref for non-array responses
        const refPath = responseSchema.$ref.replace('#/components/schemas/', '')
        targetSchema = spec?.components?.schemas?.[refPath]
      }

      // Get parameter groups from target schema
      if (targetSchema?.['x-parameterGroups']) {
        responseParameterGroups = targetSchema['x-parameterGroups'].map((g: any) => ({
          name: g.name || 'Other',
          fields: Array.isArray(g.fields) ? g.fields : [],
          conditional: g.conditional,
          description: g.description,
        }))
      } else if (responseSchema.$ref) {
        // Fallback: try to get from $ref path
        responseParameterGroups = getParameterGroups(spec, responseSchema.$ref)
      }
    }

    // Group the response nodes if parameter groups were found
    if (responseParameterGroups && responseParameterGroups.length > 0) {
      responseGroupedNodes = groupSchemaNodesByParameterGroups(responseTree.nodes, responseParameterGroups)
    }
  }

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
    <SubMerchantClient
      operations={SUB_MERCHANT_OPS}
      currentOp={current}
      miniSpec={miniSpec}
      codeSamples={samples}
      tagOrder={SUB_MERCHANT_TAG_ORDER}
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

        {/* Request Section */}
        {requestTree && requestTree.nodes.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-omise-gray-100">
              {current.method === 'GET' ? 'Query Parameters' : 'Request Body'}
            </h2>
            {current.slug === 'auth' ? (
              <p className="mt-1 text-sm text-omise-gray-400">
                Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">application/x-www-form-urlencoded</code>
              </p>
            ) : current.method !== 'GET' ? (
              <p className="mt-1 text-sm text-omise-gray-400">
                Content type: <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5">application/json</code>
              </p>
            ) : null}

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
            ) : current.method === 'GET' ? (
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
                    {requestTree.nodes.map((node) => (
                      <tr key={node.path} className="align-top">
                        <td className="px-4 py-3">
                          <code className="font-mono text-sm font-medium text-omise-gray-100">{node.name}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-omise-gray-300">{node.type}</td>
                        <td className="px-4 py-3 text-xs">
                          {node.required ? (
                            <span className="rounded-full bg-omise-blue px-2 py-0.5 font-semibold text-white">Yes</span>
                          ) : (
                            <span className="text-omise-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-omise-gray-300 max-w-md">
                          {renderDescription(node.description)}
                          {node.enum && (
                            <div className="mt-1">
                              <span className="text-omise-gray-500">Values:</span>{' '}
                              <code className="font-mono text-xs">{node.enum.join(', ')}</code>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

        {/* Response Section */}
        {responseTree && responseTree.nodes.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-omise-gray-100">Response</h2>
            <div className="mt-3 rounded-xl border border-omise-border p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  200
                </span>
                <div className="text-sm font-medium text-omise-gray-100">Success</div>
              </div>

              {/* Use grouped display if parameter groups are defined for responses */}
              {responseGroupedNodes && responseGroupedNodes.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {responseGroupedNodes.map((group) => (
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
              ) : (
                <SchemaTable nodes={responseTree.nodes} />
              )}

              {responseExample && Object.keys(responseExample).length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-omise-gray-100">Example response</h3>
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-omise-border bg-omise-dark p-4 text-xs text-omise-gray-100">
                    {YAML.stringify(responseExample)}
                  </pre>
                </>
              )}
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
              <li>Use the <code className="bg-amber-100 px-1 rounded">instance_url</code> as the base URL for all API calls</li>
            </ul>
          </div>
        )}

        {current.slug === 'create-application' && (
          <>
            <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Business Rules</h3>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>At least one Primary Contact/Beneficial Owner must be identified</li>
                <li>Only one Control Prong is allowed per application</li>
                <li>Only one Authorized Signer is allowed per application</li>
                <li>Maximum 4 Principals are allowed per application</li>
                <li>Principals must have at least 25% ownership</li>
                <li>Sum of % Ownership for all Principals must not exceed 100%</li>
                <li>Phone numbers must be 10 digits or (999) 999-9999 format</li>
                <li>ZIP codes must be 5 digits</li>
                <li>Federal Tax ID must be 9 digits</li>
                <li>SSN must be 9 digits</li>
                <li>Transit Routing Number must be 9 digits</li>
              </ul>
              <h4 className="mt-4 text-sm font-semibold text-blue-900">Entity-Specific Requirements</h4>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li><strong>Sole Proprietorship:</strong> Only 1 Principal allowed</li>
                <li><strong>Partnership/LLC/Private Corp:</strong> Any 25%+ owners + 1 Control Prong</li>
                <li><strong>Tax Exempt/Government/Public Corp/Financial Institution:</strong> 1 Control Prong only</li>
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Create vs Update</h3>
              <ul className="mt-2 text-sm text-amber-800 list-disc list-inside space-y-1">
                <li><strong>Create:</strong> Omit the <code className="bg-amber-100 px-1 rounded">Id</code> field from Opp and Mer objects</li>
                <li><strong>Update:</strong> Include the <code className="bg-amber-100 px-1 rounded">Id</code> field (Opportunity SFID) in the Opp object</li>
                <li><strong>Update:</strong> Include the <code className="bg-amber-100 px-1 rounded">Id</code> field (Account SFID) in the Mer object</li>
                <li>Updates to applications in &quot;Pending Underwriting&quot; or &quot;Closed Won&quot; stages are NOT allowed</li>
                <li>Source ID can be used to relate SFID to corresponding fields</li>
              </ul>
            </div>
          </>
        )}

        {current.slug === 'upload-attachments' && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Attachment Requirements</h3>
            <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>ParentId (Opportunity ID) is required</li>
              <li>File size limit: 100 MB per file</li>
              <li>Files must be Base64 encoded in the body field</li>
              <li>Provide a descriptive file name with extension</li>
              <li>Supported file types: PDF, JPEG, PNG, text files</li>
              <li>Each attachment needs a unique referenceId</li>
            </ul>
          </div>
        )}

        {current.slug === 'get-status' && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Status Response Types</h3>
            <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>Wholesale PayFac:</strong> Returns integration status and MID</li>
              <li><strong>PayFac as a Service:</strong> Returns detailed underwriting information including status, reason codes, timestamps, and AEX document IDs</li>
              <li>The response varies based on the <code className="bg-blue-100 px-1 rounded">Is_ME_Underwriting__c</code> flag set during application creation</li>
            </ul>
            <h4 className="mt-4 text-sm font-semibold text-blue-900">Key Status Fields</h4>
            <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">Integration_Status__c</code>: Success/Failed status</li>
              <li><code className="bg-blue-100 px-1 rounded">Integration_Message__c</code>: Error details if failed</li>
              <li><code className="bg-blue-100 px-1 rounded">MID__c</code>: Merchant ID when approved</li>
              <li><code className="bg-blue-100 px-1 rounded">Underwriting_Status__c</code>: Current underwriting state (PaaS only)</li>
            </ul>
          </div>
        )}
      </div>
    </SubMerchantClient>
  )
}
