"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  Building2,
  FileText,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type Trader = {
  id: string
  name: string | null
  email: string
  role: string
  companyName: string | null
  vatNumber: string | null
  companyNumber: string | null
  retailerLicenseRef: string | null
  complianceStatus: string
  complianceNotes: string | null
  createdAt: string
  _count: {
    orders: number
  }
}

export function AdminComplianceView() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchTraders = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/compliance")
      if (!res.ok) throw new Error("Failed to load traders list")
      const data = await res.json()
      setTraders(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTraders()
  }, [])

  const handleUpdateStatus = async (userId: string, status: "approved" | "blocked", notes?: string) => {
    setUpdatingId(userId)
    try {
      const res = await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          complianceStatus: status,
          complianceNotes: notes || `Updated to ${status} via Admin panel.`,
        }),
      })

      if (!res.ok) throw new Error("Failed to update status")
      fetchTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update trader status")
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredTraders = useMemo(() => {
    if (!searchQuery.trim()) return traders
    const q = searchQuery.toLowerCase()
    return traders.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.companyName || "").toLowerCase().includes(q)
    )
  }, [traders, searchQuery])

  const stats = useMemo(() => {
    return traders.reduce(
      (acc, t) => {
        acc.total++
        if (t.complianceStatus === "approved") acc.approved++
        else if (t.complianceStatus === "pending") acc.pending++
        else if (t.complianceStatus === "blocked") acc.blocked++
        return acc
      },
      { total: 0, approved: 0, pending: 0, blocked: 0 }
    )
  }, [traders])

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
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader
        title="Trader Verification"
        subtitle="HMRC B2B Compliance & Account Auditing"
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 mb-2.5">
              <Users className="h-4.5 w-4.5 text-slate-600" />
            </div>
            <p className="text-[20px] font-black text-slate-900 leading-none">
              {stats.total}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
              Total Traders
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 mb-2.5">
              <Clock className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <p className="text-[20px] font-black text-amber-600 leading-none">
              {stats.pending}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
              Pending Approval
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 mb-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <p className="text-[20px] font-black text-emerald-600 leading-none">
              {stats.approved}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
              Verified Retailers
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 mb-2.5">
              <XCircle className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <p className="text-[20px] font-black text-rose-600 leading-none">
              {stats.blocked}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
              Blocked Accounts
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm placeholder:text-slate-400"
          />
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

            {filteredTraders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Shield className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-[15px] font-bold text-slate-800">
                  No traders found
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  There are no trader accounts matching your search query.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTraders.map((trader) => {
                  const isUpdating = updatingId === trader.id
                  return (
                    <div
                      key={trader.id}
                      className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4 transition-all hover:shadow-md hover:border-slate-300/80"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-[14px]">
                              {trader.name || "No name configured"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              ({trader.email})
                            </span>
                          </div>
                          {trader.companyName && (
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-semibold mt-1">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {trader.companyName}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {trader.complianceStatus === "approved" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-emerald-150">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                          {trader.complianceStatus === "pending" && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-amber-150 animate-pulse">
                              <Clock className="h-3 w-3 animate-spin duration-1000" />
                              Pending Verification
                            </span>
                          )}
                          {trader.complianceStatus === "blocked" && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-rose-150">
                              <XCircle className="h-3 w-3" />
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compliance Credentials */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 uppercase font-bold tracking-wider block">
                            VAT Number
                          </span>
                          <span className="font-mono font-bold text-slate-700 mt-0.5 block">
                            {trader.vatNumber || "Not Provided"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold tracking-wider block">
                            Retailer Name
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {trader.name || "Not Provided"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold tracking-wider block">
                            Email Address
                          </span>
                          <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
                            {trader.email}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold tracking-wider block">
                            Registered On
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {formatDate(trader.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Admin actions / notes */}
                      <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-1.5 flex-1">
                          <FileText className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-slate-400 leading-snug italic">
                            {trader.complianceNotes ? (
                              <span>&ldquo;{trader.complianceNotes}&rdquo;</span>
                            ) : (
                              <span>No compliance audit notes recorded.</span>
                            )}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 shrink-0">
                          {trader.complianceStatus !== "approved" && (
                            <button
                              onClick={() => handleUpdateStatus(trader.id, "approved")}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Approve & Verify
                            </button>
                          )}
                          {trader.complianceStatus !== "blocked" && (
                            <button
                              onClick={() => handleUpdateStatus(trader.id, "blocked")}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all active:scale-[0.97] disabled:opacity-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Block Account
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
