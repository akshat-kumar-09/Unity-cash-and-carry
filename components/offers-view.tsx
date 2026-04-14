"use client"

import { Tag, Gift, Truck, Sparkles } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

export function OffersView() {
  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl">
      <AppScreenHeader
        title="Offers"
        subtitle="Promos and bundle deals for trade customers"
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-900/20">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Trade offers</h2>
          <p className="mt-1.5 text-[14px] leading-snug text-blue-100">
            Seasonal promos and case bundles. Wallet credits are issued through offers — including £20 credit on your first offer.
          </p>
        </div>

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Current highlights
          </h3>
          <div className="grid gap-3">
            <div className="unity-card flex gap-4 p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Gift className="h-6 w-6 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Bundle deals</p>
                <p className="unity-meta mt-1">
                  Mix-and-match cases on selected lines. Your account manager can confirm what’s live.
                </p>
              </div>
            </div>
            <div className="unity-card flex gap-4 p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Truck className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Fast dispatch</p>
                <p className="unity-meta mt-1">
                  Orders before cut-off dispatched within 24 hours. UK tracked postage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="unity-card flex items-start gap-3 border-blue-100 bg-blue-50/50 p-4">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-[13px] leading-snug text-slate-700">
            Offers update regularly. Check with Unity Cash &amp; Carry for the latest wholesale pricing.
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-400">
          Unity Cash &amp; Carry · Trade wholesale · Glasgow
        </p>
      </main>
    </div>
  )
}
