"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Tag,
  Gift,
  Truck,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Info,
} from "lucide-react"
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

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
}

export function OffersView() {
  const { data: session } = useSession()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [promosLoading, setPromosLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Wallet State
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
      setTransactions(data.transactions)
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
        {/* Wallet Balance Card (Mixed at the top) */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-6 text-white shadow-xl shadow-blue-900/15 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Wallet className="h-5 w-5 text-blue-300" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">
                Available Credits Balance
              </span>
            </div>
            
            <button 
              onClick={handleRefreshWallet}
              disabled={walletRefreshing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-blue-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${walletRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {walletLoading ? (
            <div className="h-10 w-32 bg-white/15 animate-pulse rounded-lg"></div>
          ) : (
            <p className="text-4xl font-black tracking-tight Outfit">£{balance.toFixed(2)}</p>
          )}
          
          <p className="mt-3 text-xs leading-relaxed text-blue-100/80">
            Available credits can be applied directly at checkout to reduce order totals. Apply voucher promo codes below to earn more rewards.
          </p>
        </div>

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
              <Tag className="h-7 w-7 text-slate-350 mx-auto mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">No promo codes active</p>
              <p className="text-xs text-slate-400 mt-1">Check back later for seasonal trade offers.</p>
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

        {/* Wallet Transactions Timeline */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Credits Transaction History
          </h3>
          
          {walletLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-white animate-pulse rounded-2xl border border-slate-100"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="unity-card flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 bg-white">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="font-semibold text-slate-850 text-sm">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Your credit transactions and rewards ledger will be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.slice(0, 10).map((tx) => {
                const isDeposit = tx.amount > 0
                return (
                  <div 
                    key={tx.id} 
                    className="unity-card bg-white border border-slate-100 hover:border-slate-200/85 transition-colors p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isDeposit ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {isDeposit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 text-[13px] leading-tight">{tx.description}</p>
                        <span className="text-[10px] text-slate-450 font-semibold block mt-1">
                          {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black text-sm ${
                        isDeposit ? "text-emerald-600" : "text-slate-700"
                      }`}>
                        {isDeposit ? "+" : "-"}£{Math.abs(tx.amount).toFixed(2)}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-1">
                        {tx.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

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
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Transaction Type</label>
                  <select
                    value={adminType}
                    onChange={(e) => setAdminType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
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
