'use client'

import YAML from 'yaml'
import { useMemo } from 'react'
import { useMerchantECredentials } from './CredentialsBox'
import { useAusCredentials } from './AusCredentialsBox'

type ApiKind = 'gateway' | 'account-updater'
type FormatKind = 'yaml' | 'json'

function shouldReplaceBasic(current: unknown) {
  if (current == null) return true
  if (typeof current !== 'string') return false
  const v = current.trim()
  return v === '' || /^YOUR_/i.test(v)
}

function shouldReplaceGateway(current: unknown, kind: 'id' | 'key') {
  if (current == null) return true
  if (typeof current !== 'string') return false
  const v = current.trim()
  if (v === '') return true
  const patterns =
    kind === 'id'
      ? [/^YOUR_PROFILE_ID/i, /^YOUR 20-?DIGIT/i]
      : [/^YOUR_PROFILE_KEY/i, /^YOUR 32-?CHAR/i]
  return patterns.some((p) => p.test(v))
}

function deepClone<T>(obj: T): T {
  return obj == null ? obj : (JSON.parse(JSON.stringify(obj)) as T)
}

function fillGateway(example: any, profileId?: string, profileKey?: string) {
  const out: any = deepClone(example)
  const stack: any[] = [out]

  while (stack.length) {
    const cur = stack.pop()
    if (!cur || typeof cur !== 'object') continue
    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item)
      continue
    }
    for (const k of Object.keys(cur)) {
      const val = cur[k]
      if (val && typeof val === 'object') stack.push(val)

      if (k === 'profile_id' && profileId && shouldReplaceGateway(val, 'id')) cur[k] = profileId
      if (k === 'profile_key' && profileKey && shouldReplaceGateway(val, 'key')) cur[k] = profileKey
    }
  }

  return out
}

function fillAus(example: any, userId?: string, userPass?: string, merchId?: string) {
  const out: any = deepClone(example)
  const stack: any[] = [out]

  while (stack.length) {
    const cur = stack.pop()
    if (!cur || typeof cur !== 'object') continue
    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item)
      continue
    }
    for (const k of Object.keys(cur)) {
      const val = cur[k]
      if (val && typeof val === 'object') stack.push(val)

      if (k === 'userId' && userId && shouldReplaceBasic(val)) cur[k] = userId
      if (k === 'userPass' && userPass && shouldReplaceBasic(val)) cur[k] = userPass
      if (k === 'merchId' && merchId && shouldReplaceBasic(val)) cur[k] = merchId
    }
  }

  return out
}

export function ExampleRequestBlock({
  example,
  api = 'gateway',
  format = 'yaml',
}: {
  example: any
  api?: ApiKind
  format?: FormatKind
}) {
  const { creds: gw } = useMerchantECredentials()
  const { creds: aus } = useAusCredentials()

  const rendered = useMemo(() => {
    const filled =
      api === 'account-updater'
        ? fillAus(example, aus.userId, aus.userPass, aus.merchId)
        : fillGateway(example, gw.profileId, gw.profileKey)

    if (format === 'json') return JSON.stringify(filled, null, 2)
    return YAML.stringify(filled)
  }, [api, format, example, gw.profileId, gw.profileKey, aus.userId, aus.userPass, aus.merchId])

  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-omise-border bg-omise-dark p-4 text-xs text-omise-gray-100">
      {rendered}
    </pre>
  )
}
