import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseYamlSafe } from '@/lib/yamlSafe'
import YAML from 'yaml'

function stripSecurity(doc: any) {
  const out = structuredClone(doc)
  // Keep security schemes for documentation purposes but remove from operations
  // so Swagger UI doesn't require auth for try-it-out
  if (out?.paths && typeof out.paths === 'object') {
    for (const p of Object.keys(out.paths)) {
      const item = out.paths[p]
      if (!item || typeof item !== 'object') continue
      for (const m of Object.keys(item)) {
        if (item[m]?.security) delete item[m].security
      }
    }
  }
  // Remove top-level security requirement
  if (out?.security) delete out.security
  return out
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'yaml').toLowerCase()
  const download = url.searchParams.get('download') === '1'

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

  const doc = stripSecurity(parseYamlSafe(yamlText))

  if (format === 'json') {
    const jsonOut = JSON.stringify(doc, null, 2)
    return new NextResponse(jsonOut, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...(download ? { 'content-disposition': 'attachment; filename="partner-portal.json"' } : {}),
      },
    })
  }

  const yamlOut = YAML.stringify(doc)
  return new NextResponse(yamlOut, {
    status: 200,
    headers: {
      'content-type': 'text/yaml; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(download ? { 'content-disposition': 'attachment; filename="partner-portal.yaml"' } : {}),
    },
  })
}
