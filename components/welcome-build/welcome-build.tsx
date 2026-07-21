"use client"

import { useState } from "react"
import { DeviceAssemblyGame } from "./device-assembly-game"
import { TradePassReveal } from "./trade-pass-reveal"
import { WelcomeGiftReveal } from "./welcome-gift-reveal"

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
  const [stage, setStage] = useState<"game" | "reveal" | "gift">("game")
  const [completing, setCompleting] = useState(false)
  const [result, setResult] = useState<CompleteResult | null>(null)

  const handleContinueFromReveal = async () => {
    if (completing) return
    setCompleting(true)
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" })
      const data: CompleteResult | null = res.ok ? await res.json() : null
      setResult(data)
      if (data?.giftAdded && data.giftContents && data.giftContents.length > 0) {
        setStage("gift")
      } else {
        onDone(data)
      }
    } catch {
      onDone(null)
    } finally {
      setCompleting(false)
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
          onContinue={handleContinueFromReveal}
        />
      )}
      {stage === "gift" && result?.giftContents && (
        <WelcomeGiftReveal
          giftProductName={result.giftProductName || "Welcome Pack"}
          giftContents={result.giftContents}
          giftValue={result.giftValue || 0}
          onContinue={() => onDone(result)}
        />
      )}
    </div>
  )
}
