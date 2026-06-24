export type ApiKey =
  | 'payment-gateway'
  | 'account-updater'
  | 'partner-portal'
  | 'hosted-payments'
  | 'split-funding'
  | 'batch-processing'
  | 'sub-merchant'
  | 'reporting'

export const APIS: Array<{ key: ApiKey; label: string; specUrl?: string }> = [
  // Use a generated "display spec" route so we can show distinct operations (Sale, Refund, Void, etc.)
  // even though MerchantE's gateway is effectively a single /transaction endpoint with a transaction_type switch.
  { key: 'payment-gateway', label: 'Payment Gateway', specUrl: '/openapi/payment-gateway' },
  { key: 'account-updater', label: 'Account Updater', specUrl: '/openapi/account-updater' },
  { key: 'partner-portal', label: 'Partner Portal', specUrl: '/openapi/partner-portal' },
  { key: 'hosted-payments', label: 'Hosted Payments', specUrl: '/openapi/hosted-payments' },
  { key: 'split-funding', label: 'Split Funding', specUrl: '/openapi/split-funding' },
  { key: 'batch-processing', label: 'Batch Processing', specUrl: '/openapi/batch-processing' },
  { key: 'sub-merchant', label: 'Sub-Merchant', specUrl: '/openapi/sub-merchant' },
  { key: 'reporting', label: 'Reporting', specUrl: '/openapi/reporting' },
]

export const DEFAULT_API: ApiKey = 'payment-gateway'

export function getApiSpecUrl(key: ApiKey): string | null {
  const api = APIS.find((a) => a.key === key)
  return api?.specUrl ?? null
}

export function getApiLabel(key: ApiKey): string {
  return APIS.find((a) => a.key === key)?.label ?? key
}
