"use client"

import { createPortal } from "react-dom"
import { Gift, Check } from "lucide-react"
import type { GiftContentItem } from "./welcome-build"

type Props = {
  giftProductName: string
  giftContents: GiftContentItem[]
  giftValue: number
  onClose: () => void
}

/** The first thing shown once a retailer lands in the real app after finishing the
 *  welcome build — one-shot, never reappears (app/page.tsx clears the trigger state
 *  after mount so a re-render can't show it twice). */
export function WelcomeGiftPopup({ giftProductName, giftContents, giftValue, onClose }: Props) {
  if (typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl border border-slate-150 text-center space-y-4 opacity-0 animate-scale-in [animation-fill-mode:forwards]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border-2 border-blue-100">
          <Gift className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-[17px] leading-tight">Your {giftProductName} is in your cart</h3>
          <p className="text-sm text-slate-500 mt-1.5">
            Worth <strong className="text-slate-700">£{giftValue.toFixed(2)}</strong>. On us, welcome to Unity.
          </p>
        </div>

        {giftContents.length > 0 && (
          <ul className="text-left space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            {giftContents.map((item) => (
              <li key={item.name} className="flex items-start gap-2 text-[13px] text-slate-700">
                <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="flex-1">{item.name}</span>
                {item.value > 0 && <span className="text-slate-400 font-mono text-[12px] shrink-0">£{item.value.toFixed(2)}</span>}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all active:scale-[0.98]"
        >
          Start shopping
        </button>
      </div>
    </div>,
    document.body
  )
}
