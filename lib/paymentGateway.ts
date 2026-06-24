import { parseYamlSafe } from '@/lib/yamlSafe'

export type VirtualOp = {
  /** Virtual doc path exposed to users */
  path: string
  /** Stripe-like grouping */
  tag: string
  /** Short label shown in nav */
  title: string
  /** Summary shown on the page */
  summary: string
  /** Longer description shown in the page */
  description: string
  /** Schema used for requestBody */
  schemaRef: string
  /** MerchantE transaction type (maps to real /transaction) */
  txType?: string
}

export const PAYMENT_GATEWAY_OPS: VirtualOp[] = [
  {
    path: '/sale',
    tag: 'Sales',
    title: 'Sale',
    summary: 'Create a sale',
    description: 'Processes a sale transaction (transaction_type=D).',
    schemaRef: '#/components/schemas/SaleRequest',
    txType: 'D',
  },
  {
    path: '/preauth',
    tag: 'Authorization',
    title: 'Pre-authorization',
    summary: 'Create a pre-authorization',
    description: 'Authorizes payment without capture (transaction_type=P).',
    schemaRef: '#/components/schemas/PreAuthorizationRequest',
    txType: 'P',
  },
  {
    path: '/capture',
    tag: 'Capture',
    title: 'Capture',
    summary: 'Capture a pre-authorization',
    description: 'Captures/settles a prior authorization (transaction_type=S).',
    schemaRef: '#/components/schemas/CaptureRequest',
    txType: 'S',
  },
  {
    path: '/refund',
    tag: 'Refunds',
    title: 'Refund',
    summary: 'Refund a transaction',
    description: 'Refunds a settled transaction (transaction_type=U).',
    schemaRef: '#/components/schemas/RefundRequest',
    txType: 'U',
  },
  {
    path: '/credit',
    tag: 'Refunds',
    title: 'Credit',
    summary: 'Create a credit',
    description: 'Credits a card without referencing an original sale (transaction_type=C).',
    schemaRef: '#/components/schemas/CreditRequest',
    txType: 'C',
  },
  {
    path: '/void',
    tag: 'Voids',
    title: 'Void',
    summary: 'Void a transaction',
    description: 'Voids a transaction prior to settlement (transaction_type=V).',
    schemaRef: '#/components/schemas/VoidRequest',
    txType: 'V',
  },
  {
    path: '/verify',
    tag: 'Verification',
    title: 'Verify',
    summary: 'Verify a card',
    description: 'Performs AVS/CVV verification without charging (transaction_type=A).',
    schemaRef: '#/components/schemas/VerificationRequest',
    txType: 'A',
  },
  {
    path: '/create-temporary-token',
    tag: 'Tokens',
    title: 'Create Temporary Token',
    summary: 'Create a temporary token',
    description: 'Creates a temporary token (transaction_type=T).',
    schemaRef: '#/components/schemas/TemporaryTokenRequest',
    txType: 'T',
  },
  {
    path: '/delete-card',
    tag: 'Tokens',
    title: 'Delete Permanent Token',
    summary: 'Delete a stored card token',
    description: 'Deletes a stored card token (transaction_type=X).',
    schemaRef: '#/components/schemas/DeleteCardRequest',
    txType: 'X',
  },
  {
    path: '/recurring-subscription',
    tag: 'Recurring',
    title: 'Subscription',
    summary: 'Process recurring subscription payment',
    description: 'Processes a merchant-initiated recurring subscription payment using stored card credentials (moto_ecommerce_ind=M103).',
    schemaRef: '#/components/schemas/RecurringSubscriptionRequest',
    txType: 'D',
  },
  {
    path: '/recurring-installment',
    tag: 'Recurring',
    title: 'Installment',
    summary: 'Process recurring installment payment',
    description: 'Processes a merchant-initiated recurring installment payment using stored card credentials (moto_ecommerce_ind=M104).',
    schemaRef: '#/components/schemas/RecurringInstallmentRequest',
    txType: 'D',
  },
]

