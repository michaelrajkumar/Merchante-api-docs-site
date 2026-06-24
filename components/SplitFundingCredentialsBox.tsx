'use client'

import { useEffect, useMemo, useState } from 'react'

export type SplitFundingCredentials = {
  profileId: string
  profileKey: string
  environment: 'sandbox' | 'production'
}

const STORAGE_KEY = 'merchantE.credentials.splitFunding.v1'

export function useSplitFundingCredentials() {
  const [profileId, setProfileId] = useState('')
  const [profileKey, setProfileKey] = useState('')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [loaded, setLoaded] = useState(false)

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.profileId === 'string') setProfileId(parsed.profileId)
          if (typeof parsed.profileKey === 'string') setProfileKey(parsed.profileKey)
          if (parsed.environment === 'sandbox' || parsed.environment === 'production') {
            setEnvironment(parsed.environment)
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true)
    }
  }, [])

  // Cross-component sync (same tab)
  useEffect(() => {
    function onCredsEvent(e: any) {
      const d = e?.detail
      if (!d || typeof d !== 'object') return
      if (typeof d.profileId === 'string') setProfileId(d.profileId)
      if (typeof d.profileKey === 'string') setProfileKey(d.profileKey)
      if (d.environment === 'sandbox' || d.environment === 'production') {
        setEnvironment(d.environment)
      }
    }
    window.addEventListener('merchantE.credentials.splitFunding', onCredsEvent)
    return () => window.removeEventListener('merchantE.credentials.splitFunding', onCredsEvent)
  }, [])

  // Persist
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profileId, profileKey, environment }))
    } catch {
      // ignore
    }

    // Notify other components in this tab
    try {
      window.dispatchEvent(
        new CustomEvent('merchantE.credentials.splitFunding', {
          detail: { profileId, profileKey, environment },
        })
      )
    } catch {
      // ignore
    }
  }, [profileId, profileKey, environment, loaded])

  const serverUrl = 'https://test.api.merchante.com/v1'

  const creds = useMemo<SplitFundingCredentials & { serverUrl: string }>(() => ({
    profileId,
    profileKey,
    environment,
    serverUrl,
  }), [profileId, profileKey, environment, serverUrl])

  return {
    creds,
    setProfileId,
    setProfileKey,
    setEnvironment,
    clear: () => {
      setProfileId('')
      setProfileKey('')
      setEnvironment('sandbox')
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
  }
}

// Environment selector for Split Funding (Test only)
export function SplitFundingEnvironmentSelector({
  environment,
  onChange,
}: {
  environment: 'sandbox' | 'production'
  onChange: (env: 'sandbox' | 'production') => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-omise-gray-300">Server:</span>
      <div className="flex rounded-lg border border-omise-border bg-omise-dark-tertiary p-0.5">
        <button
          type="button"
          onClick={() => onChange('sandbox')}
          className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white"
        >
          Test
        </button>
      </div>
    </div>
  )
}

export function SplitFundingCredentialsBox() {
  const { creds, setProfileId, setProfileKey, setEnvironment, clear } = useSplitFundingCredentials()
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-omise-gray-100">Credentials</div>
        <button
          type="button"
          onClick={clear}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-omise-gray-400 hover:bg-omise-dark-tertiary hover:text-omise-gray-100"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        <label className="block">
          <div className="mb-1 text-[11px] font-semibold text-omise-gray-300">Profile ID</div>
          <input
            value={creds.profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="Your profile ID"
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan placeholder:text-omise-gray-500"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-omise-gray-300">Profile Key</div>
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-omise-gray-400 hover:bg-omise-dark-tertiary hover:text-omise-gray-100"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            value={creds.profileKey}
            onChange={(e) => setProfileKey(e.target.value)}
            placeholder="Your profile key"
            type={showKey ? 'text' : 'password'}
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan placeholder:text-omise-gray-500"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-2 text-[11px] text-omise-gray-400">
        Uses HTTP Basic Authentication. Stored locally in your browser.
      </div>
    </div>
  )
}
