'use client'

import { ThemeProvider } from 'next-themes'
import { MotionPreferenceProvider } from '@/lib/motion/motion-preference'
import { SmoothScrollProvider } from '@/components/scroll/smooth-scroll-provider'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      // Both modes are first-class, so `system` is the only honest default.
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* Motion preference sits above smooth scroll: resolving to `reduced`
          tears Lenis down entirely rather than merely shortening it. */}
      <MotionPreferenceProvider>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </MotionPreferenceProvider>
    </ThemeProvider>
  )
}
