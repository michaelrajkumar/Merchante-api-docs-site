import { notFound } from 'next/navigation'
import { APIS, type ApiKey } from '@/lib/apis'
import { ApiRefClient } from './ApiRefClient'

export default async function ApiReferencePage({ params }: { params: Promise<{ api: string }> }) {
  const { api } = await params
  const apiKey = api as ApiKey
  const exists = APIS.some((a) => a.key === apiKey)
  if (!exists) return notFound()

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-omise-border bg-omise-dark-secondary shadow-soft-dark">
        <ApiRefClient apiKey={apiKey} />
      </div>
    </main>
  )
}
