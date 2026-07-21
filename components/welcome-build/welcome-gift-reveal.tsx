"use client"

import { useEffect, useState } from "react"
import { Check, Gift } from "lucide-react"
import { usePrefersReducedMotion } from "@/lib/reduced-motion"
import type { GiftContentItem } from "./welcome-build"

type Props = {
  giftProductName: string
  giftContents: GiftContentItem[]
  giftValue: number
  onContinue: () => void
}

const SPARKLE_POSITIONS = [
  { left: "10%", top: "8%", delay: 0 },
  { left: "86%", top: "14%", delay: 250 },
  { left: "16%", top: "80%", delay: 450 },
  { left: "82%", top: "76%", delay: 150 },
]

/** The gift-celebration beat — its own full-screen stage inside the welcome-build flow
 *  (not a popup after landing in the app), shown right after the Trade Pass reveal. */
export function WelcomeGiftReveal({ giftProductName, giftContents, giftValue, onContinue }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [showContents, setShowContents] = useState(false)
  const [showContinue, setShowContinue] = useState(false)

  useEffect(() => {
    const contentsTimer = setTimeout(() => setShowContents(true), reducedMotion ? 300 : 700)
    const continueTimer = setTimeout(() => setShowContinue(true), reducedMotion ? 700 : 1300)
    return () => {
      clearTimeout(contentsTimer)
      clearTimeout(continueTimer)
    }
  }, [reducedMotion])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="relative flex flex-col items-center opacity-0 animate-scale-in [animation-fill-mode:forwards]">
        {!reducedMotion && (
          <>
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: "-40%",
                background:
                  "radial-gradient(circle, rgba(253,224,71,0.32) 0%, rgba(34,211,238,0.18) 45%, transparent 75%)",
                filter: "blur(12px)",
              }}
              aria-hidden
            />
            {SPARKLE_POSITIONS.map((s, i) => (
              <span
                key={i}
                className="welcome-build-sparkle absolute"
                style={{ left: s.left, top: s.top, animationDelay: `${s.delay}ms` }}
                aria-hidden
              >
                ✦
              </span>
            ))}
          </>
        )}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
          <Gift className="h-8 w-8 text-amber-200" />
        </div>
      </div>

      <div className="opacity-0 animate-scale-in [animation-fill-mode:forwards]" style={{ animationDelay: "150ms" }}>
        <p className="text-2xl font-black text-white">Here is your welcome gift</p>
        <p className="mt-1.5 text-sm font-semibold text-white/70">
          Your {giftProductName}, worth £{giftValue.toFixed(2)}
        </p>
      </div>

      {showContents && giftContents.length > 0 && (
        <ul className="w-full max-w-sm space-y-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-left opacity-0 animate-scale-in [animation-fill-mode:forwards] backdrop-blur-md">
          {giftContents.map((item) => (
            <li key={item.name} className="flex items-start gap-2 text-[13px] text-white">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <span className="flex-1">{item.name}</span>
              {item.value > 0 && (
                <span className="shrink-0 font-mono text-[12px] text-white/60">£{item.value.toFixed(2)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onContinue}
        className={`px-8 py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-xs bg-white text-blue-700 shadow-lg transition-opacity duration-500 ${
          showContinue ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        Continue
      </button>
    </div>
  )
}