export const PAYMENT_GATEWAY_TAG_ORDER = [
  'Sales',
  'Authorization',
  'Capture',
  'Refunds',
  'Voids',
  'Verification',
  'Tokens',
  'Recurring',
  'All',
]

export const PAYMENT_GATEWAY_TAG_DESCRIPTIONS: Record<string, string> = {
  Sales: 'Create sales transactions.',
  Authorization: 'Authorize funds.',
  Capture: 'Capture/settle prior authorizations.',
  Refunds: 'Refund settled transactions or issue standalone credits.',
  Voids: 'Void transactions prior to settlement.',
  Verification: 'Run AVS/CVV verification without charging.',
  Tokens: 'Tokenize/store cards and delete stored tokens.',
  Recurring: 'Process recurring subscription and installment payments using Card on File.',
  All: 'Advanced: the raw /transaction endpoint (all operations via transaction_type).',
}

function refToName(ref: string) {
  const m = ref.match(/^#\/components\/schemas\/(.+)$/)
  return m?.[1]
}

function resolveSchema(doc: any, schema: any, seen = new Set<any>()): any {
  if (!schema || typeof schema !== 'object') return schema
  if (seen.has(schema)) return schema
  seen.add(schema)

  if (schema.$ref) {
    const name = refToName(schema.$ref)
    if (!name) return schema
    return resolveSchema(doc, doc?.components?.schemas?.[name], seen)
  }

  if (Array.isArray(schema.allOf)) {
    // Merge object-ish schemas.
    // IMPORTANT: Do not lose descriptions during merge. Many MerchantE schemas use `allOf`
    // where a later fragment re-declares a property without a description; naïve overwrite
    // would drop the earlier description.

    const out: any = {
      type: 'object',
      properties: {},
      required: [] as string[],
    }

    const mergeProp = (existing: any, incoming: any) => {
      if (!existing) return incoming
      if (!incoming) return existing
      if (typeof existing !== 'object' || typeof incoming !== 'object') return incoming

      const merged: any = { ...existing, ...incoming }

      // Preserve earlier description/title if incoming doesn't provide one.
      if (merged.description === undefined && existing.description !== undefined) merged.description = existing.description
      if (merged.title === undefined && existing.title !== undefined) merged.title = existing.title

      // Preserve enum list if incoming omits it.
      if (merged.enum === undefined && existing.enum !== undefined) merged.enum = existing.enum

      // Preserve constraints if incoming omits them.
      const constraintKeys = [
        'format',
        'pattern',
        'minLength',
        'maxLength',
        'minimum',
        'maximum',
        'exclusiveMinimum',
        'exclusiveMaximum',
        'minItems',
        'maxItems',
      ]
      for (const k of constraintKeys) {
        if (merged[k] === undefined && existing[k] !== undefined) merged[k] = existing[k]
      }

      // Merge nested properties if both are objects.
      if (existing.properties && incoming.properties) {
        merged.properties = { ...existing.properties }
        for (const [k, v] of Object.entries<any>(incoming.properties)) {
          merged.properties[k] = mergeProp(existing.properties?.[k], v)
        }
      }

      // Union required.
      if (Array.isArray(existing.required) || Array.isArray(incoming.required)) {
        const req = new Set<string>()
        for (const r of (existing.required || [])) req.add(String(r))
        for (const r of (incoming.required || [])) req.add(String(r))
        merged.required = Array.from(req)
      }

      return merged
    }

    for (const s of schema.allOf) {
      const r = resolveSchema(doc, s, seen)
      if (!r || typeof r !== 'object') continue

      // Top-level description
      if (out.description === undefined && r.description !== undefined) out.description = r.description

      // Properties
      if (r.properties) {
        for (const [k, v] of Object.entries<any>(r.properties)) {
          out.properties[k] = mergeProp(out.properties[k], v)
        }
      }

      // Required
      if (Array.isArray(r.required)) out.required.push(...r.required)

      // Carry over other helpful keys if missing on `out`.
      for (const key of ['additionalProperties', 'discriminator', 'oneOf', 'anyOf', 'nullable'] as const) {
        if (out[key] === undefined && r[key] !== undefined) out[key] = r[key]
      }
    }

    out.required = Array.from(new Set(out.required.map(String)))
    return out
  }

  return schema
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

export function schemaToExample(doc: any, schema: any, seen = new Set<any>()) {
  if (!schema || typeof schema !== 'object') return {}
  if (seen.has(schema)) return {}
  seen.add(schema)

  const resolved = resolveSchema(doc, schema, seen)
  if (!resolved || typeof resolved !== 'object') return {}

  if (resolved.example && typeof resolved.example === 'object') return resolved.example

  if (resolved.type === 'object' || resolved.properties) {
    const out: Record<string, any> = {}
    const props = resolved.properties || {}
    for (const [k, v] of Object.entries<any>(props)) {
      if (!v || typeof v !== 'object') continue
      if (v.example !== undefined) out[k] = v.example
      else if (v.default !== undefined) out[k] = v.default
      else if (Array.isArray(v.enum) && v.enum.length) out[k] = v.enum[0]
      else if (v.$ref || v.allOf) out[k] = schemaToExample(doc, v, seen)
      else out[k] = placeholderForType(v.type)
    }

    if (Array.isArray(resolved.required)) {
      for (const r of resolved.required) {
        if (out[r] === undefined) out[r] = 'string'
      }
    }
    return out
  }

  return {}
}

export function getSchemaFields(doc: any, schemaRef: string) {
  const name = refToName(schemaRef)
  const base = name ? doc?.components?.schemas?.[name] : null
  const schema = resolveSchema(doc, base)
  const required = new Set<string>(Array.isArray(schema?.required) ? schema.required : [])
  const props = schema?.properties || {}

  const fields = Object.entries<any>(props).map(([field, def]) => {
    const d = resolveSchema(doc, def)
    return {
      name: field,
      required: required.has(field),
      type: d?.type || (d?.enum ? 'string' : undefined) || (d?.properties ? 'object' : 'string'),
      description: d?.description || '',
      enum: Array.isArray(d?.enum) ? d.enum : undefined,
      example: d?.example,
    }
  })

  fields.sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name))

  return {
    schema,
    fields,
    required: Array.from(required),
  }
}

