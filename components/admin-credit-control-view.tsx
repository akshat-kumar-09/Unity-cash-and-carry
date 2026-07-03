"use client"

import { useState, useEffect, useMemo } from "react"
import { Wallet, Loader2, Search, Plus, Minus, RefreshCw } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

type Retailer = {
  id: string
  name: string | null
  email: string
  companyName: string | null
  walletBalance: number
  complianceStatus: string
}

export function AdminCreditControlView() {
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({})
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({})
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
      <AppScreenHeader title="Credit Control" subtitle="Adjust retailer wallet credit balances" />

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="unity-card border-red-100 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Wallet className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">No retailers match</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
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
      </main>
    </div>
  )
}
