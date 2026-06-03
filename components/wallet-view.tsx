"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Wallet, Info, ArrowUpRight, ArrowDownRight, Plus, RefreshCw } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
}

export function WalletView() {
  const { data: session } = useSession()
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminAmount, setAdminAmount] = useState("")
  const [adminType, setAdminType] = useState("deposit")
  const [adminDesc, setAdminDesc] = useState("")
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  const isAdmin = (session?.user as any)?.role === "admin"

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
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWalletData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWalletData(true)
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
      <AppScreenHeader title="Wallet" subtitle="Your account credits balance" />
      
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Balance Card */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-6 text-white shadow-xl shadow-blue-900/15 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Wallet className="h-5 w-5 text-blue-300" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">
                Available Credits
              </span>
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-blue-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {loading ? (
            <div className="h-10 w-32 bg-white/15 animate-pulse rounded-lg"></div>
          ) : (
            <p className="text-5xl font-black tracking-tight Outfit">£{balance.toFixed(2)}</p>
          )}
          
          <p className="mt-3.5 text-xs leading-relaxed text-blue-100/80">
            Available credits can be toggled at checkout to reduce your order totals. Contact your account manager for adjustments.
          </p>
        </div>

        {/* Dynamic Ledger / Transaction History */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Transaction Ledger
          </h3>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-white animate-pulse rounded-2xl border border-slate-100"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="unity-card flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 bg-white">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-450 mb-3">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Your credit transactions and rewards ledger will be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => {
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
                        <span className="text-[10px] text-slate-400 font-semibold block mt-1">
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

        {/* Admin Section */}
        {isAdmin && (
          <section className="unity-card bg-slate-900 border border-slate-800 p-5 text-white rounded-3xl space-y-4 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Plus className="h-5 w-5 text-blue-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-blue-400">
                Admin Adjustment Panel
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-650"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-650"
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
                    placeholder="Initial sign-up bonus, Deposit top-up, etc."
                    value={adminDesc}
                    onChange={(e) => setAdminDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-650"
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

        {/* Info card */}
        <div className="unity-card bg-white border border-slate-100 flex gap-3.5 p-4 shadow-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-[13px] leading-relaxed text-slate-600 text-left">
            <p className="font-semibold text-slate-900">About account credits</p>
            <p className="mt-1 text-slate-500">
              Credits are issued via live promotions (such as sign-up bonuses, volume incentives, or returns credit). Balance adjustments apply in real time and are reflected immediately on invoices.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
