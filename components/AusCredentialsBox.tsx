'use client'

import { useEffect, useMemo, useState } from 'react'

export type AusCredentials = {
  userId: string
  userPass: string
  merchId: string
  serverUrl: string
}

const STORAGE_KEY = 'merchantE.credentials.accountUpdater.v1'

// Servers from spec
const TEST_SERVER = 'https://test.merchante-solutions.com/srv/api'
const DEFAULT_SERVER = TEST_SERVER

export function useAusCredentials() {
  const [userId, setUserId] = useState('')
  const [userPass, setUserPass] = useState('')
  const [merchId, setMerchId] = useState('')
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)

  // load from sessionStorage (clears on tab close for security)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj?.userId) setUserId(String(obj.userId))
      if (obj?.userPass) setUserPass(String(obj.userPass))
      if (obj?.merchId) setMerchId(String(obj.merchId))
      if (obj?.serverUrl) setServerUrl(String(obj.serverUrl))
    } catch {
      // Storage access may fail in some contexts
    }
  }, [])

  // save to sessionStorage (clears on tab close for security)
  useEffect(() => {
    const obj: AusCredentials = { userId, userPass, merchId, serverUrl }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
      // broadcast for same-tab listeners
      window.dispatchEvent(new CustomEvent('merchantE:ausCreds', { detail: obj }))
    } catch {
      // Storage access may fail in some contexts
    }
  }, [userId, userPass, merchId, serverUrl])

  const creds = useMemo(() => ({ userId, userPass, merchId, serverUrl }), [userId, userPass, merchId, serverUrl])

  return { creds, setUserId, setUserPass, setMerchId, setServerUrl, clear: () => {
    setUserId(''); setUserPass(''); setMerchId(''); setServerUrl(DEFAULT_SERVER)
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage access may fail */ }
    try { window.dispatchEvent(new CustomEvent('merchantE:ausCreds', { detail: { userId: '', userPass: '', merchId: '', serverUrl: DEFAULT_SERVER } })) } catch { /* Event dispatch may fail */ }
  } }
}

// Account Updater environment selector
export function AusEnvironmentSelector({
  serverUrl,
  onChange,
}: {
  serverUrl: string
  onChange: (url: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-omise-gray-300">Server:</span>
      <div className="flex rounded-lg border border-omise-border bg-omise-dark-tertiary p-0.5">
        <button
          type="button"
          onClick={() => onChange(TEST_SERVER)}
          className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white"
        >
          Test
        </button>
      </div>
    </div>
  )
}

export function AusCredentialsBox() {
  const { creds, setUserId, setUserPass, setMerchId, setServerUrl, clear } = useAusCredentials()
  const [show, setShow] = useState(false)

  return (
    <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-omise-gray-100">Credentials</div>
        <button className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100" onClick={clear}>Clear</button>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-semibold text-omise-gray-100">userId</label>
        <input
          value={creds.userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="AUS merchant userId"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-omise-gray-100">userPass</label>
          <button className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100" onClick={() => setShow((s) => !s)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={creds.userPass}
          onChange={(e) => setUserPass(e.target.value)}
          placeholder="AUS password"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-omise-gray-100">merchId</label>
        <input
          value={creds.merchId}
          onChange={(e) => setMerchId(e.target.value)}
          placeholder="Merchant ID"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-3 text-xs text-omise-gray-400">
        Stored in session (clears when tab closes).
      </div>
    </div>
  )
}
