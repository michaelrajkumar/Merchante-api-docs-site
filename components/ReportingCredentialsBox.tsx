'use client'

import { useEffect, useMemo, useState } from 'react'

export type ReportingCredentials = {
  userId: string
  userPass: string
  nodeId: string
  profileId: string
  serverUrl: string
}

const STORAGE_KEY = 'merchantE.credentials.reporting.v1'

// Servers from spec (Test only)
const SERVERS = [
  { url: 'https://test.merchante-solutions.com', label: 'Test' },
]
const DEFAULT_SERVER = SERVERS[0].url

export function useReportingCredentials() {
  const [userId, setUserId] = useState('')
  const [userPass, setUserPass] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj?.userId) setUserId(String(obj.userId))
      if (obj?.userPass) setUserPass(String(obj.userPass))
      if (obj?.nodeId) setNodeId(String(obj.nodeId))
      if (obj?.profileId) setProfileId(String(obj.profileId))
      if (obj?.serverUrl) setServerUrl(String(obj.serverUrl))
    } catch {
      // ignore
    }
  }, [])

  // save
  useEffect(() => {
    const obj: ReportingCredentials = { userId, userPass, nodeId, profileId, serverUrl }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
      // broadcast for same-tab listeners
      window.dispatchEvent(new CustomEvent('merchantE:reportingCreds', { detail: obj }))
    } catch {
      // ignore
    }
  }, [userId, userPass, nodeId, profileId, serverUrl])

  const creds = useMemo(() => ({ userId, userPass, nodeId, profileId, serverUrl }), [userId, userPass, nodeId, profileId, serverUrl])

  return {
    creds,
    setUserId,
    setUserPass,
    setNodeId,
    setProfileId,
    setServerUrl,
    clear: () => {
      setUserId('')
      setUserPass('')
      setNodeId('')
      setProfileId('')
      setServerUrl(DEFAULT_SERVER)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent('merchantE:reportingCreds', {
            detail: { userId: '', userPass: '', nodeId: '', profileId: '', serverUrl: DEFAULT_SERVER },
          })
        )
      } catch {}
    },
  }
}

// Environment selector for Reporting
export function ReportingEnvironmentSelector({
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
          onClick={() => onChange(SERVERS[0].url)}
          className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white"
        >
          Test
        </button>
      </div>
    </div>
  )
}

export function ReportingCredentialsBox() {
  const { creds, setUserId, setUserPass, setNodeId, setProfileId, setServerUrl, clear } = useReportingCredentials()
  const [show, setShow] = useState(false)

  return (
    <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-omise-gray-100">Credentials</div>
        <button className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-semibold text-omise-gray-100">Server</label>
        <select
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30"
          value={creds.serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
        >
          {SERVERS.map((s) => (
            <option key={s.url} value={s.url}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-omise-gray-100">userId</label>
        <input
          value={creds.userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="ME login ID"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-omise-gray-100">userPass</label>
          <button
            className="text-sm font-medium text-omise-gray-400 hover:text-omise-gray-100"
            onClick={() => setShow((s) => !s)}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={creds.userPass}
          onChange={(e) => setUserPass(e.target.value)}
          placeholder="ME login password"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-omise-gray-100">nodeId (Merchant #)</label>
        <input
          value={creds.nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          placeholder="941000123456"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-omise-gray-100">profileId (for Gateway reports)</label>
        <input
          value={creds.profileId}
          onChange={(e) => setProfileId(e.target.value)}
          placeholder="9410000xxxxx00000001"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-3 text-xs text-omise-gray-400">
        Stored locally in your browser.
      </div>
    </div>
  )
}
