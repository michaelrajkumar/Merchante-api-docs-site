'use client'

import { useEffect, useMemo, useState } from 'react'

export type MerchantECredentials = {
  profileId: string
  profileKey: string
  environment: 'cert' | 'api'
}

const STORAGE_KEY = 'merchantE.credentials.paymentGateway.v2'

export function useMerchantECredentials() {
  const [profileId, setProfileId] = useState('')
  const [profileKey, setProfileKey] = useState('')
  const [environment, setEnvironment] = useState<'cert' | 'api'>('cert')
  const [loaded, setLoaded] = useState(false)

  // Load once from sessionStorage (clears on tab close for security)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.profileId === 'string') setProfileId(parsed.profileId)
          if (typeof parsed.profileKey === 'string') setProfileKey(parsed.profileKey)
          if (parsed.environment === 'cert' || parsed.environment === 'api') setEnvironment(parsed.environment)
        }
      }
    } catch {
      // Storage access may fail in some contexts
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
      if (d.environment === 'cert' || d.environment === 'api') setEnvironment(d.environment)
    }
    window.addEventListener('merchantE.credentials.paymentGateway', onCredsEvent)
    return () => window.removeEventListener('merchantE.credentials.paymentGateway', onCredsEvent)
  }, [])

  // Persist to sessionStorage (clears on tab close for security)
  useEffect(() => {
    if (!loaded) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ profileId, profileKey, environment }))
    } catch {
      // Storage access may fail in some contexts
    }

    // Notify other components in this tab (storage events don't fire in the same document)
    try {
      window.dispatchEvent(
        new CustomEvent('merchantE.credentials.paymentGateway', {
          detail: { profileId, profileKey, environment },
        })
      )
    } catch {
      // Event dispatch may fail in some contexts
    }
  }, [profileId, profileKey, environment, loaded])

  const creds = useMemo<MerchantECredentials>(() => ({ profileId, profileKey, environment }), [profileId, profileKey, environment])

  return {
    creds,
    setProfileId,
    setProfileKey,
    setEnvironment,
    clear: () => {
      setProfileId('')
      setProfileKey('')
      setEnvironment('cert')
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Storage access may fail in some contexts
      }
    },
  }
}

// Simple environment-only selector for the top of the page (Test only)
export function EnvironmentSelector({
  environment,
  onChange,
}: {
  environment: 'cert' | 'api'
  onChange: (env: 'cert' | 'api') => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-omise-gray-300">Server:</span>
      <div className="flex rounded-lg border border-omise-border bg-omise-dark-tertiary p-0.5">
        <button
          type="button"
          onClick={() => onChange('cert')}
          className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white"
        >
          Test
        </button>
      </div>
    </div>
  )
}

// Full credentials box for Try it out panel
export function CredentialsBox({
  profileId,
  profileKey,
  environment,
  onChange,
  onClear,
}: {
  profileId: string
  profileKey: string
  environment: 'cert' | 'api'
  onChange: (next: Partial<MerchantECredentials>) => void
  onClear: () => void
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-omise-gray-100">Credentials</div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-omise-gray-400 hover:bg-omise-dark-tertiary hover:text-omise-gray-100"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        <label className="block">
          <div className="mb-1 text-[11px] font-semibold text-omise-gray-300">environment</div>
          <select
            value={environment}
            onChange={(e) => onChange({ environment: e.target.value === 'api' ? 'api' : 'cert' })}
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan"
            disabled
          >
            <option value="cert">Test (Certification)</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-[11px] font-semibold text-omise-gray-300">profile_id</div>
          <input
            value={profileId}
            onChange={(e) => onChange({ profileId: e.target.value })}
            placeholder="Your 20-digit merchant ID"
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan placeholder:text-omise-gray-500"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-omise-gray-300">profile_key</div>
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-omise-gray-400 hover:bg-omise-dark-tertiary hover:text-omise-gray-100"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            value={profileKey}
            onChange={(e) => onChange({ profileKey: e.target.value })}
            placeholder="Your 32-character API password"
            type={showKey ? 'text' : 'password'}
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan placeholder:text-omise-gray-500"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-2 text-[11px] text-omise-gray-400">
        Stored in session (clears when tab closes).
      </div>
    </div>
  )
}