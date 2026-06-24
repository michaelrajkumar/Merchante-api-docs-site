'use client'

import { useEffect, useMemo, useState } from 'react'

export type PartnerPortalCredentials = {
  clientId: string
  clientSecret: string
  username: string
  password: string
  accessToken: string
  serverUrl: string
}

const STORAGE_KEY = 'merchantE.credentials.partnerPortal.v1'

const DEFAULT_SERVER = 'https://test.salesforce.com'

export function usePartnerPortalCredentials() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj?.clientId) setClientId(String(obj.clientId))
      if (obj?.clientSecret) setClientSecret(String(obj.clientSecret))
      if (obj?.username) setUsername(String(obj.username))
      if (obj?.password) setPassword(String(obj.password))
      if (obj?.accessToken) setAccessToken(String(obj.accessToken))
      if (obj?.serverUrl) setServerUrl(String(obj.serverUrl))
    } catch {
      // ignore
    }
  }, [])

  // save
  useEffect(() => {
    const obj: PartnerPortalCredentials = { clientId, clientSecret, username, password, accessToken, serverUrl }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
      window.dispatchEvent(new CustomEvent('merchantE:partnerPortalCreds', { detail: obj }))
    } catch {
      // ignore
    }
  }, [clientId, clientSecret, username, password, accessToken, serverUrl])

  const creds = useMemo(
    () => ({ clientId, clientSecret, username, password, accessToken, serverUrl }),
    [clientId, clientSecret, username, password, accessToken, serverUrl]
  )

  return {
    creds,
    setClientId,
    setClientSecret,
    setUsername,
    setPassword,
    setAccessToken,
    setServerUrl,
    clear: () => {
      setClientId('')
      setClientSecret('')
      setUsername('')
      setPassword('')
      setAccessToken('')
      setServerUrl(DEFAULT_SERVER)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent('merchantE:partnerPortalCreds', {
            detail: { clientId: '', clientSecret: '', username: '', password: '', accessToken: '', serverUrl: DEFAULT_SERVER },
          })
        )
      } catch {}
    },
  }
}

// Environment selector for Partner Portal
export function PartnerPortalEnvironmentSelector({
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
          onClick={() => onChange(DEFAULT_SERVER)}
          className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white"
        >
          Test
        </button>
      </div>
    </div>
  )
}

export function PartnerPortalCredentialsBox() {
  const { creds, setClientId, setClientSecret, setUsername, setPassword, setAccessToken, setServerUrl, clear } =
    usePartnerPortalCredentials()
  const [showSecret, setShowSecret] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)

  return (
    <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-omise-gray-100">OAuth 2.0 Credentials</div>
        <button className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-semibold text-omise-gray-100">client_id</label>
        <input
          value={creds.clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Consumer key from Salesforce connected app"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-omise-gray-100">client_secret</label>
          <button
            className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
            onClick={() => setShowSecret((s) => !s)}
          >
            {showSecret ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={showSecret ? 'text' : 'password'}
          value={creds.clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Consumer secret"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-omise-gray-100">username</label>
        <input
          value={creds.username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g., partnerportalapi@merchante.com.cert"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-omise-gray-100">password</label>
          <button
            className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={creds.password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password + Security Token"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
        <p className="mt-1 text-xs text-omise-gray-500">Concatenate your password with your security token</p>
      </div>

      <div className="mt-4 border-t border-omise-border pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-omise-gray-100">Access Token</label>
          <button
            className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
            onClick={() => setShowToken((s) => !s)}
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={showToken ? 'text' : 'password'}
          value={creds.accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Paste access token after authentication"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
        <p className="mt-1 text-xs text-omise-gray-500">
          Use the Authentication endpoint to obtain a token, then paste it here for other API calls
        </p>
      </div>

      <div className="mt-3 text-xs text-omise-gray-400">
        Stored locally in your browser.
      </div>
    </div>
  )
}
