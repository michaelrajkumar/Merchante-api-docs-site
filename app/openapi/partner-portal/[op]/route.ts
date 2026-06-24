import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseYamlSafe } from '@/lib/yamlSafe'
import YAML from 'yaml'

const OP_TO_PATH: Record<string, { path: string; method: string }> = {
  auth: { path: '/services/oauth2/token', method: 'post' },
  'create-application': { path: '/applications', method: 'post' },
  'update-application': { path: '/applications', method: 'patch' },
  'submit-attachments': { path: '/applications/attachments', method: 'post' },
  'get-opportunity': { path: '/applications/{opportunityId}', method: 'get' },
  'get-account': { path: '/applications/{opportunityId}/account', method: 'get' },
  'get-contacts': { path: '/applications/{opportunityId}/contacts', method: 'get' },
  'get-checking-accounts': { path: '/applications/{opportunityId}/business-checking-accounts', method: 'get' },
  'get-quotes': { path: '/applications/{opportunityId}/quotes', method: 'get' },
  'get-quote-line-items': { path: '/quotes/{quoteId}/quote-line-items', method: 'get' },
}

function stripSecurity(doc: any) {
  const out = structuredClone(doc)
  if (out?.paths && typeof out.paths === 'object') {
    for (const p of Object.keys(out.paths)) {
      const item = out.paths[p]
      if (!item || typeof item !== 'object') continue
      for (const m of Object.keys(item)) {
        if (item[m]?.security) delete item[m].security
      }
    }
  }
  if (out?.security) delete out.security
  return out
}

export async function GET(req: Request, ctx: { params: Promise<{ op: string }> }) {
  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'yaml').toLowerCase()
  const download = url.searchParams.get('download') === '1'

  const { op } = await ctx.params
  const sel = OP_TO_PATH[op]
  if (!sel) return new NextResponse('Not found', { status: 404, headers: { 'x-content-type-options': 'nosniff' } })

  const filePath = path.join(process.cwd(), 'public', 'openapi', 'partner-portal.yaml')

  let yamlText: string
  try {
    yamlText = await readFile(filePath, 'utf8')
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      return new NextResponse('OpenAPI spec not found', { status: 404, headers: { 'x-content-type-options': 'nosniff' } })
    }
    return new NextResponse('Error reading OpenAPI spec', { status: 500, headers: { 'x-content-type-options': 'nosniff' } })
  }

  const full = stripSecurity(parseYamlSafe(yamlText))

  const mini = structuredClone(full)
  mini.paths = { [sel.path]: { [sel.method]: full?.paths?.[sel.path]?.[sel.method] } }

  // Keep only relevant tags
  const opObj = full?.paths?.[sel.path]?.[sel.method]
  const tags: string[] = Array.isArray(opObj?.tags) ? opObj.tags : []
  if (Array.isArray(mini.tags) && tags.length) {
    mini.tags = mini.tags.filter((t: { name?: string }) => t?.name && tags.includes(t.name))
  }

  const filename = `partner-portal.${op}`

  if (format === 'json') {
    const jsonOut = JSON.stringify(mini, null, 2)
    return new NextResponse(jsonOut, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...(download ? { 'content-disposition': `attachment; filename="${filename}.json"` } : {}),
      },
    })
  }

  const yamlOut = YAML.stringify(mini)
  return new NextResponse(yamlOut, {
    status: 200,
    headers: {
      'content-type': 'text/yaml; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(download ? { 'content-disposition': `attachment; filename="${filename}.yaml"` } : {}),
    },
  })
}
