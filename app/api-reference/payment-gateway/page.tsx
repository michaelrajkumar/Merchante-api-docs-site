import { redirect } from 'next/navigation'

export default function PaymentGatewayIndex() {
  // Stripe-ish: land on the first common operation.
  redirect('/api-reference/payment-gateway/sale')
}
