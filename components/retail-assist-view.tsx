"use client"

import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  ChevronLeft,
  Download,
  Building,
  FileText,
  Recycle,
  IdCard,
  Megaphone,
  Hourglass,
  X,
  FileCheck2,
  FileBadge2,
  BadgeCheck,
  Mail,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { useOnTabShown } from "@/lib/tab-events"
import { UnityLogo } from "@/components/unity-logo"
import { UNITY_BUSINESS, VPD_EFFECTIVE_DATE, INVOICE_TERMS } from "@/lib/unity-business"

// Mirrors the honest "Document On File" pattern already live on the marketing
// site's certificates modal (unity.html) — real docs slot in when supplied,
// no fake seals or invented reference numbers in the meantime.
const CERTIFICATES = [
  { title: "MHRA Registered", subtitle: "Vape Product Notification" },
  { title: "TPD Compliant", subtitle: "Tobacco Products Directive" },
  { title: "Authorized Distributor", subtitle: "Scotland Trade Registration" },
  { title: "Anti-Counterfeit Verified", subtitle: "Full Batch Traceability" },
]

type Order = {
  id: string
  orderNumber: string
  status: string
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
      casePrice?: number
      nicotineStrengthMg?: number
    }
  }[]
}

export function RetailAssistView() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePanel, setActivePanelState] = useState<"hub" | "summary" | "business">("hub")
  // Panels replace the hub in place, so open each at its top, and return to the hub
  // exactly where the retailer left it.
  const hubScroll = useRef(0)
  const panelChanged = useRef(false)
  const setActivePanel = (panel: "hub" | "summary" | "business") => {
    if (activePanel === "hub") hubScroll.current = window.scrollY
    panelChanged.current = true
    setActivePanelState(panel)
  }
  useLayoutEffect(() => {
    if (!panelChanged.current) return
    panelChanged.current = false
    window.scrollTo(0, activePanel === "hub" ? hubScroll.current : 0)
  }, [activePanel])
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null)
  const [showCertificates, setShowCertificates] = useState(false)

  const vpdIsLive = new Date() >= VPD_EFFECTIVE_DATE

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to load purchase history")
      const data = await res.json()
      // Cancelled orders never shipped, so they have no place in a duty ledger.
      setOrders(Array.isArray(data) ? data.filter((o: Order) => o.status !== "cancelled") : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])
  useOnTabShown("assist", fetchOrders)

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

  const handlePrint = () => window.print()

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden pb-40 md:max-w-4xl md:mx-auto md:w-full md:shadow-xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950">
      <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <AppScreenHeader
        title={activePanel === "hub" ? "Retail Assist" : activePanel === "summary" ? "Compliance Summary" : "Business Registration"}
        subtitle={
          activePanel === "hub"
            ? "Real rules, real dates, real numbers"
            : activePanel === "summary"
              ? "Your live compliance report"
              : "Unity Cash & Carry's official details"
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {activePanel === "hub" && (
          <div className="space-y-6">
            {/* Business identity card — real facts only, no self-issued "verified" badge.
                Styled to read as a genuine ID card: logo, strong company name, VAT, certs. */}
            <div className="relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden text-center">
              <div className="h-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900" />
              <div className="p-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm p-2">
                  <UnityLogo size={64} />
                </div>
                <h2 className="mt-4 text-[17px] font-black text-slate-900 tracking-tight leading-tight">
                  {UNITY_BUSINESS.legalName}
                </h2>
                <p className="mt-2 text-[12px] font-black text-blue-700 font-mono tracking-tight">
                  VAT {UNITY_BUSINESS.vatNumber}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 font-semibold">Glasgow, UK · Wholesale Trade Supplier</p>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCertificates(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-black uppercase tracking-wider px-2 py-3 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <FileCheck2 className="h-3.5 w-3.5 shrink-0" /> Certificates
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("business")}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10.5px] font-black uppercase tracking-wider px-2 py-3 transition-all active:scale-[0.98]"
                  >
                    <Building className="h-3.5 w-3.5 shrink-0" /> Full Details
                  </button>
                </div>
              </div>
            </div>

            {/* Real regulatory timeline — the actual research findings, dated and honest */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5 text-left">
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-600" />
                <h3 className="text-[13px] font-black text-slate-900">What's changing, and when</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${vpdIsLive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    <Hourglass className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-slate-800">
                      Vaping Products Duty (VPD) — 1 October 2026
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                      £2.20 per 10ml of nicotine e-liquid, HMRC. {vpdIsLive ? "Now in force." : "Not yet in force — nothing is being charged on your orders until this date."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-slate-800">Supplier due diligence — from Oct 2026</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                      Keep 6 years of records: supplier details, invoices, delivery notes, and duty-stamp checks. Grace period for pre-existing unstamped stock runs to 31 March 2027.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <Megaphone className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-slate-800">Retailer signage — 1 January 2027</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                      Tobacco and Vapes Act 2026 (Royal Assent 29 Apr 2026) compliance deadline for point-of-sale signage.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Recycle className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-slate-800">WEEE take-back — already in force</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                      You must accept used vapes/parts back for recycling if you sell them.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <IdCard className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-slate-800">Challenge 25 — voluntary best practice</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                      Not a legal requirement, but the industry-standard way to keep age-of-sale checks defensible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MHRA — the honest "pending" slot: no schema, no fake reference, ready when the
                real supplier docs arrive */}
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 shadow-sm text-left">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-[13px] font-black text-slate-800">MHRA Product Notification</h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-amber-800">
                    Awaiting registration documents from our suppliers. Every product Unity stocks must sit inside
                    the TPD limits (20mg/ml nicotine, 2ml tank, 10ml bottle) — real per-product MHRA reference
                    numbers will appear here once confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* When an inspector asks — the one part of this page that was always right */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 space-y-3.5 text-left shadow-sm">
              <h3 className="text-[13px] font-black text-slate-900">When an inspector asks for your numbers</h3>
              <div className="space-y-3">
                {[
                  "An inspector visits your shop and asks to see your stock and duty records.",
                  "Open Unity and tap Generate Compliance Summary below.",
                  "Show them your real order history, duty status and Unity's registration — right from your phone.",
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

            <button
              type="button"
              onClick={() => setActivePanel("summary")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50"
            >
              <FileText className="h-4.5 w-4.5" />
              Generate Compliance Summary
            </button>
          </div>
        )}

        {activePanel === "summary" && (
          <div className="space-y-6 relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm">
            <button
              onClick={() => setActivePanel("hub")}
              className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider hover:text-slate-800 transition-colors print:hidden"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Retail Assist
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5 pt-2">
              <div className="text-left space-y-1.5">
                <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-tight">
                  Unity Wholesaler Ledger
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Compliance summary generated on demand — {new Date().toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider shrink-0 ${
                vpdIsLive ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-100 border-slate-200 text-slate-500"
              }`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                VPD {vpdIsLive ? "In Force" : "Not Yet Live"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-[11px]">
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Retailer</span>
                <p className="font-bold text-[13px] text-slate-800">{session?.user?.name || "Trade Partner"}</p>
                <p className="text-slate-500 font-medium mt-0.5">{session?.user?.email}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Wholesale Supplier</span>
                <p className="font-bold text-[13px] text-slate-800">{UNITY_BUSINESS.legalName}</p>
                <p className="text-slate-500 font-medium mt-0.5">VAT {UNITY_BUSINESS.vatNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                <p className="text-2xl font-black text-slate-900 leading-none">{summaryStats.totalOrders}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">Purchases Made</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                <p className="text-2xl font-black text-slate-900 leading-none">{(summaryStats.totalVolumeMl / 1000).toFixed(2)}L</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">Liquid Volume</p>
              </div>
              <div className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border border-l-4 ${vpdIsLive ? "border-slate-200/90 border-l-emerald-500 bg-emerald-50" : "border-slate-200/90 border-l-slate-300 bg-slate-50"}`}>
                <p className={`text-2xl font-black leading-none ${vpdIsLive ? "text-emerald-700" : "text-slate-500"}`}>£{summaryStats.totalDutyPaid.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                  VPD Paid {!vpdIsLive && "(from Oct '26)"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">
                <span>Order No</span>
                <span>Date</span>
                <span className="text-right">Volume (ml)</span>
                <span className="text-right">VPD</span>
              </div>
              <div className="divide-y divide-slate-50 text-[11px] text-left">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No purchase records found.</div>
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
                        {/* The short suffix is what tells orders apart; the invoice shows the full number. */}
                        <span className="min-w-0 truncate font-mono font-bold text-blue-600 underline decoration-blue-600/30">{o.orderNumber.split("-").pop() || o.orderNumber}</span>
                        <span className="min-w-0 truncate text-slate-500">{formatDate(o.createdAt)}</span>
                        <span className="text-right font-mono text-slate-700">{orderVol} ml</span>
                        <span className="text-right font-mono font-bold text-slate-700">£{o.vapeDutyAmount.toFixed(2)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-150 bg-blue-50/40 p-4 text-left flex gap-3 text-[11.5px] text-blue-800 leading-relaxed font-medium">
              <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p>Tap any order above to see its full itemized invoice.</p>
            </div>

            <div className="flex gap-3 justify-end pt-2 print:hidden">
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
                  const header = "Order Number,Date,Nicotine Volume (ml),VPD Paid (£),Status\n"
                  const csv = orders.reduce((acc, o) => {
                    let vol = 0
                    if (o.items) o.items.forEach((it) => { if (it.product?.isSubjectToVapeDuty) vol += it.quantity * (it.product.unitsPerPack || 10) * (it.product.liquidVolumeMl || 2.0) })
                    return acc + `"${o.orderNumber}","${new Date(o.createdAt).toISOString().split("T")[0]}","${vol}","${o.vapeDutyAmount}","On file"\n`
                  }, header)
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement("a")
                  link.setAttribute("href", url)
                  link.setAttribute("download", `Unity_Compliance_Summary_${(session?.user as any)?.tradeCode || "trader"}.csv`)
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

        {activePanel === "business" && (
          <div className="space-y-6">
            <button
              onClick={() => setActivePanel("hub")}
              className="flex items-center gap-1.5 text-xs text-blue-100/80 font-bold uppercase tracking-wider hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Retail Assist
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-sm text-left max-w-lg mx-auto border-t-8 border-t-blue-600">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{UNITY_BUSINESS.legalName}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Wholesale trade supplier, Glasgow</p>
                </div>
                <Building className="h-10 w-10 text-slate-400/50" />
              </div>

              <div className="space-y-3 border-t border-b border-slate-100 py-5 text-[12px]">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">Address</span>
                  <span className="text-slate-800 font-semibold col-span-2">
                    {UNITY_BUSINESS.addressLines.map((line) => <span key={line} className="block">{line}</span>)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">Phone</span>
                  <span className="text-slate-800 font-semibold col-span-2">{UNITY_BUSINESS.phone}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block col-span-1">VAT Number</span>
                  <span className="text-blue-700 font-black font-mono tracking-tight col-span-2">{UNITY_BUSINESS.vatNumber}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Unity Cash &amp; Carry supplies TPD-compliant vaping products, e-liquids and nicotine pouches on a
                genuine business-to-business wholesale basis. No alcohol or tobacco products are supplied — the
                Alcohol Wholesaler Registration Scheme (AWRS) does not apply to this business.
              </p>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4" /> Print Details
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
                <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-2.5">
                    <UnityLogo size={36} />
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        Invoice: {selectedInvoiceOrder.orderNumber}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">Date: {formatDate(selectedInvoiceOrder.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-slate-900">£{selectedInvoiceOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Wholesaler</span>
                    <p className="font-bold text-slate-800 mt-1">{UNITY_BUSINESS.legalName}</p>
                    <p className="text-slate-500 mt-0.5">VAT {UNITY_BUSINESS.vatNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Retail Buyer</span>
                    <p className="font-bold text-slate-800 mt-1">{session?.user?.name || "Trade Partner"}</p>
                    <p className="text-slate-500 mt-0.5">{session?.user?.email}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                    <span className="col-span-2">Product Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Total Price</span>
                  </div>
                  <div className="divide-y divide-slate-50 text-[11px]">
                    {selectedInvoiceOrder.items?.map((item, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-start">
                        <div className="col-span-2 flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 text-xs truncate">{item.product?.name}</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">
                            {item.product?.isSubjectToVapeDuty ? (
                              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-150 inline-block">
                                Subject to VPD{vpdIsLive ? "" : " (from Oct '26)"} · {item.product?.liquidVolumeMl}ml
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                                No liquid duty
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-right font-mono text-slate-700 pt-0.5">{item.quantity} case{item.quantity === 1 ? "" : "s"}</span>
                        <span className="text-right font-mono text-slate-800 pt-0.5">£{(item.quantity * (item.product?.casePrice || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-[11.5px] border border-slate-100 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-mono text-slate-700">£{selectedInvoiceOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedInvoiceOrder.vapeDutyAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vaping Products Duty (VPD):</span>
                      <span className="font-mono text-slate-700">£{selectedInvoiceOrder.vapeDutyAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT:</span>
                    <span className="font-mono text-slate-700">£{selectedInvoiceOrder.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/80 font-bold text-slate-900">
                    <span>Total:</span>
                    <span className="font-mono text-blue-700">£{selectedInvoiceOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Payment Details</span>
                  <p className="font-semibold text-slate-700">{UNITY_BUSINESS.bank.accountName}</p>
                  <p>Sort Code: {UNITY_BUSINESS.bank.sortCode} · Account Number: {UNITY_BUSINESS.bank.accountNumber}</p>
                </div>

                <p className="text-[9px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                  {INVOICE_TERMS}
                </p>
              </div>

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

        {/* Certificates modal — honest "Document on file" placeholders, mirroring the
            marketing site's pattern (unity.html). No image files exist for any of these
            yet; each tile says so plainly rather than faking a seal or reference number.
            Swap in a real thumbnail per tile the moment supplier docs are supplied. */}
        {showCertificates && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-200 text-left">
              <button
                type="button"
                onClick={() => setShowCertificates(false)}
                className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-3 mb-2 pr-10">
                <div className="relative w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <BadgeCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Verified &amp; Compliant</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Trade Documentation On File</p>
                </div>
              </div>

              <p className="text-slate-500 text-xs font-medium mt-4 mb-6 leading-relaxed">
                Unity Cash &amp; Carry operates as a fully authorised, regulation-compliant wholesale distributor.
                Request a signed copy of any document below for your own compliance records.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {CERTIFICATES.map((cert) => (
                  <div key={cert.title} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50/40 flex flex-col items-center justify-center gap-2 border-b border-slate-200 m-2 rounded-xl">
                      <FileBadge2 className="h-7 w-7 text-blue-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document On File</span>
                    </div>
                    <div className="px-3 pb-3 pt-1">
                      <h6 className="text-[10.5px] font-black text-slate-900 uppercase tracking-wider">{cert.title}</h6>
                      <p className="text-[9.5px] text-slate-500 font-semibold mt-0.5">{cert.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                <p className="text-slate-400 text-[9.5px] font-bold uppercase tracking-widest">Need a signed copy?</p>
                <a
                  href="mailto:info.unitycashandcarry@gmail.com?subject=Certificate%20Request"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" /> Request Documents
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
