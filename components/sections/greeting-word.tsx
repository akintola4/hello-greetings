'use client'

import { useRef } from 'react'
import { useFitWord } from '@/lib/type/fit-word'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import type { ScriptId } from '@/content/scripts'

interface Props {
  word: string
  lang: string
  dir: 'ltr' | 'rtl'
  script: ScriptId
  typeScale: number
  tracking?: number
}

/**
 * The hero word.
 *
 * The reveal itself is a CSS transition on `--ink-p`, a registered
 * `@property`, so the traveling gradient mask runs on the compositor and is
 * driven purely by the section's `data-state`. That also makes the interrupt
 * case free: a CSS transition always resolves to its target, so a fast
 * scroller can never land on a word frozen halfway through its wipe — which is
 * the classic failure of a scrubbed or JS-timeline reveal.
 *
 * This component is client-side only because it measures itself; see
 * useFitWord for why a single clamp() cannot size these.
 */
export function GreetingWord({ word, lang, dir, script, typeScale, tracking }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  useFitWord(ref, { typeScale })

  return (
    <span
      ref={ref}
      data-word
      lang={lang}
      dir={dir}
      className="ink-word"
      style={{
        fontFamily: SCRIPT_FONT_STACK[script],
        letterSpacing: tracking != null ? `${tracking}em` : undefined,
        // RTL scripts must be inked from the right, the direction they are
        // written in.
        ['--ink-dir' as string]: dir === 'rtl' ? 'to left' : 'to right',
      }}
    >
      {word}
    </span>
  )
}
