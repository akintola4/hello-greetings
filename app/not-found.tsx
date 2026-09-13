import Link from 'next/link'
import { ThemeToggle } from '@/components/chrome/theme-toggle'

/**
 * The 404.
 *
 * The numeral is the page, and the numeral is made of people — the same
 * hand-drawn characters the closing crowd is made of, standing in the shape of
 * the number. On a site whose argument is that someone always greets you, the
 * people on the one page with nothing to offer are the error itself.
 *
 * No labels in the corners. A numeral this size does not need captioning, and
 * the pair that used to sit up there were doing nothing else.
 *
 * `ThemeToggle` is mounted here because every piece of chrome — toggle, sound,
 * loader, spine, rail — lives in `app/page.tsx` rather than the layout. A 404
 * inherits the theme tokens through `Providers` but would otherwise have no
 * way to switch them.
 *
 * Next ignores a `metadata` export from `not-found.tsx`, so the tab keeps the
 * layout's title. Fixing that needs a middleware rewrite to a real route,
 * which is a lot of machinery for a tab title.
 */
export default function NotFound() {
  return (
    <>
      <header className="fixed left-[var(--frame-inset)] top-[var(--frame-inset)] z-40">
        <ThemeToggle />
      </header>

      <main className="flex h-svh flex-col px-[var(--frame-inset)] py-[var(--frame-inset)]">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:gap-8">
          <div
            role="img"
            aria-label="The number 404, formed out of a crowd of small hand-drawn people standing in the shape of the digits."
            className="notfound-art aspect-[2227/1066] w-full"
          />
          <p className="max-w-[26ch] text-balance text-center text-lg leading-snug text-ink-2 sm:text-xl">
            Nobody here says anything.
          </p>
        </div>

        <div className="flex shrink-0 items-end justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <Link href="/" className="underline-offset-4 hover:underline hover:text-ink">
            Back to the greetings
          </Link>
          <Link href="/index" className="underline-offset-4 hover:underline hover:text-ink">
            Text version
          </Link>
        </div>
      </main>
    </>
  )
}
