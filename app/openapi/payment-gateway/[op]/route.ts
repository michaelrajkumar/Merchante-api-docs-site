import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildPaymentGatewayDisplaySpec, makeMiniSpec, parsePaymentGatewaySpecYaml } from '@/lib/paymentGateway'

export async function GET(req: Request, { params }: { params: Promise<{ op: string }> }) {
  const url = new URL(req.url)
  const includeAdvanced = url.searchParams.get('advanced') === '1'
  const format = (url.searchParams.get('format') || 'yaml').toLowerCase()
  const download = url.searchParams.get('download') === '1'

  const { op: opKey } = await params
  const isRaw = opKey === 'transaction'
  if (isRaw && !includeAdvanced) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const virtualPath = isRaw ? '/transaction' : `/${opKey}`

  const specPath = path.join(process.cwd(), 'public', 'openapi', 'payment-gateway.yaml')

  let raw: string
  try {
    raw = await readFile(specPath, 'utf8')
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      return new NextResponse('OpenAPI spec not found', { status: 404, headers: { 'x-content-type-options': 'nosniff' } })
    }
    return new NextResponse('Error reading OpenAPI spec', { status: 500, headers: { 'x-content-type-options': 'nosniff' } })
  }

  const baseDoc = parsePaymentGatewaySpecYaml(raw)
  const displayDoc = buildPaymentGatewayDisplaySpec(baseDoc, includeAdvanced)

  const op = displayDoc.paths?.[virtualPath]?.post
  if (!op) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const mini = makeMiniSpec(displayDoc, virtualPath)
  const filenameBase = `payment-gateway.${opKey}.generated${includeAdvanced ? '.advanced' : ''}`

  if (format === 'json') {
    const jsonOut = JSON.stringify(mini, null, 2)
    return new NextResponse(jsonOut, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...(download ? { 'content-disposition': `attachment; filename="${filenameBase}.json"` } : {}),
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
      ...(download ? { 'content-disposition': `attachment; filename="${filenameBase}.yaml"` } : {}),
    },
  })
}
