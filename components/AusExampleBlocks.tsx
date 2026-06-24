'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { useAusCredentials } from '@/components/AusCredentialsBox'

function substitute(str: string, creds: { userId: string; userPass: string; merchId: string; serverUrl: string }) {
  let out = str
  out = out.replaceAll('YOUR_USER_ID_HERE', creds.userId || 'YOUR_USER_ID_HERE')
  out = out.replaceAll('YOUR_USER_PASS_HERE', creds.userPass || 'YOUR_USER_PASS_HERE')
  out = out.replaceAll('YOUR_MERCH_ID_HERE', creds.merchId || 'YOUR_MERCH_ID_HERE')
  out = out.replaceAll('https://www.merchante-solutions.com/srv/api', creds.serverUrl || 'https://www.merchante-solutions.com/srv/api')
  return out
}

export function AusExampleBlocks({
  requestTitle = 'Example request',
  requestTemplate,
  responseTitle = 'Example response',
  responseText,
  className,
}: {
  requestTitle?: string
  requestTemplate: string
  responseTitle?: string
  responseText?: string
  className?: string
}) {
  const { creds } = useAusCredentials()
  const req = useMemo(() => substitute(requestTemplate, creds), [requestTemplate, creds])
  const resp = useMemo(() => (responseText ? substitute(responseText, creds) : ''), [responseText, creds])

  return (
    <div className={clsx('space-y-6', className)}>
      <div>
        <div className="text-sm font-semibold text-omise-gray-100">{requestTitle}</div>
        <div className="mt-2 rounded-2xl bg-omise-dark p-4">
          <pre className="overflow-x-auto text-xs leading-5 text-omise-gray-100"><code>{req}</code></pre>
        </div>
      </div>

      {resp ? (
        <div>
          <div className="text-sm font-semibold text-omise-gray-100">{responseTitle}</div>
          <div className="mt-2 rounded-2xl bg-omise-dark p-4">
            <pre className="overflow-x-auto text-xs leading-5 text-omise-gray-100"><code>{resp}</code></pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}