export type SchemaNode = {
  /** Full dotted path (best-effort for docs) */
  path: string
  /** Just the field name (without parents) */
  name: string
  /** Nesting depth for UI indentation */
  depth: number
  required: boolean
  type: string
  description?: string
  enum?: any[]
  /** Optional per-enum-value meanings, if available in the spec description or vendor extensions */
  enumDescriptions?: Record<string, string>
  example?: any
  default?: any
  constraints?: Record<string, any>
}

function extractEnumDescriptions(schema: any): Record<string, string> | undefined {
  if (!schema || typeof schema !== 'object') return undefined

  // Common vendor extensions for per-value meanings.
  const viaExt =
    (schema['x-enumDescriptions'] && typeof schema['x-enumDescriptions'] === 'object' && schema['x-enumDescriptions']) ||
    (schema['x-enum-descriptions'] && typeof schema['x-enum-descriptions'] === 'object' && schema['x-enum-descriptions'])
  if (viaExt) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries<any>(viaExt)) {
      if (v === undefined || v === null) continue
      out[String(k)] = String(v)
    }
    return Object.keys(out).length ? out : undefined
  }

  // Best-effort parse from the description (common in converted specs).
  // Supports patterns like:
  //   D = Sale
  //   U - Refund
  //   V: Void
  const desc = typeof schema.description === 'string' ? schema.description : ''
  const enums: string[] = Array.isArray(schema.enum) ? schema.enum.map(String) : []
  if (!desc || enums.length === 0) return undefined

  const out: Record<string, string> = {}
  for (const line of desc.split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z0-9]{1,4})\s*(?:=|-|:)\s*(.+?)\s*$/)
    if (!m) continue
    const code = m[1]
    const meaning = m[2]
    if (enums.includes(code)) out[code] = meaning
  }
  return Object.keys(out).length ? out : undefined
}

