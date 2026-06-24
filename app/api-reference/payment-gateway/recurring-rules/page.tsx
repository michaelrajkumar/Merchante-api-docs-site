import { PaymentGatewayClient } from '../[op]/PaymentGatewayClient'

// Helper function to group operations (same as in [op]/page.tsx)
const PAYMENT_GATEWAY_OPS = [
  { path: '/sale', tag: 'Sales', title: 'Sale' },
  { path: '/preauth', tag: 'Authorization', title: 'Pre-Authorization' },
  { path: '/capture', tag: 'Capture', title: 'Capture' },
  { path: '/refund', tag: 'Refunds', title: 'Refund' },
  { path: '/credit', tag: 'Refunds', title: 'Credit' },
  { path: '/void', tag: 'Voids', title: 'Void' },
  { path: '/verify', tag: 'Verification', title: 'Verify' },
  { path: '/create-temporary-token', tag: 'Token', title: 'Create Temporary Token' },
  { path: '/recurring-subscription', tag: 'Recurring', title: 'Recurring Subscription' },
  { path: '/recurring-installment', tag: 'Recurring', title: 'Recurring Installment' },
]

const TAG_ORDER = ['Sales', 'Authorization', 'Capture', 'Refunds', 'Voids', 'Verification', 'Token', 'Recurring']

function groupOps() {
  const byTag = new Map<string, typeof PAYMENT_GATEWAY_OPS>()
  for (const op of PAYMENT_GATEWAY_OPS) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, [])
    byTag.get(op.tag)!.push(op)
  }
  const out: { tag: string; ops: typeof PAYMENT_GATEWAY_OPS }[] = []
  for (const tag of TAG_ORDER) {
    const ops = byTag.get(tag)
    if (ops && ops.length) out.push({ tag, ops })
  }
  return out
}

