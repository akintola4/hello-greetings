import Link from 'next/link'
import { ThemeToggle } from '@/components/chrome/theme-toggle'

/**
 * The 404.
 *
 * The site's argument is that wherever you go, someone greets you — forty-five
 * people wave at you on the last screen. This is the one page where nobody
 * does: the same hand-drawn characters, arms down, one of them on their phone.
 *
 * The joke is structural rather than written, which is what lets the copy stay
 * to a single line.
 *
 * The frame is the intro's, deliberately: meta row, content, meta row, inside
 * `--frame-inset`. A 404 that does not look like the site is a second failure
 * on top of the first one.
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

      <main className="flex h-svh flex-col justify-between px-[var(--frame-inset)] py-[var(--frame-inset)]">
        {/* ps reserves the top-left gutter for the fixed theme toggle. */}
        <div className="flex items-baseline justify-between ps-14 sm:ps-16 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <span className="tabular-nums">404</span>
          <span>Not found</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 sm:gap-10">
          <div
            role="img"
            aria-label="Five hand-drawn people standing with their arms down, not waving. One of them is looking at their phone."
            className="nobody-art aspect-[1000/235] w-full max-w-[1200px]"
          />
          <p className="max-w-[20ch] text-balance text-center text-3xl leading-tight tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Nobody here says anything.
          </p>
        </div>

        <div className="flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            Back to the greetings
          </Link>
          <Link href="/index" className="underline underline-offset-4 hover:text-ink">
            Text version
          </Link>
        </div>
      </main>
    </>
  )
}
