import { parseYamlSafe } from '@/lib/yamlSafe'

export type PartnerPortalOp = {
  slug: string
  title: string
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  tag: string
  description: string
}

export const PARTNER_PORTAL_OPS: PartnerPortalOp[] = [
  {
    slug: 'auth',
    title: 'Authentication',
    method: 'POST',
    path: '/services/oauth2/token',
    tag: 'Authentication',
    description: 'Get OAuth 2.0 access token (valid for 24 hours)',
  },
  {
    slug: 'create-application',
    title: 'Create Application',
    method: 'POST',
    path: '/applications',
    tag: 'Applications',
    description: 'Create a new merchant application with all related objects',
  },
  {
    slug: 'update-application',
    title: 'Update Application',
    method: 'PATCH',
    path: '/applications',
    tag: 'Applications',
    description: 'Update an existing merchant application',
  },
  {
    slug: 'submit-attachments',
    title: 'Submit Attachments',
    method: 'POST',
    path: '/applications/attachments',
    tag: 'Applications',
    description: 'Submit file attachments for an opportunity',
  },
  {
    slug: 'get-opportunity',
    title: 'Get Opportunity',
    method: 'GET',
    path: '/applications/{opportunityId}',
    tag: 'Lookup',
    description: 'Retrieve opportunity details',
  },
  {
    slug: 'get-account',
    title: 'Get Account',
    method: 'GET',
    path: '/applications/{opportunityId}/account',
    tag: 'Lookup',
    description: 'Retrieve account details for an opportunity',
  },
  {
    slug: 'get-contacts',
    title: 'Get Contacts',
    method: 'GET',
    path: '/applications/{opportunityId}/contacts',
    tag: 'Lookup',
    description: 'Retrieve contacts for an opportunity',
  },
  {
    slug: 'get-checking-accounts',
    title: 'Get Business Checking Accounts',
    method: 'GET',
    path: '/applications/{opportunityId}/business-checking-accounts',
    tag: 'Lookup',
    description: 'Retrieve business checking accounts',
  },
  {
    slug: 'get-quotes',
    title: 'Get Quotes',
    method: 'GET',
    path: '/applications/{opportunityId}/quotes',
    tag: 'Lookup',
    description: 'Retrieve quotes for an opportunity',
  },
  {
    slug: 'get-quote-line-items',
    title: 'Get Quote Line Items',
    method: 'GET',
    path: '/quotes/{quoteId}/quote-line-items',
    tag: 'Lookup',
    description: 'Retrieve quote line items',
  },
]

export const PARTNER_PORTAL_TAG_ORDER = [
  'Authentication',
  'Applications',
  'Lookup',
]

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

      if (merged.description === undefined && existing.description !== undefined) merged.description = existing.description
      if (merged.title === undefined && existing.title !== undefined) merged.title = existing.title
      if (merged.enum === undefined && existing.enum !== undefined) merged.enum = existing.enum

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

      if (existing.properties && incoming.properties) {
        merged.properties = { ...existing.properties }
        for (const [k, v] of Object.entries<any>(incoming.properties)) {
          merged.properties[k] = mergeProp(existing.properties?.[k], v)
        }
      }

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

      if (out.description === undefined && r.description !== undefined) out.description = r.description

      if (r.properties) {
        for (const [k, v] of Object.entries<any>(r.properties)) {
          out.properties[k] = mergeProp(out.properties[k], v)
        }
      }

      if (Array.isArray(r.required)) out.required.push(...r.required)

      for (const key of ['additionalProperties', 'discriminator', 'oneOf', 'anyOf', 'nullable'] as const) {
        if (out[key] === undefined && r[key] !== undefined) out[key] = r[key]
      }
    }

    out.required = Array.from(new Set(out.required.map(String)))
    return out
  }

  return schema
}

export type SchemaNode = {
  path: string
  name: string
  depth: number
  required: boolean
  type: string
  description?: string
  enum?: any[]
  enumDescriptions?: Record<string, string>
  example?: any
  default?: any
  constraints?: Record<string, any>
}

function extractEnumDescriptions(schema: any): Record<string, string> | undefined {
  if (!schema || typeof schema !== 'object') return undefined

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

      if ((d?.type === 'object' || d?.properties) && depth < maxDepth) {
        const childReq = new Set<string>(Array.isArray(d?.required) ? d.required : [])
        flattenSchema(doc, d, path, depth + 1, childReq, out, seen, maxDepth)
      } else if (d?.type === 'array' && d?.items && depth < maxDepth) {
        const item = resolveSchema(doc, d.items, seen)
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

export function schemaToExample(doc: any, schema: any, seen = new Set<any>()) {
  if (!schema || typeof schema !== 'object') return {}
  if (seen.has(schema)) return {}
  seen.add(schema)

  const resolved = resolveSchema(doc, schema, seen)
  if (!resolved || typeof resolved !== 'object') return {}

  if (resolved.example && typeof resolved.example === 'object') return resolved.example

  const placeholderForType = (t?: string) => {
    switch (t) {
      case 'integer':
      case 'number':
        return 0
      case 'boolean':
        return true
      case 'array':
        return []
      default:
        return 'string'
    }
  }

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

export function parsePartnerPortalSpec(yamlText: string) {
  return parseYamlSafe(yamlText)
}

export function groupOpsByTag(ops: PartnerPortalOp[]): Map<string, PartnerPortalOp[]> {
  const groups = new Map<string, PartnerPortalOp[]>()
  for (const tag of PARTNER_PORTAL_TAG_ORDER) {
    groups.set(tag, [])
  }
  for (const op of ops) {
    const existing = groups.get(op.tag) || []
    existing.push(op)
    groups.set(op.tag, existing)
  }
  return groups
}

/** Parameter group definition from x-parameterGroups */
export type ParameterGroup = {
  name: string
  fields: string[]
  conditional?: any
  description?: string
}

/**
 * Get parameter groups from a schema's x-parameterGroups vendor extension.
 * Returns null if not found or empty.
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

  // Sort fields within each group to match the order in the x-parameterGroups definition
  for (const g of groups) {
    const groupNodes = groupMap.get(g.name)
    if (groupNodes) {
      const fieldOrder = new Map(g.fields.map((f, i) => [f, i]))
      groupNodes.sort((a, b) => {
        const aIdx = fieldOrder.get(a.name) ?? 999999
        const bIdx = fieldOrder.get(b.name) ?? 999999
        return aIdx - bIdx
      })
    }
  }

  // Build result in group order
  const result: { groupName: string; nodes: SchemaNode[]; conditional?: ParameterGroup['conditional']; description?: string }[] = []
  for (const g of groups) {
    const groupNodes = groupMap.get(g.name) || []
    if (groupNodes.length > 0) {
      result.push({
        groupName: g.name,
        nodes: groupNodes,
        conditional: g.conditional,
        description: g.description,
      })
    }
  }

  // Add ungrouped to a default "Other" group
  if (ungrouped.length > 0) {
    result.push({
      groupName: 'Other',
      nodes: ungrouped,
    })
  }

  return result
}
