"use client"

import { useState } from "react"
import { DeviceAssemblyGame } from "./device-assembly-game"
import { TradePassReveal } from "./trade-pass-reveal"

export type GiftContentItem = { name: string; value: number }
type CompleteResult = {
  giftAdded: boolean
  giftProductName?: string
  giftContents?: GiftContentItem[]
  giftValue?: number
}

type Props = {
  companyName: string
  name: string | null
  vatNumber: string | null
  approvedAt: string | null
  /** Called once the whole sequence is done — result is null if the completion call
   *  failed, in which case the caller should treat the retailer as still ungated
   *  (they'll just see the build again next load) rather than trap them here. */
  onDone: (result: CompleteResult | null) => void
}

export function WelcomeBuild({ companyName, name, vatNumber, approvedAt, onDone }: Props) {
  const [stage, setStage] = useState<"game" | "reveal">("game")
  const [completing, setCompleting] = useState(false)

  const handleContinue = async () => {
    if (completing) return
    setCompleting(true)
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" })
      const data = res.ok ? await res.json() : null
      onDone(data)
    } catch {
      onDone(null)
    }
  }

  return (
    <div className="min-h-[100dvh] auth-page-bg">
      {stage === "game" && <DeviceAssemblyGame onComplete={() => setStage("reveal")} />}
      {stage === "reveal" && (
        <TradePassReveal
          companyName={companyName}
          name={name}
          vatNumber={vatNumber}
          approvedAt={approvedAt}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}
