"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { createPortal } from "react-dom"
import Image from "next/image"
import {
  Tag,
  Gift,
  Truck,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  Plus,
  X,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

const PROMO_BANNERS = [
  { src: "/banners/ivg-smart-max-10mg.png", alt: "IVG Smart Max 10mg, out now", width: 8334, height: 2084 },
  { src: "/banners/xciting-8-new-flavours.png", alt: "Xciting, 8 new flavours out now", width: 1800, height: 480 },
]

/** Small revolving banner strip — no bigger than the balance card it replaces up top.
 *  Tapping a banner pops it up full-size rather than linking anywhere (no destination
 *  pages exist for these yet). */
function PromoBannerStrip() {
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState<(typeof PROMO_BANNERS)[number] | null>(null)

  useEffect(() => {
    if (PROMO_BANNERS.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % PROMO_BANNERS.length), 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 shadow-md aspect-[4/1]">
        {PROMO_BANNERS.map((banner, i) => (
          <button
            key={banner.src}
            type="button"
            onClick={() => setExpanded(banner)}
            aria-label={`${banner.alt}. Tap to view`}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          >
            <Image src={banner.src} alt={banner.alt} fill sizes="480px" className="object-contain" priority={i === 0} />
          </button>
        ))}
        {PROMO_BANNERS.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {PROMO_BANNERS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
            onClick={() => setExpanded(null)}
          >
            <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <Image
                src={expanded.src}
                alt={expanded.alt}
                width={expanded.width}
                height={expanded.height}
                className="h-auto w-full rounded-2xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg"
              >
                <X className="h-4 w-4 text-slate-700" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

interface PromoCode {
  id: string
  code: string
  description: string
  discountType: string
  value: number
  minOrderValue: number
}

export function OffersView() {
  const { data: session } = useSession()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [promosLoading, setPromosLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Wallet State
  const [balance, setBalance] = useState<number>(0)
  const [walletLoading, setWalletLoading] = useState(true)
  const [walletRefreshing, setWalletRefreshing] = useState(false)

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminAmount, setAdminAmount] = useState("")
  const [adminType, setAdminType] = useState("deposit")
  const [adminDesc, setAdminDesc] = useState("")
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  const isAdmin = (session?.user as any)?.role === "admin"

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
      setPromosLoading(false)
    }
  }

  const fetchWalletData = async (showToast = false) => {
    try {
      const res = await fetch("/api/wallet")
      if (!res.ok) throw new Error("Failed to load wallet data")
      const data = await res.json()
      setBalance(data.balance)
      if (showToast) {
        toast.success("Wallet ledger synchronized")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Could not fetch real-time wallet details")
    } finally {
      setWalletLoading(false)
      setWalletRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPromos()
    fetchWalletData()
  }, [])

  const handleRefreshWallet = () => {
    setWalletRefreshing(true)
    fetchWalletData(true)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied code "${code}" to clipboard!`)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
  }

  const handleAdminAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminEmail || !adminAmount || !adminDesc) {
      toast.error("All adjustment fields are required")
      return
    }

    const amt = parseFloat(adminAmount)
    if (isNaN(amt) || amt === 0) {
      toast.error("Adjustment amount must be a non-zero number")
      return
    }

    setAdminSubmitting(true)
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          amount: amt,
          type: adminType,
          description: adminDesc.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to make balance adjustment")
      }

      toast.success(`Successfully adjusted balance for ${data.user.email}`)
      setAdminEmail("")
      setAdminAmount("")
      setAdminDesc("")
      fetchWalletData()
    } catch (err: any) {
      toast.error(err.message || "An error occurred during adjustment")
    } finally {
      setAdminSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader
        title="Rewards & Wallet"
        subtitle="Exclusive vouchers and your trade credits balance"
      />
      <main className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* Promo banner strip — replaces the old always-on balance card up top */}
        <PromoBannerStrip />

        {/* Dynamic Vouchers List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Active Trade Promo Vouchers
            </h3>
            <button 
              onClick={() => { setPromosLoading(true); fetchPromos(); }}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Refresh Offers
            </button>
          </div>

          {promosLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-white animate-pulse rounded-2xl border border-slate-100"></div>
              ))}
            </div>
          ) : promos.length === 0 ? (
            <div className="unity-card border border-dashed border-slate-200 bg-white py-8 px-4 text-center">
              <Tag className="h-7 w-7 text-slate-400 mx-auto mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">No promo codes active</p>
              <p className="text-xs text-slate-400 mt-1">Check back later for seasonal trade offers.</p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {promos.map((promo) => {
                const copied = copiedCode === promo.code
                return (
                  <div
                    key={promo.id}
                    className="flex overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5 p-5 text-left">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black leading-none text-blue-700">
                          {promo.discountType === "percentage" ? `${promo.value}%` : `£${promo.value}`}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">off</span>
                      </div>
                      <p className="font-bold text-slate-700 text-[13px] leading-snug">{promo.description}</p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {promo.minOrderValue > 0
                          ? `Min. order £${promo.minOrderValue.toFixed(2)}`
                          : "No minimum order"}
                      </p>
                    </div>

                    {/* Ticket perforation — punch-hole notches read as a torn stub */}
                    <div className="relative w-0 shrink-0">
                      <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-slate-50" />
                      <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-slate-50" />
                      <div className="h-full border-l-2 border-dashed border-blue-200" />
                    </div>

                    <button
                      onClick={() => copyToClipboard(promo.code)}
                      className={`flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 px-2 py-4 text-center transition-all active:scale-95 ${
                        copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <span className="font-mono text-[12px] font-black tracking-wider break-all">{promo.code}</span>
                      {copied ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                          <Check className="h-3.5 w-3.5" /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Wallet Balance Card — slim strip */}
        <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 px-5 py-3.5 text-white shadow-lg shadow-blue-900/15">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 shrink-0 text-blue-300" />
            <div>
              <span className="block text-[9.5px] font-black uppercase tracking-widest text-blue-200">
                Available Credits
              </span>
              {walletLoading ? (
                <div className="mt-1 h-5 w-20 animate-pulse rounded bg-white/15" />
              ) : (
                <p className="text-xl font-black leading-tight tracking-tight">£{balance.toFixed(2)}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleRefreshWallet}
            disabled={walletRefreshing}
            className="shrink-0 rounded-xl bg-white/5 p-2 text-blue-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${walletRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Admin Credit Adjustments (Only visible to admin) */}
        {isAdmin && (
          <section className="unity-card bg-slate-900 border border-slate-800 p-5 text-white rounded-3xl space-y-4 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Plus className="h-5 w-5 text-blue-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-blue-400">
                Admin Adjustments Panel
              </h3>
            </div>
            
            <form onSubmit={handleAdminAdjustment} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Customer Email</label>
                  <input
                    type="email"
                    placeholder="trader@example.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Adjustment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50.00 or -25.00"
                    value={adminAmount}
                    onChange={(e) => setAdminAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Transaction Type</label>
                  <select
                    value={adminType}
                    onChange={(e) => setAdminType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="deposit">Deposit (Top Up)</option>
                    <option value="promo_reward">Promo Reward</option>
                    <option value="admin_adjustment">Admin Adjustment</option>
                    <option value="order_deduction">Order Deduction</option>
                  </select>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description / Note</label>
                  <input
                    type="text"
                    placeholder="Initial bonus, deposit, etc."
                    value={adminDesc}
                    onChange={(e) => setAdminDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adminSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-99 shadow-lg shadow-blue-600/15"
              >
                {adminSubmitting ? "Executing Adjustment..." : "Apply Balance Adjustment"}
              </button>
            </form>
          </section>
        )}

        {/* Depot Perks (Generic perks) */}
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
