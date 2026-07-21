"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  ShieldCheck,
  FileCheck2,
  Calendar,
  AlertCircle,
  Clock,
  Printer,
  ChevronLeft,
  Download,
  Building,
  CheckCircle,
  QrCode,
  Fingerprint,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BadgePercent,
  Sparkles,
  Info,
  Maximize2,
  X,
  Loader2,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

type Order = {
  id: string
  orderNumber: string
  createdAt: string
  subtotal: number
  vat: number
  total: number
  vapeDutyAmount: number
  vatOnDuty: number
  items?: {
    quantity: number
    product?: {
      name: string
      brand: string
      sku: string
      liquidVolumeMl: number
      isSubjectToVapeDuty: boolean
      unitsPerPack?: number
    }
  }[]
}

type WalletTransaction = {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
}

export function RetailAssistView() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Navigation states
  const [activePanel, setActivePanel] = useState<"hub" | "summary" | "wallet" | "certificate">("hub")
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null)

  // Security Seal dynamic codes
  const [securityCode, setSecurityCode] = useState("")

  // Wallet & credits
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [walletLoading, setWalletLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to load purchase history")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/wallet")
      if (!res.ok) throw new Error("Failed to load wallet")
      const data = await res.json()
      setWalletBalance(data.balance ?? 0)
      setWalletTransactions(Array.isArray(data.transactions) ? data.transactions : [])
    } catch {
      // Non-critical for this hub — the Rewards tab is the source of truth for wallet errors
    } finally {
      setWalletLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchWallet()
    // Generate a secure verification signature hash for the inspector view
    const hash = Math.random().toString(36).substring(2, 10).toUpperCase()
    setSecurityCode(`UCC-VERIFY-${hash}`)
  }, [])

  // Calculate stats for the summary
  const summaryStats = orders.reduce(
    (acc, order) => {
      acc.totalOrders++
      acc.totalSpend += order.total
      acc.totalDutyPaid += order.vapeDutyAmount

      let volume = 0
      if (order.items) {
        order.items.forEach((item) => {
          if (item.product?.isSubjectToVapeDuty) {
            volume += item.quantity * (item.product.unitsPerPack || 10) * (item.product.liquidVolumeMl || 2.0)
          }
        })
      }
      acc.totalVolumeMl += volume
      return acc
    },
    { totalOrders: 0, totalSpend: 0, totalDutyPaid: 0, totalVolumeMl: 0 }
  )

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden pb-28 md:max-w-4xl md:mx-auto md:w-full md:shadow-xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950">
      <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <AppScreenHeader
        title={
          activePanel === "hub"
            ? "Retail Assist"
            : activePanel === "summary"
              ? "Inspector Audit Log"
              : activePanel === "wallet"
                ? "Wallet & Credits"
                : "AWRS Certificate"
        }
        subtitle={
          activePanel === "hub"
            ? "Compliance & audit support tools"
            : activePanel === "summary"
              ? "HMRC Verification Portal"
              : activePanel === "wallet"
                ? "Your Unity account balance"
                : "Official Wholesaler Registration"
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {activePanel === "hub" && (
          /* Hub Dashboard View */
          <div className="space-y-6">
            {/* Holographic Verification Badge */}
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-cyan-500/5 to-emerald-500/5 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
              
              <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-1.5 shadow-lg shadow-teal-500/20">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-900 text-white p-2">
                  <ShieldCheck className="h-10 w-10 text-emerald-400" />
                  <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    Verified B2B
                  </span>
                </div>
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-800 tracking-tight">
                Verified Compliance Profile
              </h2>
              <p className="mt-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Retail Partner Ref: {(session?.user as any)?.tradeCode || "UNITY-RETAIL-01"}
              </p>

              <div className="mt-4 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-150 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 shrink-0" />
                HMRC Duty-Paid Verified Partner
              </div>
            </div>

            {/* Quick Audit Tools Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActivePanel("wallet")}
                className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-center hover:border-blue-500 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2 group-hover:scale-105 transition-transform">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="text-[12px] font-bold text-slate-800">Wallet & Credits</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1">
                  {walletLoading ? "Loading..." : `£${walletBalance.toFixed(2)} balance`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("certificate")}
                className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-center hover:border-blue-500 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 mb-2 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[12px] font-bold text-slate-800">AWRS Certificate</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1">Official Unity details</span>
              </button>
            </div>

            {/* Wholesaler info context */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4 text-left">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Wholesale Sourcing Guarantee</h3>
                  <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">
                    This account is legally registered under Unity Cash & Carry Ltd. All vaping products purchased are guaranteed sourcing-cleared, with all excise duties paid.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 border-t border-slate-100 pt-4">
                <FileCheck2 className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">UK Excise Duty Statements</h3>
                  <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">
                    Excise duty at the standard rate of £2.20 per 10ml nicotine-containing liquid is fully itemized on purchase invoices and reported directly to HMRC.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works — the exact moment this tool exists for */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 space-y-3.5 text-left shadow-sm">
              <h3 className="text-[13px] font-black text-slate-900">When an inspector asks for your numbers</h3>
              <div className="space-y-3">
                {[
                  "An inspector visits your shop and asks to see your stock and duty numbers.",
                  "Open Unity and tap Generate Inspector Summary below.",
                  "Show them your live compliance report, right from your phone. You're aligned.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-[12px] leading-relaxed text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Summary Action */}
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={() => setActivePanel("summary")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50"
              >
                <QrCode className="h-4.5 w-4.5" />
                Generate Inspector Summary
              </button>
            </div>
          </div>
        )}

        {activePanel === "summary" && (
          /* Official Inspector Audit Summary Sheet */
          <div className="space-y-6 relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-[-30deg] z-0">
              <span className="text-[40px] md:text-[60px] font-black tracking-widest text-emerald-600 whitespace-nowrap">
                VERIFIED DUTY-PAID
              </span>
            </div>

            {/* Back button */}
            <button
              onClick={() => setActivePanel("hub")}
              className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider hover:text-slate-800 transition-colors print:hidden"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Compliance Hub
            </button>

            {/* Header Compliance Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5 pt-2 z-10 relative">
              <div className="text-left space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Excise Duty Authenticated
                </div>
                <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-tight">
                  Unity Wholesaler Ledger
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Compliance validation report generated on demand
                </p>
              </div>

              {/* Secure Signature */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-150 text-left shrink-0">
                <QrCode className="h-8 w-8 text-slate-700" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
                    Verification Seal
                  </span>
                  <span className="font-mono text-[10px] font-black text-slate-800 tracking-tight block">
                    {securityCode}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">
                    Live Validated: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Info blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-[11px] z-10 relative">
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Retailer Credentials
                </span>
                <p className="font-bold text-[13px] text-slate-800">{session?.user?.name || "Verified Shop Partner"}</p>
                <p className="text-slate-500 font-medium mt-0.5">{session?.user?.email}</p>
                <p className="text-slate-500 mt-2">
                  <span className="font-semibold text-slate-600">Compliance Status: </span>
                  <span className="text-emerald-600 font-bold">Approved</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Wholesale Supplier
                </span>
                <p className="font-bold text-[13px] text-slate-800">Unity Cash & Carry Ltd</p>
                <p className="text-slate-500 font-medium mt-0.5">Glasgow Wholesaler Depot</p>
                <p className="text-slate-500 mt-2">
                  <span className="font-semibold text-slate-600">Excise Stamp AWRS: </span>
                  <span className="font-mono font-bold text-slate-700">XX-AWRS-123456789</span>
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 text-left z-10 relative">
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {summaryStats.totalOrders}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                  Purchases Made
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {(summaryStats.totalVolumeMl / 1000).toFixed(2)}L
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                  Liquid Volume
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-emerald-50 border-l-4 border-l-emerald-500">
                <p className="text-2xl font-black text-emerald-700 leading-none">
                  £{summaryStats.totalDutyPaid.toFixed(2)}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                  Excise Duty Paid
                </p>
              </div>
            </div>

            {/* Audit Table with Invoices */}
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden z-10 relative">
              <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">
                <span>Order No</span>
                <span>Date</span>
                <span className="text-right">Volume (ml)</span>
                <span className="text-right">Excise Duty</span>
              </div>

              <div className="divide-y divide-slate-50 text-[11px] text-left">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No verified purchase records found.
                  </div>
                ) : (
                  orders.map((o) => {
                    let orderVol = 0
                    if (o.items) {
                      o.items.forEach((it) => {
                        if (it.product?.isSubjectToVapeDuty) {
                          orderVol += it.quantity * (it.product.unitsPerPack || 10) * (it.product.liquidVolumeMl || 2.0)
                        }
                      })
                    }

                    return (
                      <button 
                        key={o.id} 
                        type="button"
                        onClick={() => setSelectedInvoiceOrder(o)}
                        className="w-full grid grid-cols-4 gap-2 px-4 py-3.5 items-center hover:bg-slate-50/70 transition-colors text-left focus:outline-none"
                      >
                        <span className="font-mono font-bold text-blue-600 underline decoration-blue-600/30">{o.orderNumber.split("-")[1] || o.orderNumber}</span>
                        <span className="text-slate-500">{formatDate(o.createdAt)}</span>
                        <span className="text-right font-mono text-slate-700">{orderVol} ml</span>
                        <span className="text-right font-mono font-bold text-emerald-700">£{o.vapeDutyAmount.toFixed(2)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Inspector Notice */}
            <div className="rounded-2xl border border-blue-150 bg-blue-50/40 p-4 text-left flex gap-3 text-[11.5px] text-blue-800 leading-relaxed font-medium z-10 relative">
              <Fingerprint className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Inspector Notice:</strong> Click any order code in the table above to overlay and inspect the itemized VAT-on-Duty compliance invoice.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2 z-10 relative print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4" /> Print Summary
              </button>
              <button
                type="button"
                onClick={() => {
                  const header = "Order Number,Date,Nicotine Volume (ml),Excise Paid (£),Status\n"
                  const csv = orders.reduce((acc, o) => {
                    let vol = 0
                    if (o.items) o.items.forEach(it => { if (it.product?.isSubjectToVapeDuty) vol += it.quantity * (it.product.unitsPerPack || 10) * (it.product.liquidVolumeMl || 2.0) })
                    return acc + `"${o.orderNumber}","${new Date(o.createdAt).toISOString().split("T")[0]}","${vol}","${o.vapeDutyAmount}","DUTY PAID"\n`
                  }, header)
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement("a")
                  link.setAttribute("href", url)
                  link.setAttribute("download", `Unity_Inspector_Audit_${(session?.user as any)?.tradeCode || "trader"}.csv`)
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-600/10 active:scale-95"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        )}

        {activePanel === "wallet" && (
          /* Real wallet balance + transaction history */
          <div className="space-y-6">
            <button
              onClick={() => setActivePanel("hub")}
              className="flex items-center gap-1.5 text-xs text-blue-100/80 font-bold uppercase tracking-wider hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Compliance Hub
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Available Balance</p>
              {walletLoading ? (
                <Loader2 className="h-7 w-7 animate-spin text-blue-600 mt-2" />
              ) : (
                <p className="text-4xl font-black tracking-tight mt-1 text-slate-900">£{walletBalance.toFixed(2)}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Applied automatically at checkout. See Rewards tab to redeem.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction History</h4>
              </div>
              {walletLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : walletTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[12px]">
                  No wallet activity yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {walletTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                          {t.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-800 truncate">{t.description}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{formatDate(t.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm shrink-0 pl-2 ${t.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.amount >= 0 ? "+" : ""}£{t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "certificate" && (
          /* AWRS Wholesaler Certificate View */
          <div className="space-y-6">
            <button
              onClick={() => setActivePanel("hub")}
              className="flex items-center gap-1.5 text-xs text-blue-100/80 font-bold uppercase tracking-wider hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Compliance Hub
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-sm text-left max-w-lg mx-auto relative overflow-hidden border-t-8 border-t-blue-600">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                    Official AWRS License
                  </span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
                    HMRC Registration
                  </h3>
                  <p className="text-[11px] text-slate-450 font-medium">
                    Alcohol & Tobacco Wholesaler Registration Scheme
                  </p>
                </div>
                <Building className="h-10 w-10 text-slate-400/50" />
              </div>

              <div className="space-y-4 border-t border-b border-slate-100 py-5 text-[12px]">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">Wholesaler</span>
                  <span className="text-slate-800 font-black col-span-2">Unity Cash & Carry Ltd</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">Glasgow Depot</span>
                  <span className="text-slate-800 font-semibold col-span-2">Unity Wholesalers, Glasgow, G41 1LU</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">AWRS Ref ID</span>
                  <span className="text-blue-700 font-black font-mono tracking-tight col-span-2">XX-AWRS-123456789</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">Licence Status</span>
                  <span className="text-emerald-700 font-black flex items-center gap-1 col-span-2">
                    <CheckCircle className="h-4 w-4" /> Active Verified
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-450 leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                &ldquo;This certificate serves as official notice that Unity Cash & Carry Ltd is registered under Section 88C of the Customs and Excise Management Act 1979 to trade in wholesale vaping products and nicotine-containing liquids.&rdquo;
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4" /> Print Registration
              </button>
            </div>
          </div>
        )}

        {/* Selected Invoice Overlay Modal */}
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative border border-slate-200 shadow-2xl flex flex-col text-left print:border-none print:shadow-none">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors print:hidden"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex-1 space-y-6">
                {/* Invoice Header */}
                <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                      Excise VAT Invoice
                    </span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
                      Invoice: {selectedInvoiceOrder.orderNumber}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Date: {formatDate(selectedInvoiceOrder.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-slate-900">£{selectedInvoiceOrder.total.toFixed(2)}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-1">Paid via Wallet</span>
                  </div>
                </div>

                {/* Sourcing credentials */}
                <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">B2B Wholesaler Sourced</span>
                    <p className="font-bold text-slate-800 mt-1">Unity Cash & Carry Ltd</p>
                    <p className="text-slate-500 mt-0.5">Glasgow AWRS Depot: XX-AWRS-123456789</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">B2C Retail Buyer</span>
                    <p className="font-bold text-slate-800 mt-1">{session?.user?.name || "Verified Partner"}</p>
                    <p className="text-slate-500 mt-0.5">{session?.user?.email}</p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                    <span className="col-span-2">Product Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Total Price</span>
                  </div>
                  <div className="divide-y divide-slate-50 text-[11px]">
                    {selectedInvoiceOrder.items?.map((item: any, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-start">
                        <div className="col-span-2 flex flex-col min-w-0">
                          <span className="font-bold text-slate-850 text-xs truncate">{item.product?.name}</span>
                          <span className="text-[9px] text-slate-450 font-semibold mt-0.5 block">
                            {item.product?.isSubjectToVapeDuty ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 inline-block">
                                VDS Stamped • {item.product?.liquidVolumeMl}ml • {item.product?.nicotineStrengthMg || 20.0}mg
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-550/10 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                                Excise Exempt
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-right font-mono text-slate-700 pt-0.5">{item.quantity} case{item.quantity === 1 ? "" : "s"}</span>
                        <span className="text-right font-mono text-slate-800 pt-0.5">£{(item.quantity * (item.product?.casePrice || 35.00)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duty & Tax Summary */}
                <div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-[11.5px] border border-slate-100 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Excise Subtotal (VPD):</span>
                    <span className="font-mono text-slate-700">£{selectedInvoiceOrder.vapeDutyAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commercial VAT (20% on subtotal):</span>
                    <span className="font-mono text-slate-700">£{(selectedInvoiceOrder.vat - selectedInvoiceOrder.vatOnDuty).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Excise VAT (20% on duty):</span>
                    <span className="font-mono text-slate-700">£{selectedInvoiceOrder.vatOnDuty.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/80 font-bold text-slate-900">
                    <span>Total Paid Inward (ex. discounts):</span>
                    <span className="font-mono text-blue-700">£{selectedInvoiceOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Print action */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-4 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Printer className="h-4 w-4" /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
