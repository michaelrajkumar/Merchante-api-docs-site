'use client'

import { useEffect, useMemo, useState } from 'react'

export type HostedPaymentsCredentials = {
  profileId: string
  securityCode: string
  profileKey: string
  environment: 'production'
}

const STORAGE_KEY = 'merchantE.credentials.hostedPayments.v1'

export function useHostedPaymentsCredentials() {
  const [profileId, setProfileId] = useState('')
  const [securityCode, setSecurityCode] = useState('')
  const [profileKey, setProfileKey] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.profileId === 'string') setProfileId(parsed.profileId)
          if (typeof parsed.securityCode === 'string') setSecurityCode(parsed.securityCode)
          if (typeof parsed.profileKey === 'string') setProfileKey(parsed.profileKey)
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
      if (typeof d.securityCode === 'string') setSecurityCode(d.securityCode)
      if (typeof d.profileKey === 'string') setProfileKey(d.profileKey)
    }
    window.addEventListener('merchantE.credentials.hostedPayments', onCredsEvent)
    return () => window.removeEventListener('merchantE.credentials.hostedPayments', onCredsEvent)
  }, [])

  // Persist
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profileId, securityCode, profileKey }))
    } catch {
      // ignore
    }

    // Notify other components in this tab
    try {
      window.dispatchEvent(
        new CustomEvent('merchantE.credentials.hostedPayments', {
          detail: { profileId, securityCode, profileKey },
        })
      )
    } catch {
      // ignore
    }
  }, [profileId, securityCode, profileKey, loaded])

  // Hosted Payments uses test server only
  const serverUrl = 'https://cert.hostedpayments.merchante.com/hpp'

  const creds = useMemo<HostedPaymentsCredentials & { serverUrl: string }>(() => ({
    profileId,
    securityCode,
    profileKey,
    environment: 'production',
    serverUrl,
  }), [profileId, securityCode, profileKey, serverUrl])

  return {
    creds,
    setProfileId,
    setSecurityCode,
    setProfileKey,
    clear: () => {
      setProfileId('')
      setSecurityCode('')
      setProfileKey('')
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
  }
}

// Hosted Payments only has test server
export function HostedPaymentsEnvironmentSelector() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-omise-gray-300">Server:</span>
      <div className="flex rounded-lg border border-omise-border bg-omise-dark-tertiary p-0.5">
        <span className="rounded-md px-3 py-1.5 text-xs font-semibold bg-omise-blue text-white">
          Test
        </span>
      </div>
    </div>
  )
}

export function HostedPaymentsCredentialsBox() {
  const { creds, setProfileId, setSecurityCode, setProfileKey, clear } = useHostedPaymentsCredentials()
  const [showKey, setShowKey] = useState(false)
  const [showSecurityCode, setShowSecurityCode] = useState(false)

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

        <label className="block">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-omise-gray-300">Security Code (Optional)</div>
            <button
              type="button"
              onClick={() => setShowSecurityCode((s) => !s)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-omise-gray-400 hover:bg-omise-dark-tertiary hover:text-omise-gray-100"
            >
              {showSecurityCode ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            value={creds.securityCode}
            onChange={(e) => setSecurityCode(e.target.value)}
            placeholder="Your security code (if enabled)"
            type={showSecurityCode ? 'text' : 'password'}
            className="w-full rounded-lg border border-omise-border bg-omise-dark-tertiary px-3 py-2 text-xs text-white outline-none focus:border-omise-cyan placeholder:text-omise-gray-500"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-2 text-[11px] text-omise-gray-400">
        For security validation, use MD5(Profile Key + Security Code + Amount). Stored locally in your browser.
      </div>
    </div>
  )
}
