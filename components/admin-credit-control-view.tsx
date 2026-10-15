"use client"

import { useState, useEffect, useMemo } from "react"
import { Wallet, Loader2, Search, Plus, Minus, RefreshCw, FileText, ShieldCheck, ChevronLeft, Printer, Download, Building } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { useOnTabShown } from "@/lib/tab-events"
import { toast } from "sonner"
import { UNITY_BUSINESS, VPD_EFFECTIVE_DATE } from "@/lib/unity-business"

type Retailer = {
  id: string
  name: string | null
  email: string
  companyName: string | null
  walletBalance: number
  complianceStatus: string
}

type InspectorOrder = {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  vapeDutyAmount: number
  customerName: string | null
  user?: { name: string | null; email: string }
  items?: {
    quantity: number
    product?: {
      unitsPerPack?: number
      liquidVolumeMl?: number
      isSubjectToVapeDuty?: boolean
    }
  }[]
}

export function AdminCreditControlView() {
  const [activePanel, setActivePanel] = useState<"hub" | "report">("hub")
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({})
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({})

  const [inspectorOrders, setInspectorOrders] = useState<InspectorOrder[]>([])
  const [inspectorLoading, setInspectorLoading] = useState(true)
  const vpdIsLive = new Date() >= VPD_EFFECTIVE_DATE

  const fetchInspectorOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to load orders")
      const data = await res.json()
      // Cancelled orders never shipped, so they have no place in a duty ledger.
      setInspectorOrders(Array.isArray(data) ? data.filter((o: InspectorOrder) => o.status !== "cancelled") : [])
    } catch {
      setInspectorOrders([])
    } finally {
      setInspectorLoading(false)
    }
  }

  useEffect(() => {
    fetchInspectorOrders()
  }, [])

  const inspectorStats = useMemo(() => {
    const retailerIds = new Set<string>()
    let totalVolumeMl = 0
    let totalDutyPaid = 0
    for (const o of inspectorOrders) {
      if (o.user?.email) retailerIds.add(o.user.email)
      totalDutyPaid += o.vapeDutyAmount
      for (const item of o.items ?? []) {
        if (item.product?.isSubjectToVapeDuty) {
          totalVolumeMl += item.quantity * (item.product.unitsPerPack || 10) * (item.product.liquidVolumeMl || 2.0)
        }
      }
    }
    return {
      totalOrders: inspectorOrders.length,
      totalRetailers: retailerIds.size,
      totalVolumeMl,
      totalDutyPaid,
    }
  }, [inspectorOrders])

  const formatOrderDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  const handlePrint = () => window.print()
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const fetchRetailers = async (showToast = false) => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/compliance")
      if (!res.ok) throw new Error("Failed to load retailers")
      const data = await res.json()
      setRetailers(Array.isArray(data) ? data : [])
      setError(null)
      if (showToast) toast.success("Balances refreshed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRetailers()
  }, [])
  // Kept mounted between visits — refresh balances and the ledger quietly on return.
  useOnTabShown("assist", () => {
    fetchRetailers()
    fetchInspectorOrders()
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return retailers
    return retailers.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.companyName ?? "").toLowerCase().includes(q)
    )
  }, [retailers, search])

  const handleAdjust = async (retailer: Retailer, direction: 1 | -1) => {
    const raw = amountDrafts[retailer.id]
    const amount = parseFloat(raw)
    if (!raw || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid credit amount first")
      return
    }
    const reason = (reasonDrafts[retailer.id] ?? "").trim()
    if (!reason) {
      toast.error("Add a short reason for this adjustment")
      return
    }

    setSubmittingId(retailer.id)
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: retailer.email,
          amount: direction * amount,
          type: "admin_adjustment",
          description: reason,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to adjust balance")
      }
      const data = await res.json()
      setRetailers((prev) =>
        prev.map((r) => (r.id === retailer.id ? { ...r, walletBalance: data.user.walletBalance } : r))
      )
      setAmountDrafts((prev) => ({ ...prev, [retailer.id]: "" }))
      setReasonDrafts((prev) => ({ ...prev, [retailer.id]: "" }))
      setAdjustingId(null)
      toast.success(`${direction > 0 ? "Credited" : "Debited"} £${amount.toFixed(2)} — ${retailer.name || retailer.email}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not adjust balance")
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader
        title={activePanel === "hub" ? "Credit Control" : "Inspector Report"}
        subtitle={activePanel === "hub" ? "Adjust retailer wallet credit balances" : "Business-wide compliance ledger"}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {activePanel === "hub" && (
        <>
        {/* Inspector report — same real-numbers ledger Retail Assist gives traders,
            aggregated across the whole business instead of one retailer's history. */}
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-black text-slate-900">Inspector Report</h2>
              <p className="text-[11px] font-medium text-slate-500">
                Every order, every retailer, real duty totals — ready to show HMRC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePanel("report")}
            disabled={inspectorLoading}
            className="mt-3.5 w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            Generate Inspector Report
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search retailer name, company, email..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchRetailers(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm hover:bg-slate-50"
            aria-label="Refresh balances"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading && retailers.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="unity-card border-red-100 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-800">
            {error}
          </div>
        )}

        {!(loading && retailers.length === 0) && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Wallet className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">No retailers match</p>
          </div>
        )}

        {!(loading && retailers.length === 0) && !error && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const open = adjustingId === r.id
              return (
                <li key={r.id} className="unity-card bg-white border border-slate-150 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAdjustingId(open ? null : r.id)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.name || "Unnamed"}</p>
                      <p className="text-[11px] font-semibold text-slate-500 truncate">
                        {r.companyName || r.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <p className="font-mono font-black text-blue-700 text-sm">£{r.walletBalance.toFixed(2)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Balance</p>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-3 text-left">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountDrafts[r.id] ?? ""}
                          onChange={(e) => setAmountDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Amount £"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-400"
                        />
                        <input
                          type="text"
                          value={reasonDrafts[r.id] ?? ""}
                          onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Reason (e.g. goodwill credit)"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={submittingId === r.id}
                          onClick={() => handleAdjust(r, 1)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wide py-2.5 transition disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" /> Credit
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === r.id}
                          onClick={() => handleAdjust(r, -1)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wide py-2.5 transition disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" /> Debit
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        </>
      )}

      {activePanel === "report" && (
        <div className="space-y-6 relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm">
          <button
            onClick={() => setActivePanel("hub")}
            className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider hover:text-slate-800 transition-colors print:hidden"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Credit Control
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5 pt-2">
            <div className="text-left space-y-1.5">
              <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-tight">
                Unity Business Ledger
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Business-wide compliance report generated on demand — {new Date().toLocaleDateString("en-GB")}
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
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Issuer</span>
              <p className="font-bold text-[13px] text-slate-800 flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-blue-600" /> {UNITY_BUSINESS.legalName}</p>
              <p className="text-slate-500 font-medium mt-0.5">VAT {UNITY_BUSINESS.vatNumber}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Coverage</span>
              <p className="font-bold text-[13px] text-slate-800">Every retailer, all order history</p>
              <p className="text-slate-500 font-medium mt-0.5">{inspectorStats.totalRetailers} retailer{inspectorStats.totalRetailers === 1 ? "" : "s"} on file</p>
            </div>
          </div>

          {inspectorLoading ? (
            <div className="flex h-28 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-300" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                  <p className="text-2xl font-black text-slate-900 leading-none">{inspectorStats.totalOrders}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">Total Orders</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white">
                  <p className="text-2xl font-black text-slate-900 leading-none">{(inspectorStats.totalVolumeMl / 1000).toFixed(2)}L</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">Liquid Volume</p>
                </div>
                <div className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border border-l-4 ${vpdIsLive ? "border-slate-200/90 border-l-emerald-500 bg-emerald-50" : "border-slate-200/90 border-l-slate-300 bg-slate-50"}`}>
                  <p className={`text-2xl font-black leading-none ${vpdIsLive ? "text-emerald-700" : "text-slate-500"}`}>£{inspectorStats.totalDutyPaid.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                    VPD Collected {!vpdIsLive && "(from Oct '26)"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">
                  <span>Order No</span>
                  <span>Retailer</span>
                  <span className="text-right">Date</span>
                  <span className="text-right">VPD</span>
                </div>
                <div className="divide-y divide-slate-50 text-[11px] text-left max-h-[400px] overflow-y-auto">
                  {inspectorOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No orders on file.</div>
                  ) : (
                    inspectorOrders.map((o) => (
                      <div key={o.id} className="grid grid-cols-4 gap-2 px-4 py-3.5 items-center">
                        {/* The short suffix is what tells orders apart; the full number is on the order. */}
                        <span className="min-w-0 truncate font-mono font-bold text-slate-800">{o.orderNumber.split("-").pop() || o.orderNumber}</span>
                        <span className="min-w-0 truncate text-slate-500">{o.customerName || o.user?.name || o.user?.email || "Unknown"}</span>
                        <span className="min-w-0 truncate text-right text-slate-500">{formatOrderDate(o.createdAt)}</span>
                        <span className="text-right font-mono font-bold text-slate-700">£{o.vapeDutyAmount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <Printer className="h-4 w-4" /> Print Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const header = "Order Number,Retailer,Date,VPD Paid (£)\n"
                    const csv = inspectorOrders.reduce((acc, o) => {
                      return acc + `"${o.orderNumber}","${o.customerName || o.user?.name || o.user?.email || "Unknown"}","${new Date(o.createdAt).toISOString().split("T")[0]}","${o.vapeDutyAmount}"\n`
                    }, header)
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.setAttribute("href", url)
                    link.setAttribute("download", "Unity_Inspector_Report.csv")
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-600/10 active:scale-95"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}
      </main>
    </div>
  )
}
