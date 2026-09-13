import { GREETINGS } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { IntroSection } from '@/components/sections/intro-section'
import { GreetingSection } from '@/components/sections/greeting-section'
import { FinaleSection } from '@/components/sections/finale/finale-section'
import { ScrollSpine } from '@/components/scroll/scroll-spine'
import { SectionRail, type RailItem } from '@/components/chrome/section-rail'
import { ThemeToggle } from '@/components/chrome/theme-toggle'
import { LoadingScreen } from '@/components/boot/loading-screen'
import { SoundControl } from '@/components/chrome/sound-control'

/**
 * The spine: intro, thirty greetings, finale.
 *
 * A Server Component — the whole page renders to static HTML, so the first
 * word paints without waiting on any JavaScript.
 */
export default function Home() {
  // The intro occupies section 0; the finale takes the slot after the thirty.
  // Font stacks are resolved here, on the server, so the rail stays a light
  // client component that never imports the font module.
  const railItems: RailItem[] = [
    { label: 'Start' },
    ...GREETINGS.map((g) => ({
      label: g.language.name,
      word: g.word,
      font: SCRIPT_FONT_STACK[g.script],
      dir: SCRIPTS[g.script].dir,
    })),
    { label: 'Finale' },
  ]

  return (
    <>
      <a
        href="/text"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:underline"
      >
        Skip to text version
      </a>

      <header className="fixed left-[var(--frame-inset)] top-[var(--frame-inset)] z-40 flex items-center gap-3">
        <ThemeToggle />
        <SoundControl />
      </header>

      <LoadingScreen />

      <ScrollSpine />
      <SectionRail items={railItems} />

      <main id="spine">
        <IntroSection />

        {GREETINGS.map((g, i) => (
          <GreetingSection
            key={g.id}
            greeting={g}
            sectionIndex={i + 1}
            ordinal={i + 1}
            total={GREETINGS.length}
          />
        ))}

        <FinaleSection sectionIndex={GREETINGS.length + 1} />
      </main>
    </>
  )
}