function schemaTypeLabel(doc: any, schema: any, seen = new Set<any>()): string {
  const s = resolveSchema(doc, schema, seen)
  if (!s || typeof s !== 'object') return 'any'
  if (Array.isArray(s.enum)) return 'string'
  if (s.type === 'array') {
    const itemType = s.items ? schemaTypeLabel(doc, s.items, seen) : 'any'
    return `array<${itemType}>`
  }
  if (s.type) return s.type
  if (s.properties) return 'object'
  if (Array.isArray(s.oneOf)) return 'oneOf'
  if (Array.isArray(s.anyOf)) return 'anyOf'
  return 'any'
}

function extractConstraints(schema: any): Record<string, any> | undefined {
  if (!schema || typeof schema !== 'object') return undefined
  const keys = [
    'format',
    'pattern',
    'minLength',
    'maxLength',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'minItems',
    'maxItems',
  ]
  const out: Record<string, any> = {}
  for (const k of keys) {
    if (schema[k] !== undefined) out[k] = schema[k]
  }
  return Object.keys(out).length ? out : undefined
}

function flattenSchema(
  doc: any,
  schema: any,
  prefix: string,
  depth: number,
  requiredHere: Set<string>,
  out: SchemaNode[],
  seen: Set<any>,
  maxDepth: number
) {
  if (!schema || typeof schema !== 'object') return
  if (depth > maxDepth) return

  const s = resolveSchema(doc, schema, seen)
  if (!s || typeof s !== 'object') return

  // Object properties
  if (s.type === 'object' || s.properties) {
    const req = new Set<string>(Array.isArray(s.required) ? s.required : [])
    const props = s.properties || {}
    for (const [name, def] of Object.entries<any>(props)) {
      const d = resolveSchema(doc, def, seen)
      const path = prefix ? `${prefix}.${name}` : name
      const node: SchemaNode = {
        path,
        name,
        depth,
        required: requiredHere.has(name),
        type: schemaTypeLabel(doc, d, seen),
        description: d?.description,
        enum: Array.isArray(d?.enum) ? d.enum : undefined,
        enumDescriptions: extractEnumDescriptions(d),
        example: d?.example,
        default: d?.default,
        constraints: extractConstraints(d),
      }
      out.push(node)

      // Recurse into nested objects/arrays
      if ((d?.type === 'object' || d?.properties) && depth < maxDepth) {
        // Use the child's own `required` list, not the parent's.
        const childReq = new Set<string>(Array.isArray(d?.required) ? d.required : [])
        flattenSchema(doc, d, path, depth + 1, childReq, out, seen, maxDepth)
      } else if (d?.type === 'array' && d?.items && depth < maxDepth) {
        const item = resolveSchema(doc, d.items, seen)
        // Add an artificial "items" child row if items is object-like
        if (item?.type === 'object' || item?.properties) {
          flattenSchema(
            doc,
            item,
            `${path}[]`,
            depth + 1,
            new Set<string>(Array.isArray(item.required) ? item.required : []),
            out,
            seen,
            maxDepth
          )
        }
      }
    }
  }
}

