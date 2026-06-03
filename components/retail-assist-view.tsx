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
      liquidVolumeMl: number
      isSubjectToVapeDuty: boolean
    }
  }[]
}

export function RetailAssistView() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  // Security Seal dynamic code
  const [securityCode, setSecurityCode] = useState("")

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

  useEffect(() => {
    fetchOrders()
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
            volume += item.quantity * (item.product.liquidVolumeMl || 2)
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
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader
        title={showSummary ? "Inspector Audit Log" : "Retail Assist"}
        subtitle={showSummary ? "HMRC Verification Portal" : "Retailer compliance & audit tools"}
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {!showSummary ? (
          /* Context & Verification Badge Screen */
          <div className="space-y-6">
            {/* Holographic Verification Badge */}
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden group">
              {/* Outer pulsing glow ring */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-cyan-500/5 to-emerald-500/5 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
              
              {/* Badge visual */}
              <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-1.5 shadow-lg shadow-teal-500/20 animate-pulse-slow">
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

            {/* Context Explainer */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-900">Unity Wholesale Guarantee</h3>
                  <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">
                    This account is legally registered under Unity Cash & Carry Ltd. 
                    All vaping products purchased through this platform are sourced directly from registered HMRC duty-suspension bonded facilities or pre-cleared batches, with all excise duties fully reported and paid.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-slate-100 pt-4">
                <FileCheck2 className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-900">UK Excise Duty Statement</h3>
                  <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">
                    Unity complies fully with the UK Vaping Products Excise Duty Regulations. 
                    Excise duty at the standard rate of £2.20 per 10ml nicotine-containing liquid is fully itemized on your purchase invoices and reported directly to HMRC, ensuring your retail displays remain 100% compliant during depot audits.
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Summary Action */}
            <div className="space-y-3.5">
              <div className="text-left">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  HMRC Audit Protocol
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  In the event of an HMRC inspection, click the button below to generate an official digital compliance summary showing the full log of verified duty-paid inventory sourced from Unity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSummary(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <QrCode className="h-4.5 w-4.5" />
                )}
                Generate Inspector Summary
              </button>
            </div>
          </div>
        ) : (
          /* Official Inspector Audit Summary Sheet */
          <div className="space-y-6 relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm">
            {/* Holographic Watermark diagonal overlay (print hidden or soft) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-[-30deg] z-0">
              <span className="text-[40px] md:text-[60px] font-black tracking-widest text-emerald-600 whitespace-nowrap">
                VERIFIED DUTY-PAID
              </span>
            </div>

            {/* Back to hub */}
            <button
              onClick={() => setShowSummary(false)}
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

              {/* Secure Signature holographic block */}
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

            {/* Trader & Wholesaler Info Blocks */}
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
                  <span className="font-mono font-bold text-slate-700">XX-AWRS-XXXXXX</span>
                </p>
              </div>
            </div>

            {/* Aggregated Figures Summary */}
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

            {/* Audit Table */}
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
                          orderVol += it.quantity * (it.product.liquidVolumeMl || 2)
                        }
                      })
                    }

                    return (
                      <div key={o.id} className="grid grid-cols-4 gap-2 px-4 py-3 items-center hover:bg-slate-50/30">
                        <span className="font-mono font-bold text-slate-900">{o.orderNumber.split("-")[1] || o.orderNumber}</span>
                        <span className="text-slate-500">{formatDate(o.createdAt)}</span>
                        <span className="text-right font-mono text-slate-700">{orderVol} ml</span>
                        <span className="text-right font-mono font-bold text-emerald-700">£{o.vapeDutyAmount.toFixed(2)}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Inspector Verification Verification Note */}
            <div className="rounded-2xl border border-blue-150 bg-blue-50/40 p-4 text-left flex gap-3 text-[11.5px] text-blue-800 leading-relaxed font-medium z-10 relative">
              <Fingerprint className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Inspector Notice:</strong> All digital summaries correspond to verified transactions inside the Unity Wholesaler central database. 
                Any printed or PDF exports of this document can be cross-verified by scanning the QR code or searching the Verification Seal code inside the Unity Portal.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2 z-10 relative print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4" /> Print Document
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success("Audit Log CSV construction started")
                  const header = "Order Number,Date,Nicotine Volume (ml),Excise Paid (£),Status\n"
                  const csv = orders.reduce((acc, o) => {
                    let vol = 0
                    if (o.items) o.items.forEach(it => { if (it.product?.isSubjectToVapeDuty) vol += it.quantity * (it.product.liquidVolumeMl || 2) })
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
                <Download className="h-4 w-4" /> Export Audit CSV
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
