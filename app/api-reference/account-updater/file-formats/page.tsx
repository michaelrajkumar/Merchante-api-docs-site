import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseYamlSafe } from '@/lib/yamlSafe'
import { AccountUpdaterClient } from '../[op]/AccountUpdaterClient'
import { ACCOUNT_UPDATER_OPS, ACCOUNT_UPDATER_TAG_ORDER } from '@/lib/accountUpdater'

export const metadata = {
  title: 'File Formats - Account Updater API | MerchantE Solutions',
  description: 'Fixed-width file format specifications for Account Updater request and response files',
}

function renderMarkdownTable(markdown: string) {
  // Simple markdown table parser
  const lines = markdown.trim().split('\n')
  const headerLine = lines.find(line => line.includes('|'))
  if (!headerLine) return <pre className="text-xs text-omise-gray-400">{markdown}</pre>

  const tableLines = lines.filter(line => line.trim().startsWith('|'))
  if (tableLines.length < 2) return <pre className="text-xs text-omise-gray-400">{markdown}</pre>

  const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean)
  const rows = tableLines.slice(2).map(row => // Skip separator line
    row.split('|').map(cell => cell.trim()).filter(Boolean)
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-omise-dark-tertiary text-omise-gray-400">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-4 py-2 font-medium border border-omise-border">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-omise-border bg-omise-dark-secondary">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2 text-omise-gray-300 border border-omise-border font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderFormatSection(title: string, content: string) {
  const lines = content.trim().split('\n')
  const description: string[] = []
  let tableMarkdown = ''
  let exampleLine = ''
  let inTable = false

  for (const line of lines) {
    if (line.includes('Example:')) {
      exampleLine = line.replace(/^.*Example:\s*`?/, '').replace(/`.*$/, '').trim()
    } else if (line.trim().startsWith('|')) {
      inTable = true
      tableMarkdown += line + '\n'
    } else if (line.trim().startsWith('##')) {
      // Skip, we're using our own title
      continue
    } else if (!inTable && line.trim()) {
      description.push(line.trim())
    }
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-omise-gray-100 mb-3">{title}</h3>

      {description.length > 0 && (
        <div className="mb-4 space-y-2">
          {description.map((line, idx) => (
            <p key={idx} className="text-sm text-omise-gray-400">{line}</p>
          ))}
        </div>
      )}

      {tableMarkdown && (
        <div className="mb-4">
          {renderMarkdownTable(tableMarkdown)}
        </div>
      )}

      {exampleLine && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-omise-gray-500 mb-1">Example:</div>
          <code className="block rounded-lg bg-omise-dark-tertiary px-4 py-2 text-xs font-mono text-omise-cyan border border-omise-border">
            {exampleLine}
          </code>
        </div>
      )}
    </div>
  )
}

function renderCodeTable(title: string, content: string) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-omise-gray-100 mb-3">{title}</h3>
      {renderMarkdownTable(content)}
    </div>
  )
}

export default async function FileFormatsPage() {
  const filePath = path.join(process.cwd(), 'public', 'openapi', 'account-updater.yaml')
  const yamlText = await readFile(filePath, 'utf8')
  const spec = parseYamlSafe(yamlText)

  const fileFormats = spec['x-file-formats'] || {}
  const responseCodes = spec['x-response-codes'] || {}

  const current = {
    slug: 'file-formats',
    title: 'File Formats',
    method: 'GET' as const,
    path: '/file-formats',
    tag: 'Documentation',
    description: 'Fixed-width file format specifications for request and response files',
  }

  return (
    <AccountUpdaterClient
      operations={ACCOUNT_UPDATER_OPS}
      currentOp={current}
      miniSpec={{}}
      codeSamples={[]}
      tagOrder={ACCOUNT_UPDATER_TAG_ORDER}
      tryItOutGroups={null}
      exampleValues={null}
      queryParams={[]}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-omise-gray-100">
            Account Updater File Formats
          </h1>
          <p className="mt-3 text-omise-gray-400">
            Fixed-width file format specifications for Account Updater request and response files.
          </p>
        </div>

        {/* Critical Notice */}
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-semibold text-red-400 mb-1">CRITICAL: Exact Field Lengths Required</div>
              <div className="text-sm text-red-300">
                All fields must be exact length, padded with trailing spaces. Incorrect field lengths will cause file processing errors.
              </div>
            </div>
          </div>
        </div>

        {/* Request File Format */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100 mb-4 pb-2 border-b border-omise-border">
            Request File Format
          </h2>
          <p className="text-sm text-omise-gray-400 mb-6">
            Request files must contain: Header (H1) + Detail Records (D1/D2) + Trailer (T1). Line endings separate records.
          </p>

          {fileFormats['request-file-header'] && renderFormatSection(
            'Header Record (H1)',
            fileFormats['request-file-header'].description || ''
          )}

          {fileFormats['request-file-detail-d1'] && renderFormatSection(
            'Detail Record (D1) - Full Card Numbers',
            fileFormats['request-file-detail-d1'].description || ''
          )}

          {fileFormats['request-file-detail-d2'] && renderFormatSection(
            'Detail Record (D2) - Card Store ID',
            fileFormats['request-file-detail-d2'].description || ''
          )}

          {fileFormats['request-file-trailer'] && renderFormatSection(
            'Trailer Record (T1)',
            fileFormats['request-file-trailer'].description || ''
          )}
        </section>

        {/* Response File Format */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100 mb-4 pb-2 border-b border-omise-border">
            Response File Format
          </h2>
          <p className="text-sm text-omise-gray-400 mb-6">
            Response files contain: Header (H1) + Detail Records (D1/D2) + Trailer (T1). Available 4 calendar days from posting.
          </p>

          {fileFormats['response-file-header'] && renderFormatSection(
            'Header Record (H1)',
            fileFormats['response-file-header'].description || ''
          )}

          {fileFormats['response-file-detail-d1'] && renderFormatSection(
            'Response Detail (D1) - Full Card Numbers',
            fileFormats['response-file-detail-d1'].description || ''
          )}

          {fileFormats['response-file-detail-d2'] && renderFormatSection(
            'Response Detail (D2) - Card Store ID',
            fileFormats['response-file-detail-d2'].description || ''
          )}

          {fileFormats['response-file-trailer'] && renderFormatSection(
            'Response Trailer (T1)',
            fileFormats['response-file-trailer'].description || ''
          )}
        </section>

        {/* Response Codes */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100 mb-4 pb-2 border-b border-omise-border">
            Response Codes
          </h2>
          <p className="text-sm text-omise-gray-400 mb-6">
            Response codes indicate the status of each account update request.
          </p>

          <div className="space-y-6">
            {responseCodes['update-codes'] && renderCodeTable(
              'Update Codes (Changes Made)',
              responseCodes['update-codes'].description || ''
            )}

            {responseCodes['no-update-codes'] && renderCodeTable(
              'No Update Codes',
              responseCodes['no-update-codes'].description || ''
            )}

            {responseCodes['error-codes'] && renderCodeTable(
              'Error / Non-Match Codes',
              responseCodes['error-codes'].description || ''
            )}
          </div>
        </section>

        {/* Source Codes */}
        {responseCodes['source-codes'] && (
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100 mb-4 pb-2 border-b border-omise-border">
              Response Source Codes
            </h2>
            {renderCodeTable(
              'Source Codes',
              responseCodes['source-codes'].description || ''
            )}
          </section>
        )}
      </div>
    </AccountUpdaterClient>
  )
}