export function getSchemaTree(doc: any, schemaRefOrSchema: any, opts?: { maxDepth?: number }) {
  const maxDepth = opts?.maxDepth ?? 8
  const schema = typeof schemaRefOrSchema === 'string' ? { $ref: schemaRefOrSchema } : schemaRefOrSchema

  const resolved = resolveSchema(doc, schema)
  const requiredHere = new Set<string>(Array.isArray(resolved?.required) ? resolved.required : [])
  const nodes: SchemaNode[] = []
  flattenSchema(doc, resolved, '', 0, requiredHere, nodes, new Set<any>(), maxDepth)

  const enums = nodes.filter((n) => Array.isArray(n.enum) && n.enum.length)
  const validations = nodes.filter((n) => !n.enum && n.constraints && Object.keys(n.constraints).length)

  return { nodes, enums, validations }
}

/** Parameter group definition from x-parameterGroups */
export type ParameterGroup = {
  name: string
  fields: string[]
  conditional?: Array<{
    oneOf?: string[]
    note?: string
  }>
  description?: string
}

/**
 * Get parameter groups from a schema's x-parameterGroups vendor extension.
 * The groups categorize parameters as Required, Recommended, and Others.
 */
export function getParameterGroups(doc: any, schemaRef: string): ParameterGroup[] | null {
  const name = refToName(schemaRef)
  if (!name) return null

  const schema = doc?.components?.schemas?.[name]
  if (!schema) return null

  // x-parameterGroups can be on the top-level schema
  const groups = schema['x-parameterGroups']
  if (!Array.isArray(groups) || groups.length === 0) return null

  return groups.map((g: any) => ({
    name: g.name || 'Other',
    fields: Array.isArray(g.fields) ? g.fields : [],
    conditional: g.conditional,
    description: g.description,
  }))
}

/**
 * Takes the flat schema tree nodes and organizes them into parameter groups.
 * Returns nodes organized by group name (Required, Recommended, Others).
 */
