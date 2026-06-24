import type { Metadata } from 'next'
import './globals.css'

import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'MerchantE API Docs',
  description: 'Stripe-style API reference with interactive try-it-out.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
