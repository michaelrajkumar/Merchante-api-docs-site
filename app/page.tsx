'use client'

import { LeftNav } from '@/components/LeftNav'
import Link from 'next/link'
import { useState } from 'react'
import clsx from 'clsx'

const API_CARDS = [
  {
    title: 'Payment Gateway',
    description: 'Process credit card transactions including sales, authorizations, refunds, and voids. Supports tokenization, 3D Secure, and digital wallets.',
    href: '/api-reference/payment-gateway',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Account Updater',
    description: 'Automatically update stored card credentials when cards are replaced due to expiration, loss, or reissuance.',
    href: '/api-reference/account-updater',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Partner Portal',
    description: 'Salesforce-based partner integration for merchant onboarding, account management, and reporting.',
    href: '/api-reference/partner-portal',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Hosted Payments',
    description: 'Secure, PCI-compliant hosted payment pages that handle card data collection on your behalf.',
    href: '/api-reference/hosted-payments',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Split Funding',
    description: 'Split daily settlement amounts into multiple bank accounts. Configure merchant funding amounts for approved transactions.',
    href: '/api-reference/split-funding',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: 'Batch Processing',
    description: 'Submit high-volume transaction files for processing. Ideal for recurring billing and end-of-day settlements.',
    href: '/api-reference/batch-processing',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'Sub-Merchant',
    description: 'Manage sub-merchant accounts for payment facilitator and marketplace models.',
    href: '/api-reference/sub-merchant',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: 'Reporting',
    description: 'Access transaction reports, settlement data, and analytics through programmatic queries.',
    href: '/api-reference/reporting',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <main className="mx-auto flex max-w-[1400px] w-full">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-omise-dark-secondary border-r border-omise-border transform transition-transform duration-300 md:hidden overflow-y-auto',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-4 py-6 pt-16">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-omise-dark-tertiary text-omise-gray-400 hover:text-omise-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Mobile navigation content */}
          <div className="mb-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-omise-cyan">
              Get started
            </div>
            <ul className="space-y-1">
              <li>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm bg-gradient-to-r from-omise-teal to-omise-cyan text-white font-medium">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/#authentication" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Authentication
                </Link>
              </li>
              <li>
                <Link href="/#environments" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Environments
                </Link>
              </li>
              <li>
                <Link href="/#errors" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Errors
                </Link>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-omise-cyan">
              API Reference
            </div>
            <ul className="space-y-1">
              <li>
                <Link href="/api-reference/payment-gateway" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Payment Gateway
                </Link>
              </li>
              <li>
                <Link href="/api-reference/account-updater" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Account Updater
                </Link>
              </li>
              <li>
                <Link href="/api-reference/partner-portal" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/api-reference/hosted-payments" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Hosted Payments
                </Link>
              </li>
              <li>
                <Link href="/api-reference/split-funding" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Split Funding
                </Link>
              </li>
              <li>
                <Link href="/api-reference/batch-processing" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Batch Processing
                </Link>
              </li>
              <li>
                <Link href="/api-reference/sub-merchant" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Sub Merchant
                </Link>
              </li>
              <li>
                <Link href="/api-reference/reporting" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-omise-gray-300 hover:bg-omise-dark-tertiary hover:text-omise-cyan">
                  Reporting
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Desktop nav */}
      <LeftNav activeHref="/" />

      <div className="flex-1 min-w-0">
        {/* Mobile menu button */}
        <div className="md:hidden sticky top-14 z-30 bg-omise-dark border-b border-omise-border px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 text-sm text-omise-gray-300 hover:text-omise-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="gradient-hero border-b border-omise-border">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h1 className="text-4xl font-semibold tracking-tight text-omise-gray-100 sm:text-5xl">
              MerchantE API Reference
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-omise-gray-400">
              Complete reference documentation for the MerchantE payment platform.
              Build integrations to process payments, manage merchants, and access transaction data.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/api-reference/payment-gateway"
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-omise-teal to-omise-cyan px-5 py-2.5 text-sm font-medium text-white shadow-glow-cyan transition-all hover:opacity-90"
              >
                Explore Payment Gateway
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#apis"
                className="inline-flex items-center rounded-lg border border-omise-border bg-omise-dark-secondary px-5 py-2.5 text-sm font-medium text-omise-gray-300 transition-colors hover:border-omise-cyan hover:text-omise-gray-100"
              >
                View all APIs
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-12">
          {/* Base URL Section */}
          <section className="mb-12">
            <div className="rounded-xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-omise-gray-500">Base URL</h2>
              <div className="mt-3 flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-omise-dark-tertiary px-4 py-3 font-mono text-sm text-omise-cyan">
                  https://api.merchante-solutions.com/mes-api/tridentApi
                </code>
              </div>
              <p className="mt-3 text-sm text-omise-gray-500">
                Use <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">cert.merchante-solutions.com</code> for testing
              </p>
            </div>
          </section>

          {/* APIs Grid */}
          <section id="apis" className="mb-16 scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100">APIs</h2>
            <p className="mt-2 text-omise-gray-400">
              Select an API to view endpoints, request parameters, and response schemas.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {API_CARDS.map((api) => (
                <Link
                  key={api.href}
                  href={api.href}
                  className="group rounded-xl border border-omise-border bg-omise-dark-secondary p-5 shadow-soft-dark transition-all hover:border-omise-teal hover:shadow-glow-cyan"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-omise-dark-tertiary p-2.5 text-omise-cyan transition-all group-hover:bg-gradient-to-r group-hover:from-omise-teal group-hover:to-omise-cyan group-hover:text-white">
                      {api.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-omise-gray-100 transition-colors group-hover:text-omise-cyan">
                        {api.title}
                      </h3>
                      <p className="mt-1 text-sm text-omise-gray-400">
                        {api.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Authentication Section */}
          <section id="authentication" className="mb-12 scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100">Authentication</h2>
            <p className="mt-3 text-omise-gray-400">
              All API requests require authentication using your merchant credentials. Include your
              <code className="mx-1 rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">profile_id</code>
              and
              <code className="mx-1 rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">profile_key</code>
              in the request body for Payment Gateway requests.
            </p>

            <div className="mt-6 rounded-xl border border-omise-border bg-omise-dark-secondary overflow-hidden">
              <div className="border-b border-omise-border bg-omise-dark-tertiary px-4 py-2">
                <span className="text-xs font-medium text-omise-gray-500">Example Request</span>
              </div>
              <pre className="p-4 text-sm overflow-x-auto">
                <code className="text-omise-gray-300">
{`curl -X POST https://cert.merchante-solutions.com/mes-api/tridentApi \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "profile_id=YOUR_PROFILE_ID" \\
  -d "profile_key=YOUR_PROFILE_KEY" \\
  -d "transaction_type=D" \\
  -d "card_number=4012301230121237" \\
  -d "card_exp_date=1225" \\
  -d "transaction_amount=10.00"`}
                </code>
              </pre>
            </div>

            <div className="mt-4 rounded-xl border border-omise-border bg-omise-dark-secondary p-4 shadow-soft-dark">
              <div className="flex gap-3">
                <div className="mt-0.5 text-omise-cyan">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-omise-gray-400">
                  <span className="font-semibold text-omise-gray-100">Need credentials?</span>{' '}
                  <a
                    href="https://updates.merchante.com/request-access"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-omise-cyan hover:text-omise-teal transition-colors underline"
                  >
                    Submit Sales Engineering Support Request
                  </a>{' '}
                  to obtain test credentials for the test environment.
                </p>
              </div>
            </div>
          </section>

          {/* Environments Section */}
          <section id="environments" className="mb-12 scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100">Environments</h2>
            <p className="mt-3 text-omise-gray-400">
              MerchantE provides separate environments for testing and production. Always use the test
              environment during development to avoid processing live transactions.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-omise-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-omise-dark-tertiary text-omise-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Environment</th>
                    <th className="px-4 py-3 font-medium">Base URL</th>
                    <th className="px-4 py-3 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-omise-border bg-omise-dark-secondary">
                  <tr>
                    <td className="px-4 py-3 font-medium text-omise-gray-100">Test</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan text-xs">
                        cert.merchante-solutions.com
                      </code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-400">Development and testing</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-omise-gray-100">Production</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan text-xs">
                        api.merchante-solutions.com
                      </code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-400">Live transactions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Errors Section */}
          <section id="errors" className="mb-12 scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-omise-gray-100">Errors</h2>
            <p className="mt-3 text-omise-gray-400">
              The API returns standard error codes to indicate the result of each request. The
              <code className="mx-1 rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">error_code</code>
              field in responses indicates success or failure.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-omise-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-omise-dark-tertiary text-omise-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-omise-border bg-omise-dark-secondary">
                  <tr>
                    <td className="px-4 py-3">
                      <code className="rounded bg-green-900/30 px-1.5 py-0.5 text-green-400">000</code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-300">Approval - Transaction successful</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <code className="rounded bg-red-900/30 px-1.5 py-0.5 text-red-400">005</code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-300">Do Not Honor - Declined by issuer</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <code className="rounded bg-red-900/30 px-1.5 py-0.5 text-red-400">014</code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-300">Invalid Card Number</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <code className="rounded bg-red-900/30 px-1.5 py-0.5 text-red-400">051</code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-300">Insufficient Funds</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <code className="rounded bg-red-900/30 px-1.5 py-0.5 text-red-400">054</code>
                    </td>
                    <td className="px-4 py-3 text-omise-gray-300">Expired Card</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-omise-gray-500">
              See full error code in Payment Gateway specification.
            </p>
          </section>

          {/* Interactive Testing */}
          <section className="mb-12">
            <div className="rounded-2xl border border-omise-border bg-gradient-to-br from-omise-dark-secondary to-omise-dark-tertiary p-8 shadow-soft-dark">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-omise-teal/10 p-3 text-omise-cyan">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-omise-gray-100">Interactive API Testing</h3>
                  <p className="mt-2 text-omise-gray-400">
                    Each API endpoint includes a built-in request builder. Enter your credentials and test
                    parameters to make live requests directly from the documentation.
                  </p>
                  <Link
                    href="/api-reference/payment-gateway"
                    className="mt-4 inline-flex items-center text-sm font-medium text-omise-cyan hover:text-omise-teal transition-colors"
                  >
                    Try the Payment Gateway API
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-omise-border pt-8 text-center text-sm text-omise-gray-500">
            <p>MerchantE Solutions API Documentation</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
