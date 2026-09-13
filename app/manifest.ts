import type { MetadataRoute } from 'next'

/**
 * Web app manifest.
 *
 * Small but not pointless: it is what lets the site be saved to a home screen
 * with its own name and icon rather than a screenshot and a URL, and it is
 * where the colours the browser paints around the page are declared.
 *
 * The theme colour matches `--paper` in light mode, the same value the
 * `themeColor` viewport export carries.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hello — thirty-six ways to greet',
    short_name: 'Hello',
    description:
      'Thirty-six ways to say hello, and what each of them actually means.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f6f6',
    theme_color: '#f6f6f6',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  }
}
