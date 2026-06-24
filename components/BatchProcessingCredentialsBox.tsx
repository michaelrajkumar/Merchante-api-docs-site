'use client'

import { useEffect, useMemo, useState } from 'react'

export type BatchProcessingCredentials = {
  userId: string
  userPass: string
  profileId: string
  serverUrl: string
}

const STORAGE_KEY = 'merchantE.credentials.batchProcessing.v1'

// Servers from spec (Test only)
const SERVERS = [
  { url: 'https://test.merchante-solutions.com/srv/api', label: 'Test' },
]
const DEFAULT_SERVER = SERVERS[0].url

export function useBatchProcessingCredentials() {
  const [userId, setUserId] = useState('')
  const [userPass, setUserPass] = useState('')
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
      if (obj?.profileId) setProfileId(String(obj.profileId))
      if (obj?.serverUrl) setServerUrl(String(obj.serverUrl))
    } catch {
      // ignore
    }
  }, [])

  // save
  useEffect(() => {
    const obj: BatchProcessingCredentials = { userId, userPass, profileId, serverUrl }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
      // broadcast for same-tab listeners
      window.dispatchEvent(new CustomEvent('merchantE:batchCreds', { detail: obj }))
    } catch {
      // ignore
    }
  }, [userId, userPass, profileId, serverUrl])

  const creds = useMemo(() => ({ userId, userPass, profileId, serverUrl }), [userId, userPass, profileId, serverUrl])

  return {
    creds,
    setUserId,
    setUserPass,
    setProfileId,
    setServerUrl,
    clear: () => {
      setUserId('')
      setUserPass('')
      setProfileId('')
      setServerUrl(DEFAULT_SERVER)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent('merchantE:batchCreds', {
            detail: { userId: '', userPass: '', profileId: '', serverUrl: DEFAULT_SERVER },
          })
        )
      } catch {}
    },
  }
}

// Environment selector for Batch Processing
export function BatchProcessingEnvironmentSelector({
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

export function BatchProcessingCredentialsBox() {
  const { creds, setUserId, setUserPass, setProfileId, setServerUrl, clear } = useBatchProcessingCredentials()
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
        <label className="block text-sm font-semibold text-omise-gray-100">profileId</label>
        <input
          value={creds.profileId}
          onChange={(e) => setProfileId(e.target.value)}
          placeholder="ME gateway profile ID"
          className="mt-2 w-full rounded-xl border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-omise-blue/30 placeholder:text-omise-gray-500"
        />
      </div>

      <div className="mt-3 text-xs text-omise-gray-400">
        Stored locally in your browser.
      </div>
    </div>
  )
}
