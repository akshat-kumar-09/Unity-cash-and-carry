"use client"

import { Wallet, Info } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

export function WalletView() {
  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl">
      <AppScreenHeader title="Wallet" subtitle="Your account credits balance" />
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-slate-900 p-6 text-white shadow-xl shadow-blue-900/25">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Wallet className="h-5 w-5 opacity-95" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
              Available credits
            </span>
          </div>
          <p className="text-4xl font-bold tracking-tight">£0.00</p>
          <p className="mt-3 text-[13px] leading-snug text-blue-100/90">
            Credits can be applied at checkout. Contact Unity for top-up or adjustments.
          </p>
        </div>

        <div className="unity-card mt-5 flex gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-[13px] leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-900">About credits</p>
            <p className="mt-1.5">
              Credits come from Unity offers — for example, we include <span className="font-semibold text-slate-800">£20</span> account credit on your first offer. Your balance updates when credits are applied or used on an order.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
