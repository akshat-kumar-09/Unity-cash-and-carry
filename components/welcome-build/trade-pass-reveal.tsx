"use client"

import { useEffect, useState } from "react"
import { TradeIdCard } from "@/components/trade-id-card"
import { usePrefersReducedMotion } from "@/lib/reduced-motion"

type Props = {
  companyName: string
  name: string | null
  vatNumber: string | null
  approvedAt: string | null
  onContinue: () => void
}

export function TradePassReveal({ companyName, name, vatNumber, approvedAt, onContinue }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [showCard, setShowCard] = useState(false)
  const [showStamp, setShowStamp] = useState(false)
  const [showContinue, setShowContinue] = useState(false)

  useEffect(() => {
    const cardTimer = setTimeout(() => setShowCard(true), reducedMotion ? 100 : 250)
    const stampTimer = setTimeout(() => setShowStamp(true), reducedMotion ? 600 : 1100)
    const continueTimer = setTimeout(() => setShowContinue(true), reducedMotion ? 1000 : 1800)
    return () => {
      clearTimeout(cardTimer)
      clearTimeout(stampTimer)
      clearTimeout(continueTimer)
    }
  }, [reducedMotion])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div className={`transition-opacity duration-500 ${showCard ? "opacity-100" : "opacity-0"}`}>
        <p className="text-lg font-bold text-white">
          Welcome to the Unity App, {companyName || "partner"}.
        </p>
        <p className="mt-1 text-sm font-semibold text-white/70">This is your Unity card.</p>
      </div>

      <div className={`w-full max-w-sm transition-all duration-500 ${showCard ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
        <TradeIdCard companyName={companyName} name={name} vatNumber={vatNumber} approvedAt={approvedAt} animateStamp={showStamp} />
      </div>

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
