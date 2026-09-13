import type { Metadata } from 'next'
import Link from 'next/link'
import { GREETINGS } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { TOTAL, TOTAL_WORD } from '@/lib/stats'

export const metadata: Metadata = {
  title: 'Hello — text version',
  description:
    'Every greeting on the site, as plain text. No scrolling, no animation, no sound.',
}

/**
 * The reader route.
 *
 * A snap-scrolled, animated experience has an irreducible floor of hostility
 * for some people. This is the honest answer: the same thirty greetings, in
 * full, as a plain document with no client JavaScript at all. It is also what
 * makes the content indexable.
 */
export default function ReaderPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <header className="mb-16">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">
          Hello — text version
        </h1>
        <p className="mt-6 text-2xl leading-snug text-balance">
          {TOTAL_WORD} ways to say hello, and what each of them actually means.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          This is the plain reading of the site: no scrolling, no animation, no
          sound.{' '}
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            Go to the full experience
          </Link>
          .
        </p>
      </header>

      <ol className="space-y-16">
        {GREETINGS.map((g, i) => {
          const script = SCRIPTS[g.script]
          return (
            <li key={g.id} id={g.id} className="scroll-mt-8">
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                <span>
                  {String(i + 1).padStart(2, '0')}/{TOTAL}
                </span>
                <span className="text-ink-2">{g.language.name}</span>
                <span>{g.region}</span>
                <span className="ml-auto">{g.language.iso639}</span>
              </div>

              <h2>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(g.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block no-underline hover:underline hover:decoration-1 hover:underline-offset-8"
                >
                  <span
                    data-word={g.id}
                    lang={g.language.iso639}
                    dir={script.dir}
                    // Generous leading rather than leading-none: Tibetan stacks
                    // vertically and Devanagari carries a shirorekha, so a tight
                    // line box clips them into the label above.
                    className="block text-5xl leading-[1.5] md:text-6xl"
                    style={{ fontFamily: SCRIPT_FONT_STACK[g.script] }}
                  >
                    {g.word}
                  </span>
                  <span className="sr-only">
                    {' '}
                    — {g.romanization}, {g.language.name}. Opens a web search in
                    a new tab.
                  </span>
                </a>
              </h2>

              <p
                aria-hidden="true"
                className="mt-3 font-mono text-sm tracking-[0.12em] text-ink-2"
              >
                {g.romanization}
                {g.ipa ? <span className="ml-3 text-ink-3">{g.ipa}</span> : null}
              </p>

              {g.literal ? (
                <p className="mt-5 text-lg italic text-balance">
                  Literally: {g.literal}
                </p>
              ) : null}

              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{g.note}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-3">{g.etymology}</p>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
