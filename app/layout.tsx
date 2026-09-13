import type { Metadata, Viewport } from 'next'
import { fontVariables } from '@/lib/fonts'
import { Providers } from '@/components/providers'
import { TOTAL_WORD } from '@/lib/stats'
import './globals.css'

/**
 * Where relative URLs in the metadata resolve against.
 *
 * Required, not optional: without it Next cannot build an absolute URL for the
 * share card, warns at build, and falls back to localhost — which is the single
 * most common way an OG image silently fails in production.
 *
 * There is no custom domain yet, so this reads the environment rather than
 * hardcoding a guess: set `NEXT_PUBLIC_SITE_URL` when there is one, and until
 * then Vercel's own production URL is correct on every deploy.
 */
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Hello',
  description: `${TOTAL_WORD} ways to say hello, and what each of them actually means. A scroll through how humans greet each other.`,
  openGraph: {
    title: 'Hello',
    description: `${TOTAL_WORD} ways to say hello, and what each of them actually means.`,
    type: 'website',
    siteName: 'Hello',
    locale: 'en_US',
    url: '/',
  },
  // The card itself comes from app/opengraph-image.png by file convention,
  // which also supplies its width, height and type. Next reuses it for Twitter
  // when there is no twitter-image, so `card` is all this needs.
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  // The sRGB equivalents of `--paper` in each theme. They have to be hex —
  // the meta tag predates oklch — so they are a hand-copy that drifts if the
  // token moves, which is why the token's value is named beside them.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f6' }, // oklch(0.972 0 0)
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' }, // oklch(0.168 0 0)
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
