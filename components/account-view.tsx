"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { LogOut, Shield, Building2, FileText, CheckCircle2, Clock, XCircle } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"
import { AppScreenHeader } from "@/components/app-screen-header"

type ComplianceData = {
  vatNumber: string | null
  companyNumber: string | null
  companyName: string | null
  retailerLicenseRef: string | null
  complianceStatus: string
}

export function AccountView() {
  const { data: session, status } = useSession()
  const [compliance, setCompliance] = useState<ComplianceData | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vatNumber: "",
    companyNumber: "",
    companyName: "",
    retailerLicenseRef: "",
  })

  useEffect(() => {
    fetch("/api/admin/compliance?self=true")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setCompliance(data)
          setForm({
            vatNumber: data.vatNumber || "",
            companyNumber: data.companyNumber || "",
            companyName: data.companyName || "",
            retailerLicenseRef: data.retailerLicenseRef || "",
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, selfUpdate: true }),
      })
      setCompliance((prev) =>
        prev ? { ...prev, ...form, complianceStatus: "pending" } : prev
      )
    } catch {}
    setSaving(false)
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center unity-app-screen pb-28">
        <div className="text-[13px] font-medium text-slate-500">Loading…</div>
      </div>
    )
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
    approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "HMRC Compliant — Approved" },
    pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Pending Verification" },
    blocked: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Account Blocked — Contact Unity" },
  }

  const cs = compliance?.complianceStatus || "pending"
  const statusInfo = statusConfig[cs] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl">
      <AppScreenHeader title="Account" subtitle="Profile & compliance" />
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Profile */}
        <div className="flex flex-col items-center py-4">
          <div className="rounded-2xl border-2 border-blue-100 bg-white p-3 shadow-md ring-4 ring-blue-50/50">
            <UnityLogo size={72} />
          </div>
          <h2 className="mt-4 text-[18px] font-bold text-slate-900">
            {session?.user?.name ?? "Account"}
          </h2>
          <p className="unity-meta mt-1">{session?.user?.email ?? "—"}</p>
        </div>

        {/* Compliance Status Banner */}
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${statusInfo.bg}`}>
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusInfo.color}`} />
          <div>
            <p className={`text-[13px] font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            {cs === "pending" && (
              <p className="text-[11px] text-amber-700 mt-0.5">
                Complete your business details below. An admin will verify your account.
              </p>
            )}
            {cs === "blocked" && (
              <p className="text-[11px] text-red-700 mt-0.5">
                Your ordering access has been suspended. Please contact Unity Cash & Carry.
              </p>
            )}
          </div>
        </div>

        {/* Business Compliance Form */}
        <div className="unity-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Business Compliance & Licensing
            </span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Company / Business Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Unity Vape Ltd"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))}
                placeholder="GB123456789"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Companies House Number
              </label>
              <input
                type="text"
                value={form.companyNumber}
                onChange={(e) => setForm((f) => ({ ...f, companyNumber: e.target.value }))}
                placeholder="SC123456"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Vape Retailer License Reference
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.retailerLicenseRef}
                  onChange={(e) => setForm((f) => ({ ...f, retailerLicenseRef: e.target.value }))}
                  placeholder="VRL-2026-XXXX"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {saving ? "Saving…" : "Save Compliance Details"}
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="unity-tap flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <p className="text-center text-[10px] text-slate-400">
          Unity Cash &amp; Carry · Trade-only · Glasgow
        </p>
      </main>
    </div>
  )
}
