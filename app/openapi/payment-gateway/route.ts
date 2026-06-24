import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { buildPaymentGatewayDisplaySpec, parsePaymentGatewaySpecYaml } from '@/lib/paymentGateway'

export async function GET(req: Request) {
  // Stripe-like default: hide the raw /transaction endpoint.
  // Add it back with ?advanced=1.
  const url = new URL(req.url)
  const includeAdvanced = url.searchParams.get('advanced') === '1'
  const format = (url.searchParams.get('format') || 'yaml').toLowerCase()
  const download = url.searchParams.get('download') === '1'
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

  const doc = parsePaymentGatewaySpecYaml(raw)
  const display = buildPaymentGatewayDisplaySpec(doc, includeAdvanced)

  const filename = includeAdvanced ? 'payment-gateway.generated.advanced' : 'payment-gateway.generated'

  if (format === 'json') {
    const jsonOut = JSON.stringify(display, null, 2)
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

  const yamlOut = YAML.stringify(display)

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
