import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Traversee',
  description: 'A community-driven cycling and hiking route hub for northern Taiwan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale is hardcoded for M0. Real /zh and /en routing arrives with next-intl
  // in M2; hardcoding it now would be a lie the moment that lands, so this is
  // the one place that will need revisiting.
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  )
}