export function groupSchemaNodesByParameterGroups(
  nodes: SchemaNode[],
  groups: ParameterGroup[]
): { groupName: string; nodes: SchemaNode[]; conditional?: ParameterGroup['conditional']; description?: string }[] {
  // Build a lookup of field name to group
  const fieldToGroup = new Map<string, string>()
  for (const g of groups) {
    for (const f of g.fields) {
      fieldToGroup.set(f, g.name)
    }
  }

  // Organize nodes by group
  const groupMap = new Map<string, SchemaNode[]>()
  const ungrouped: SchemaNode[] = []

  for (const node of nodes) {
    // Only consider top-level fields (depth 0)
    if (node.depth !== 0) continue

    const groupName = fieldToGroup.get(node.name)
    if (groupName) {
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push(node)
    } else {
      ungrouped.push(node)
    }
  }

  // Build result in the order defined by groups
  const result: { groupName: string; nodes: SchemaNode[]; conditional?: ParameterGroup['conditional']; description?: string }[] = []

  for (const g of groups) {
    const groupNodes = groupMap.get(g.name)
    if (groupNodes && groupNodes.length > 0) {
      // Sort fields within each group to match the order in the x-parameterGroups definition
      const fieldOrder = new Map(g.fields.map((f, i) => [f, i]))
      groupNodes.sort((a, b) => {
        const orderA = fieldOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER
        const orderB = fieldOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
      result.push({ groupName: g.name, nodes: groupNodes, conditional: g.conditional, description: g.description })
    } else if (g.fields.length === 0 && g.conditional) {
      // Group with only conditional info (no fields)
      result.push({ groupName: g.name, nodes: [], conditional: g.conditional, description: g.description })
    }
  }

  // Don't add ungrouped fields - they should not appear in Try It Out
  // if (ungrouped.length > 0) {
  //   result.push({ groupName: 'Other', nodes: ungrouped })
  // }

  return result
}

export function buildPaymentGatewayDisplaySpec(doc: any, includeAdvanced: boolean) {
  // Support both old path (/transaction) and new path (/tridentApi)
  const baseOp = doc?.paths?.['/tridentApi']?.post || doc?.paths?.['/transaction']?.post
  if (!baseOp) return doc

  const baseReqExamples =
    baseOp?.requestBody?.content?.['application/x-www-form-urlencoded']?.examples || {}

  // Sanitize base operation: Swagger UI shows an Authorize button if security schemes are present.
  // MerchantE uses form fields (profile_id/profile_key), so we strip security metadata from the display spec.
  const sanitizedBaseOp = structuredClone(baseOp)
  delete (sanitizedBaseOp as any).security

  const pickExample = (virtualPath: string): any => {
    const map: Record<string, string> = {
      '/sale': 'sale',
      '/preauth': 'preauth',
      '/capture': 'capture',
      '/refund': 'refund',
      '/credit': 'credit',
      '/void': 'void',
      '/create-temporary-token': 'temporaryToken',
      '/delete-card': 'deleteCard',
      '/verify': 'verification',
      '/recurring-subscription': 'recurringSubscription',
      '/recurring-installment': 'recurringInstallment',
    }
    const key = map[virtualPath]
    if (key && baseReqExamples?.[key]) return baseReqExamples[key]
    return null
  }

  const display = structuredClone(doc)

  // Remove security metadata so Swagger UI does not render the Authorize button/modal.
  if (display?.components?.securitySchemes) delete display.components.securitySchemes
  if (display?.security) delete display.security

  // Tags in a predictable order (Stripe-ish).
  const usedTags = new Set<string>(['All'])
  for (const v of PAYMENT_GATEWAY_OPS) usedTags.add(v.tag)
  display.tags = PAYMENT_GATEWAY_TAG_ORDER.filter((t) => usedTags.has(t)).map((name) => ({
    name,
    description: PAYMENT_GATEWAY_TAG_DESCRIPTIONS[name] || undefined,
  }))

  const newPaths: Record<string, any> = {}

  if (includeAdvanced) {
    newPaths['/transaction'] = {
      post: {
        ...sanitizedBaseOp,
        tags: ['All'],
        summary: 'Process a payment gateway transaction (raw)',
        description:
          'Advanced: The Payment Gateway is implemented as a single endpoint. ' +
          'Use `transaction_type` to select the business operation (sale, refund, void, etc.).',
        operationId: baseOp.operationId || 'pg_transaction_raw',
      },
    }
  }

  // Virtual endpoints
  for (const v of PAYMENT_GATEWAY_OPS) {
    const exFromSpec = pickExample(v.path)
    const exampleValue = exFromSpec?.value ?? schemaToExample(doc, { $ref: v.schemaRef })
    const exampleObj =
      exFromSpec && typeof exFromSpec === 'object'
        ? exFromSpec
        : {
            summary: 'Example request',
            value: exampleValue,
          }

    newPaths[v.path] = {
      post: {
        ...sanitizedBaseOp,
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
                  summary: exampleObj.summary || 'Example request',
                  description: exampleObj.description,
                  value: exampleObj.value,
                },
              },
            },
          },
        },
        // Vendor extensions used by our proxy rewrite logic.
        'x-merchante-upstream-path': '/transaction',
        ...(v.txType ? { 'x-merchante-transaction-type': v.txType } : {}),
      },
    }
  }

  display.paths = newPaths
  return display
}

export function parsePaymentGatewaySpecYaml(yamlText: string) {
  return parseYamlSafe(yamlText)
}

export function makeMiniSpec(displayDoc: any, onlyPath: string) {
  const mini = structuredClone(displayDoc)
  mini.paths = { [onlyPath]: displayDoc.paths?.[onlyPath] }
  // Keep only the tag(s) used by this operation + servers + components.
  const op = displayDoc.paths?.[onlyPath]?.post
  const tags: string[] = Array.isArray(op?.tags) ? op.tags : []
  if (Array.isArray(mini.tags)) {
    mini.tags = mini.tags.filter((t: any) => tags.includes(t?.name))
  }
  return mini
}
