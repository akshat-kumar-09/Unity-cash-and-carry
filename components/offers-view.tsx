"use client"

import { useState, useEffect } from "react"
import { Tag, Gift, Truck, Sparkles, Copy, Check, RefreshCw } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

interface PromoCode {
  id: string
  code: string
  description: string
  discountType: string
  value: number
  minOrderValue: number
}

export function OffersView() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/promo")
      if (!res.ok) throw new Error("Failed to load offers")
      const data = await res.json()
      setPromos(data)
    } catch (err: any) {
      console.error(err)
      toast.error("Could not load current wholesale offers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromos()
  }, [])

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied code "${code}" to clipboard!`)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader
        title="Offers"
        subtitle="Promos and bundle deals for trade customers"
      />
      <main className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* Header Promo Banner */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-900/20 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
          <h2 className="text-xl font-black tracking-tight Outfit">Exclusive wholesale vouchers</h2>
          <p className="mt-2 text-xs leading-relaxed text-blue-100/90">
            Apply these exclusive Glasgow depot promotional codes during checkout to claim discounts on your wholesale stock runs. Credits are applied immediately.
          </p>
        </div>

        {/* Dynamic Vouchers List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Active Trade Codes
            </h3>
            <button 
              onClick={() => { setLoading(true); fetchPromos(); }}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-white animate-pulse rounded-2xl border border-slate-100"></div>
              ))}
            </div>
          ) : promos.length === 0 ? (
            <div className="unity-card border border-dashed border-slate-200 bg-white py-8 px-4 text-center">
              <Tag className="h-7 w-7 text-slate-350 mx-auto mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">No promo codes active</p>
              <p className="text-xs text-slate-450 mt-1">Check back later for seasonal trade offers.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {promos.map((promo) => (
                <div 
                  key={promo.id} 
                  className="unity-card bg-white border border-slate-150 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-blue-600 to-cyan-500"></div>
                  
                  <div className="text-left space-y-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black font-mono text-sm uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                        {promo.code}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {promo.discountType === "percentage" ? `${promo.value}% OFF` : `£${promo.value} OFF`}
                      </span>
                    </div>
                    <p className="font-bold text-slate-700 text-[13px] leading-snug">{promo.description}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {promo.minOrderValue > 0 
                        ? `Applies to orders of £${promo.minOrderValue.toFixed(2)} or more` 
                        : "No minimum order requirement"
                      }
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(promo.code)}
                    className={`sm:shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all active:scale-95 ${
                      copiedCode === promo.code
                        ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-750"
                    }`}
                  >
                    {copiedCode === promo.code ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Generic perks */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-left">
            Depot Wholesale Perks
          </h3>
          <div className="grid gap-3">
            <div className="unity-card bg-white border border-slate-100 flex gap-4 p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                <Gift className="h-6 w-6 text-amber-700" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-sm">Scotland Pallet Deliveries</p>
                <p className="unity-meta mt-1">
                  Claim free wholesale shipping on orders over £500. Securely wrapped and tracked from Glasgow depot.
                </p>
              </div>
            </div>
            
            <div className="unity-card bg-white border border-slate-100 flex gap-4 p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                <Truck className="h-6 w-6 text-blue-700" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-sm">24H Trade Dispatch</p>
                <p className="unity-meta mt-1">
                  Order by 2:00 PM for next-working-day dispatch. Fully tracked courier service direct to your storefront.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-[10px] text-slate-400 py-3">
          Unity Cash &amp; Carry · Trade wholesale · Glasgow
        </p>
      </main>
    </div>
  )
}
