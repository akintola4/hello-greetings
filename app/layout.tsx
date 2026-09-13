import type { Metadata, Viewport } from 'next'
import { fontVariables } from '@/lib/fonts'
import { Providers } from '@/components/providers'
import { TOTAL_WORD } from '@/lib/stats'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hello',
  description: `${TOTAL_WORD} ways to say hello, and what each of them actually means. A scroll through how humans greet each other.`,
  openGraph: {
    title: 'Hello',
    description: `${TOTAL_WORD} ways to say hello, and what each of them actually means.`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1917' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class onto <html>
    // before React hydrates, which would otherwise read as a mismatch.
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
