"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Warehouse,
  Plus,
  Loader2,
  Package,
  Droplets,
  Landmark,
  ChevronDown,
  Calculator,
  AlertCircle,
  Check,
  History,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type Product = {
  id: string
  name: string
  brand: string
  sku: string
  liquidVolumeMl: number
  isSubjectToVapeDuty: boolean
}

type Extraction = {
  id: string
  productId: string
  product?: {
    name: string
    sku: string
  }
  quantityUnits: number
  liquidVolumeMl: number
  totalVolumeMl: number
  dutyPerUnit: number
  totalDuty: number
  extractedAt: string
  extractedBy: string
  hmrcPeriod: string
  notes: string | null
}

type PeriodSummary = {
  totalExtractions: number
  totalVolumeMl: number
  totalDutyLiability: number
}

export function AdminWarehouseView() {
  const [extractions, setExtractions] = useState<Extraction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Period selector
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Form state
  const [formProductId, setFormProductId] = useState("")
  const [formQuantity, setFormQuantity] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const periodString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [extractRes, prodRes] = await Promise.all([
        fetch(`/api/admin/warehouse?period=${periodString}`),
        fetch("/api/products"),
      ])

      if (!extractRes.ok) throw new Error("Failed to load warehouse data")

      const extractData = await extractRes.json()
      setExtractions(
        Array.isArray(extractData.extractions)
          ? extractData.extractions
          : Array.isArray(extractData)
            ? extractData
            : []
      )

      if (prodRes.ok) {
        const prodData = await prodRes.json()
        setProducts(
          Array.isArray(prodData.products)
            ? prodData.products
            : Array.isArray(prodData)
              ? prodData
              : []
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodString])

  // Summary calculations
  const summary: PeriodSummary = useMemo(() => {
    return extractions.reduce(
      (acc, ext) => ({
        totalExtractions: acc.totalExtractions + 1,
        totalVolumeMl: acc.totalVolumeMl + (ext.totalVolumeMl || 0),
        totalDutyLiability: acc.totalDutyLiability + (ext.totalDuty || 0),
      }),
      { totalExtractions: 0, totalVolumeMl: 0, totalDutyLiability: 0 }
    )
  }, [extractions])

  // Live duty calculation
  const selectedProduct = products.find((p) => p.id === formProductId)
  const qty = parseInt(formQuantity) || 0
  const volumePerUnit = selectedProduct?.liquidVolumeMl || 2
  const isVapeDuty = selectedProduct?.isSubjectToVapeDuty ?? true
  const previewTotalMl = qty * volumePerUnit
  const previewDuty = isVapeDuty ? Math.round(qty * volumePerUnit * 0.22 * 100) / 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProductId || !formQuantity) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formProductId,
          quantityUnits: qty,
          notes: formNotes.trim(),
        }),
      })
      if (!res.ok) throw new Error("Failed to record extraction")

      setFormProductId("")
      setFormQuantity("")
      setFormNotes("")
      setShowForm(false)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  // Generate month options
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader
        title="Warehouse Ledger"
        subtitle="Duty-suspension extraction tracking"
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-[13px] font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative w-28">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-[13px] font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] font-medium text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Period Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 mb-2.5">
                  <Package className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <p className="text-[20px] font-black text-slate-900 tracking-tight leading-none">
                  {summary.totalExtractions}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                  Extractions
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 mb-2.5">
                  <Droplets className="h-4.5 w-4.5 text-cyan-600" />
                </div>
                <p className="text-[20px] font-black text-slate-900 tracking-tight leading-none">
                  {(summary.totalVolumeMl / 1000).toFixed(1)}L
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                  Total Volume
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 mb-2.5">
                  <Landmark className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <p className="text-[20px] font-black text-slate-900 tracking-tight leading-none">
                  £{summary.totalDutyLiability.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                  Duty Liability
                </p>
              </div>
            </div>

            {/* Add Extraction Button / Form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                <Plus className="h-4.5 w-4.5" />
                Record New Extraction
              </button>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4"
              >
                <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Warehouse Extraction
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Product
                  </label>
                  <div className="relative">
                    <select
                      value={formProductId}
                      onChange={(e) => setFormProductId(e.target.value)}
                      required
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.brand} — {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Quantity (units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Live Duty Calculation Preview */}
                {qty > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5" />
                      Live Duty Preview
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[16px] font-black text-slate-900">
                          {qty}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Units
                        </p>
                      </div>
                      <div>
                        <p className="text-[16px] font-black text-slate-900">
                          {previewTotalMl.toLocaleString()}ml
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Volume
                        </p>
                      </div>
                      <div>
                        <p className="text-[16px] font-black text-amber-600">
                          £{previewDuty.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Est. Duty
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Batch 2024-A, warehouse ref…"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-600/15"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {submitting ? "Recording…" : "Confirm Extraction"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Extraction History Table */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Extraction History — {monthNames[selectedMonth]} {selectedYear}
              </h3>

              {extractions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Warehouse className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-700">
                    No extractions this period
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] leading-snug">
                    Record your first duty-suspension extraction using the
                    button above.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                  {/* Table Header */}
                  <div className="hidden md:grid md:grid-cols-6 gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Date</span>
                    <span>Product</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Volume</span>
                    <span className="text-right">Duty</span>
                    <span>Notes</span>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-slate-50">
                    {extractions
                      .sort(
                        (a, b) =>
                          new Date(b.extractedAt).getTime() -
                          new Date(a.extractedAt).getTime()
                      )
                      .map((ext) => (
                        <div
                          key={ext.id}
                          className="grid grid-cols-2 md:grid-cols-6 gap-2 px-5 py-3.5 text-[12px] items-center hover:bg-slate-50/50 transition-colors"
                        >
                          <span className="text-slate-500 font-semibold">
                            {formatDate(ext.extractedAt)}
                          </span>
                          <span className="font-bold text-slate-800">
                            {ext.product?.name || "Unknown Product"}
                          </span>
                          <span className="text-right font-mono font-bold text-slate-700">
                            {ext.quantityUnits}
                          </span>
                          <span className="text-right font-mono text-slate-600">
                            {(ext.totalVolumeMl / 1000).toFixed(2)}L
                          </span>
                          <span className="text-right font-mono font-bold text-amber-700">
                            £{ext.totalDuty.toFixed(2)}
                          </span>
                          <span className="text-slate-400 text-[11px] truncate">
                            {ext.notes || "—"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