export default function RecurringRulesPage() {
  const groups = groupOps()

  // Prepare sidebar data
  const sidebarGroups = groups.map((g) => ({
    tag: g.tag,
    items: g.ops.map((item) => ({
      path: item.path,
      title: item.title,
      href: `/api-reference/payment-gateway/${item.path.replace(/^\//, '')}`,
    })),
  }))

  // Inject "Recurring Payment Rules" link at the top of Recurring section
  const recurringIndex = sidebarGroups.findIndex((g) => g.tag === 'Recurring')
  if (recurringIndex !== -1) {
    sidebarGroups[recurringIndex].items.unshift({
      path: '/recurring-rules',
      title: '📘 Recurring Payment Rules',
      href: '/api-reference/payment-gateway/recurring-rules',
    })
  }

  return (
    <PaymentGatewayClient
      sidebarGroups={sidebarGroups}
      currentPath="/recurring-rules"
      footerContent={<div></div>}
      miniSpec={null}
      codeSamples={[]}
      tryItOutGroups={null}
      exampleValues={null}
    >
      <div className="rounded-2xl border border-omise-border bg-omise-dark-secondary p-6 shadow-soft-dark">
        <h1 className="text-3xl font-bold tracking-tight text-omise-gray-100">
          Recurring Payment Rules
        </h1>

        <div className="mt-6 space-y-6 text-omise-gray-300">
          <p className="text-base leading-7">
            A <span className="font-semibold text-omise-gray-100">Recurring payment</span> is a charge that will happen again.
          </p>

          <p className="text-base leading-7">
            Typically this comes in two flavors: <span className="font-semibold text-omise-cyan">Subscription based payments</span> and <span className="font-semibold text-omise-cyan">Installment based payments</span>.
          </p>

          {/* Subscription vs Installment */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-omise-border bg-omise-dark-tertiary p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-omise-teal/10">
                  <svg className="h-5 w-5 text-omise-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-omise-gray-100">Subscriptions</h3>
              </div>
              <p className="text-sm leading-6 text-omise-gray-300">
                Subscription based payments will <span className="font-semibold text-omise-gray-100">not typically have an end date</span>. Subscriptions will usually continue until the Subscription is canceled.
              </p>
            </div>

            <div className="rounded-xl border border-omise-border bg-omise-dark-tertiary p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-omise-gray-100">Installments</h3>
              </div>
              <p className="text-sm leading-6 text-omise-gray-300">
                Installments will <span className="font-semibold text-omise-gray-100">typically have an end date</span> and are handled slightly differently than subscriptions.
              </p>
            </div>
          </div>

          {/* Required Fields */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-omise-gray-100">Required Fields</h2>
            <p className="mt-3 text-sm text-omise-gray-400">
              All fields below should be considered required. Note that the <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">moto_ecommerce_ind</code> and the <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">cit_mit_indicator</code> are specific to the recurring type.
            </p>

            <div className="mt-6 space-y-6">
              {/* Subscription Fields */}
              <div className="rounded-xl border border-omise-border p-5">
                <h3 className="mb-3 text-base font-semibold text-omise-cyan">
                  Subscription-Based Recurring Payments
                </h3>
                <p className="mb-4 text-sm text-omise-gray-300">
                  For subscription-based recurring payments, send the following field:
                </p>
                <ul className="list-inside list-disc space-y-2 text-sm text-omise-gray-300">
                  <li>
                    <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">recurring_pmt_num</code>
                    <span className="ml-2 text-omise-gray-400">— Payment number in the sequence</span>
                  </li>
                </ul>
              </div>

              {/* Installment Fields */}
              <div className="rounded-xl border border-omise-border p-5">
                <h3 className="mb-3 text-base font-semibold text-amber-400">
                  Installment-Based Recurring Payments
                </h3>
                <p className="mb-4 text-sm text-omise-gray-300">
                  For installment-based recurring payments, send the following fields:
                </p>
                <ul className="list-inside list-disc space-y-2 text-sm text-omise-gray-300">
                  <li>
                    <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">recurring_pmt_num</code>
                    <span className="ml-2 text-omise-gray-400">— Current payment number</span>
                  </li>
                  <li>
                    <code className="rounded bg-omise-dark-tertiary px-1.5 py-0.5 text-omise-cyan">recurring_pmt_coun</code>
                    <span className="ml-2 text-omise-gray-400">— Total number of payments</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-omise-gray-100">Examples</h2>

            {/* Installment Example */}
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-amber-400">Example Installment</h3>
              <pre className="overflow-x-auto rounded-xl border border-omise-border bg-omise-dark p-4 text-xs leading-relaxed text-omise-gray-100">
{`profile_key=xxx&profile_id=xxx&transaction_type=D&transaction_amount=5.00&card_id=xxx&moto_ecommerce_ind=3&card_on_file=Y&cit_mit_indicator=M104&account_data_source=Y&cardholder_street_address=123&cardholder_zip=55555card_exp_ date=1228&CVV2=123&merchant_initiated=y&transaction_id=xxx&recurring_payment_num=2&recurring_pmt_coun=22`}
              </pre>
            </div>

            {/* Subscription Example */}
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-omise-cyan">Example Subscription</h3>
              <pre className="overflow-x-auto rounded-xl border border-omise-border bg-omise-dark p-4 text-xs leading-relaxed text-omise-gray-100">
{`profile_key=xxx&profile_id=xxx&transaction_type=D&transaction_amount=5.00&card_id=xxx&moto_ecommerce_ind=2&card_on_file=Y&cit_mit_indicator=M103&account_data_source=Y&cardholder_street_address=123&cardholder_zip=55555card_exp_ date=1228&CVV2=123&merchant_initiated=y&transaction_id=xxx&recurring_payment_num=2`}
              </pre>
            </div>
          </div>

          {/* Important Note */}
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Important Note</p>
                <p className="mt-1 text-sm text-amber-800">
                  In both examples, the <code className="rounded bg-amber-100 px-1 py-0.5 text-amber-900">transaction_id</code> is submitted in subsequent CoF transactions and is the transaction ID from the last approved authorization request for those credentials.
                </p>
              </div>
            </div>
          </div>

          {/* Links to API Endpoints */}
          <div className="mt-10 rounded-xl border border-omise-border bg-omise-dark-tertiary p-5">
            <h3 className="mb-4 text-base font-semibold text-omise-gray-100">Related API Endpoints</h3>
            <div className="space-y-2">
              <a
                href="/api-reference/payment-gateway/recurring-subscription"
                className="block rounded-lg border border-omise-border bg-omise-dark px-4 py-3 text-sm font-medium text-omise-cyan transition-colors hover:border-omise-cyan hover:bg-omise-dark-tertiary"
              >
                <span>Recurring Subscription API →</span>
                <p className="mt-1 text-xs text-omise-gray-400">Process subscription-based recurring payments</p>
              </a>
              <a
                href="/api-reference/payment-gateway/recurring-installment"
                className="block rounded-lg border border-omise-border bg-omise-dark px-4 py-3 text-sm font-medium text-omise-cyan transition-colors hover:border-omise-cyan hover:bg-omise-dark-tertiary"
              >
                <span>Recurring Installment API →</span>
                <p className="mt-1 text-xs text-omise-gray-400">Process installment-based recurring payments</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </PaymentGatewayClient>
  )
}
