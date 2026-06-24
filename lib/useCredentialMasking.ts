'use client'

import { useEffect } from 'react'

/**
 * List of sensitive field names that should be masked in cURL output.
 * These patterns match common credential field names across all MerchantE APIs.
 */
const SENSITIVE_FIELDS = [
  // Payment Gateway
  'profile_id',
  'profile_key',
  // Batch Processing, Account Updater, Reporting
  'userId',
  'userPass',
  'user_id',
  'user_pass',
  // OAuth / Salesforce APIs
  'client_id',
  'client_secret',
  'access_token',
  'password',
  'grant_type',
  // Hosted Payments
  'hpp_key',
  // Generic
  'api_key',
  'apiKey',
  'secret',
  'token',
  'auth',
  'Authorization',
]

/**
 * Masks a credential value, showing only first 4 chars + asterisks
 */
function maskValue(value: string): string {
  if (value.length <= 4) return '****'
  return value.slice(0, 4) + '****'
}

/**
 * Masks sensitive credentials in a cURL command string.
 * Handles various formats:
 * - --data-urlencode "field=value"
 * - -d "field=value"
 * - -d 'field=value'
 * - -H "Authorization: Bearer token"
 * - JSON body with "field": "value"
 */
function maskCredentialsInCurl(curlText: string): string {
  let masked = curlText

  for (const field of SENSITIVE_FIELDS) {
    // Match: --data-urlencode "field=value" or -d "field=value"
    const urlEncodePattern = new RegExp(
      `(--data-urlencode\\s+["']${field}=)([^"']+)(["'])`,
      'gi'
    )
    masked = masked.replace(urlEncodePattern, (_, prefix, value, suffix) => {
      return `${prefix}${maskValue(value)}${suffix}`
    })

    // Match: -d "field=value&..." or -d 'field=value&...'
    const formDataPattern = new RegExp(
      `(${field}=)([^&"'\\s]+)`,
      'gi'
    )
    masked = masked.replace(formDataPattern, (_, prefix, value) => {
      return `${prefix}${maskValue(value)}`
    })

    // Match: "field": "value" in JSON
    const jsonPattern = new RegExp(
      `("${field}"\\s*:\\s*")([^"]+)(")`,
      'gi'
    )
    masked = masked.replace(jsonPattern, (_, prefix, value, suffix) => {
      return `${prefix}${maskValue(value)}${suffix}`
    })

    // Match: -H "Authorization: Bearer token" or similar headers
    if (field.toLowerCase() === 'authorization') {
      const authHeaderPattern = /(-H\s+["']Authorization:\s*(?:Bearer|Basic)\s+)([^"']+)(["'])/gi
      masked = masked.replace(authHeaderPattern, (_, prefix, value, suffix) => {
        return `${prefix}${maskValue(value)}${suffix}`
      })
    }
  }

  return masked
}

/**
 * Hook that observes Swagger UI's cURL output and masks sensitive credentials.
 * Uses MutationObserver to watch for dynamically generated cURL commands.
 *
 * @param enabled - Whether masking is enabled (default: true)
 */
export function useCredentialMasking(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    // Function to mask credentials in all cURL elements
    const maskAllCurlElements = () => {
      const curlElements = document.querySelectorAll('.curl-command, .curl')

      curlElements.forEach((element) => {
        // Skip if already masked
        if (element.getAttribute('data-credentials-masked') === 'true') return

        const textarea = element.querySelector('textarea')
        const preElement = element.querySelector('pre')
        const codeElement = element.querySelector('code')

        // Handle textarea (editable cURL)
        if (textarea && textarea.value) {
          const original = textarea.value
          const masked = maskCredentialsInCurl(original)
          if (original !== masked) {
            textarea.value = masked
            element.setAttribute('data-credentials-masked', 'true')
          }
        }

        // Handle pre/code elements (read-only cURL display)
        const textElement = codeElement || preElement
        if (textElement && textElement.textContent) {
          const original = textElement.textContent
          const masked = maskCredentialsInCurl(original)
          if (original !== masked) {
            textElement.textContent = masked
            element.setAttribute('data-credentials-masked', 'true')
          }
        }
      })
    }

    // Initial mask
    maskAllCurlElements()

    // Watch for DOM changes (Swagger UI updates cURL dynamically)
    const observer = new MutationObserver((mutations) => {
      let shouldMask = false

      for (const mutation of mutations) {
        // Check if any added nodes or changed nodes might be cURL related
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target = mutation.target as Element
          if (
            target.classList?.contains('curl-command') ||
            target.classList?.contains('curl') ||
            target.closest?.('.curl-command') ||
            target.closest?.('.curl') ||
            target.querySelector?.('.curl-command') ||
            target.querySelector?.('.curl')
          ) {
            shouldMask = true
            break
          }
        }

        // Also check added nodes
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              if (
                node.classList?.contains('curl-command') ||
                node.classList?.contains('curl') ||
                node.querySelector?.('.curl-command') ||
                node.querySelector?.('.curl')
              ) {
                shouldMask = true
                break
              }
            }
          }
        }
      }

      if (shouldMask) {
        // Small delay to let Swagger UI finish rendering
        setTimeout(maskAllCurlElements, 50)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [enabled])
}
