"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Users,
  Plus,
  Search,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  X,
  Building2,
  UserPlus,
  Check,
  AlertCircle,
  Mail,
  StickyNote,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type Lead = {
  id: string
  businessName: string
  contactName: string
  phone: string
  email: string
  address: string
  postcode: string
  city: string
  notes: string
  status: string
  followUpDate: string | null
  createdAt: string
}

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospect", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  { key: "contacted", label: "Contacted", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  { key: "pitched", label: "Pitched", color: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { key: "onboarded", label: "Onboarded", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { key: "declined", label: "Declined", color: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
]

export function AdminLeadsView() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
    city: "",
    notes: "",
  })

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/leads")
      if (!res.ok) throw new Error("Failed to load leads")
      const data = await res.json()
      setLeads(Array.isArray(data.leads) ? data.leads : Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads
    const q = searchQuery.toLowerCase()
    return leads.filter(
      (l) =>
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q)
    )
  }, [leads, searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName || !form.contactName) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "prospect" }),
      })
      if (!res.ok) throw new Error("Failed to create lead")

      setForm({
        businessName: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        postcode: "",
        city: "",
        notes: "",
      })
      setShowForm(false)
      fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lead")
    } finally {
      setSubmitting(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingId(leadId)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update lead")
      fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const getNextStage = (currentStatus: string): string | null => {
    const idx = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus)
    if (idx < 0 || idx >= PIPELINE_STAGES.length - 2) return null // can't go past onboarded
    return PIPELINE_STAGES[idx + 1].key
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader
        title="Sales Pipeline"
        subtitle="CRM — Retailer lead management"
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Search + Add Lead */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by business or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm ${
              showForm
                ? "bg-slate-200 text-slate-600"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
            }`}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Add Lead"}
          </button>
        </div>

        {/* Add Lead Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4"
          >
            <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Lead Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vape Kingdom"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="07xxx xxx xxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="contact@business.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="123 High Street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Postcode
                  </label>
                  <input
                    type="text"
                    placeholder="G1 1AA"
                    value={form.postcode}
                    onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Glasgow"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Any relevant details about this lead…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-600/15"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {submitting ? "Creating…" : "Create Lead"}
            </button>
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Pipeline Columns */}
        {!loading && (
          <>
            {/* Pipeline Summary */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {PIPELINE_STAGES.map((stage) => {
                const count = filteredLeads.filter((l) => l.status === stage.key).length
                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap ${stage.color}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                    {stage.label}
                    <span className="font-black">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Mobile-friendly: stacked columns */}
            <div className="space-y-5">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = filteredLeads.filter(
                  (l) => l.status === stage.key
                )
                if (stageLeads.length === 0) return null

                return (
                  <section key={stage.key}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                      {stage.label} ({stageLeads.length})
                    </h3>

                    <div className="space-y-2.5">
                      {stageLeads.map((lead) => {
                        const nextStage = getNextStage(lead.status)
                        const isUpdating = updatingId === lead.id

                        return (
                          <div
                            key={lead.id}
                            className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4 transition-all hover:shadow-md hover:border-slate-300/80"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                  <h4 className="text-[14px] font-bold text-slate-900 truncate">
                                    {lead.businessName}
                                  </h4>
                                </div>
                                <p className="text-[12px] text-slate-500 font-semibold mt-1 ml-6">
                                  {lead.contactName}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${stage.color}`}
                              >
                                {stage.label}
                              </span>
                            </div>

                            {/* Contact Details */}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 ml-6">
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </a>
                              )}
                              {lead.email && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </span>
                              )}
                              {lead.city && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <MapPin className="h-3 w-3" />
                                  {lead.city}
                                </span>
                              )}
                              {lead.followUpDate && (
                                <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                                  <Calendar className="h-3 w-3" />
                                  Follow-up: {formatDate(lead.followUpDate)}
                                </span>
                              )}
                            </div>

                            {lead.notes && (
                              <div className="mt-2.5 ml-6 flex items-start gap-1.5">
                                <StickyNote className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-slate-400 leading-snug italic">
                                  {lead.notes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {lead.status !== "onboarded" && lead.status !== "declined" && (
                              <div className="mt-3.5 flex gap-2 ml-6">
                                {nextStage && (
                                  <button
                                    onClick={() => updateLeadStatus(lead.id, nextStage)}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-lg transition-all disabled:opacity-50 active:scale-[0.97] shadow-sm shadow-blue-600/15"
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    Move to{" "}
                                    {PIPELINE_STAGES.find((s) => s.key === nextStage)?.label}
                                  </button>
                                )}
                                <button
                                  onClick={() => updateLeadStatus(lead.id, "declined")}
                                  disabled={isUpdating}
                                  className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" />
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            {/* Empty State */}
            {filteredLeads.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-[15px] font-bold text-slate-800">
                  {searchQuery ? "No matching leads" : "No leads yet"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] leading-snug">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Add your first retailer lead to start building the pipeline."}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
