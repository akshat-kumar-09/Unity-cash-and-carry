"use client"

import { useState, useEffect, type ComponentType } from "react"
import { useSession } from "next-auth/react"
import { createPortal } from "react-dom"
import Image from "next/image"
import {
  Tag,
  Gift,
  Truck,
  Shield,
  Clock,
  Percent,
  Star,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  Plus,
  Users,
  X,
  Pencil,
  Trash2,
  Loader2,
  ImagePlus,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { useOnTabShown } from "@/lib/tab-events"
import { toast } from "sonner"

type PromoBanner = { id: string; imageUrl: string; altText: string; sortOrder?: number; isActive?: boolean }

const bannerFormInput = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"

/** Small revolving banner strip — no bigger than the balance card it replaces up top.
 *  Tapping a banner pops it up full-size rather than linking anywhere (no destination
 *  pages exist for these yet). Admin sees this exact same strip, plus an editing row
 *  underneath — on-the-spot edits to the real thing customers see, not a separate panel. */
function PromoBannerStrip({ isAdmin }: { isAdmin: boolean }) {
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState<PromoBanner | null>(null)
  const [editing, setEditing] = useState<PromoBanner | "new" | null>(null)
  const [form, setForm] = useState({ imageUrl: "", altText: "" })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    fetch("/api/promo-banners")
      .then((res) => res.json())
      .then((data) => setBanners(Array.isArray(data?.banners) ? data.banners : []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 4500)
    return () => clearInterval(timer)
  }, [banners.length])

  const openEdit = (target: PromoBanner | "new") => {
    setEditing(target)
    setForm(target === "new" ? { imageUrl: "", altText: "" } : { imageUrl: target.imageUrl, altText: target.altText })
  }

  const handleSave = async () => {
    if (!form.imageUrl.trim() || !form.altText.trim()) {
      toast.error("Image URL and label are required")
      return
    }
    setSaving(true)
    try {
      if (editing === "new") {
        const res = await fetch("/api/promo-banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: form.imageUrl.trim(), altText: form.altText.trim() }),
        })
        if (!res.ok) throw new Error("Failed to add banner")
        toast.success("Banner added")
      } else if (editing) {
        const res = await fetch(`/api/promo-banners/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: form.imageUrl.trim(), altText: form.altText.trim() }),
        })
        if (!res.ok) throw new Error("Failed to update banner")
        toast.success("Banner updated")
      }
      setEditing(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save banner")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this banner?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/promo-banners/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Banner removed")
      load()
    } catch {
      toast.error("Failed to delete banner")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="aspect-[4/1] w-full animate-pulse rounded-2xl bg-slate-100" />
  }
  if (banners.length === 0 && !isAdmin) return null

  return (
    <>
      {banners.length > 0 && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 shadow-md aspect-[4/1]">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setExpanded(banner)}
              aria-label={`${banner.altText}. Tap to view`}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
            >
              <Image src={banner.imageUrl} alt={banner.altText} fill sizes="480px" unoptimized className="object-contain" priority={i === 0} />
            </button>
          ))}
          {banners.length > 1 && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mt-2.5 space-y-2">
          <div className="flex flex-wrap gap-2">
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.imageUrl} alt="" className="h-7 w-11 rounded object-contain" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
                <button type="button" onClick={() => openEdit(banner)} className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600" aria-label="Edit banner">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => handleDelete(banner.id)} disabled={deletingId === banner.id} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete banner">
                  {deletingId === banner.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openEdit("new")}
              className="flex items-center gap-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Add banner
            </button>
          </div>

          {editing && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
              <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className={bannerFormInput} />
              <input placeholder="Label (e.g. offer name)" value={form.altText} onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))} className={bannerFormInput} />
              <div className="flex gap-2">
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
            onClick={() => setExpanded(null)}
          >
            <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <Image
                src={expanded.imageUrl}
                alt={expanded.altText}
                width={1200}
                height={400}
                unoptimized
                className="h-auto w-full rounded-2xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg"
              >
                <X className="h-4 w-4 text-slate-700" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

const PERK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  gift: Gift,
  truck: Truck,
  shield: Shield,
  clock: Clock,
  percent: Percent,
  star: Star,
}

type DepotPerk = { id: string; title: string; description: string; icon: string }

interface PromoCode {
  id: string
  code: string
  description: string
  discountType: string
  value: number
  minOrderValue: number
}

export function OffersView() {
  const { data: session } = useSession()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [promosLoading, setPromosLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [perks, setPerks] = useState<DepotPerk[]>([])
  const [perksLoading, setPerksLoading] = useState(true)

  // Admin on-the-spot editing — vouchers
  const [editingVoucher, setEditingVoucher] = useState<PromoCode | "new" | null>(null)
  const [voucherForm, setVoucherForm] = useState({ code: "", description: "", discountType: "percentage", value: "", minOrderValue: "" })
  const [voucherSaving, setVoucherSaving] = useState(false)
  const [deletingVoucherId, setDeletingVoucherId] = useState<string | null>(null)

  // Admin on-the-spot editing — depot perks
  const [editingPerk, setEditingPerk] = useState<DepotPerk | "new" | null>(null)
  const [perkForm, setPerkForm] = useState({ title: "", description: "", icon: "gift" })
  const [perkSaving, setPerkSaving] = useState(false)
  const [deletingPerkId, setDeletingPerkId] = useState<string | null>(null)

  // Wallet State
  const [balance, setBalance] = useState<number>(0)
  const [walletLoading, setWalletLoading] = useState(true)
  const [walletRefreshing, setWalletRefreshing] = useState(false)

  // Admin form state — single customer
  const [adminEmail, setAdminEmail] = useState("")
  const [adminAmount, setAdminAmount] = useState("")
  const [adminType, setAdminType] = useState("deposit")
  const [adminDesc, setAdminDesc] = useState("")
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  // Admin form state — bulk "credit everyone"
  const [bulkAmount, setBulkAmount] = useState("")
  const [bulkDesc, setBulkDesc] = useState("")
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const isAdmin = (session?.user as any)?.role === "admin"

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/promo")
      if (!res.ok) throw new Error("Failed to load offers")
      const data = await res.json()
      setPromos(data)
    } catch (err: any) {
      console.error(err)
      toast.error("Could not load current wholesale offers")
    } finally {
      setPromosLoading(false)
    }
  }

  const fetchPerks = async () => {
    try {
      const res = await fetch("/api/depot-perks")
      const data = await res.json()
      setPerks(Array.isArray(data?.perks) ? data.perks : [])
    } catch {
      setPerks([])
    } finally {
      setPerksLoading(false)
    }
  }

  const openEditVoucher = (target: PromoCode | "new") => {
    setEditingVoucher(target)
    setVoucherForm(
      target === "new"
        ? { code: "", description: "", discountType: "percentage", value: "", minOrderValue: "" }
        : {
            code: target.code,
            description: target.description,
            discountType: target.discountType,
            value: String(target.value),
            minOrderValue: String(target.minOrderValue || ""),
          }
    )
  }

  const handleSaveVoucher = async () => {
    if (!voucherForm.code.trim() || !voucherForm.description.trim() || !voucherForm.value) {
      toast.error("Code, description and value are required")
      return
    }
    setVoucherSaving(true)
    try {
      const body = {
        code: voucherForm.code.trim().toUpperCase(),
        description: voucherForm.description.trim(),
        discountType: voucherForm.discountType,
        value: parseFloat(voucherForm.value),
        minOrderValue: voucherForm.minOrderValue ? parseFloat(voucherForm.minOrderValue) : 0,
      }
      if (editingVoucher === "new") {
        const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create voucher")
        toast.success(`Voucher "${data.code}" created`)
      } else if (editingVoucher) {
        const res = await fetch(`/api/promo/${editingVoucher.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update voucher")
        toast.success("Voucher updated")
      }
      setEditingVoucher(null)
      fetchPromos()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher")
    } finally {
      setVoucherSaving(false)
    }
  }

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Remove this voucher?")) return
    setDeletingVoucherId(id)
    try {
      const res = await fetch(`/api/promo/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Voucher removed")
      fetchPromos()
    } catch {
      toast.error("Failed to delete voucher")
    } finally {
      setDeletingVoucherId(null)
    }
  }

  const openEditPerk = (target: DepotPerk | "new") => {
    setEditingPerk(target)
    setPerkForm(target === "new" ? { title: "", description: "", icon: "gift" } : { title: target.title, description: target.description, icon: target.icon })
  }

  const handleSavePerk = async () => {
    if (!perkForm.title.trim() || !perkForm.description.trim()) {
      toast.error("Title and description are required")
      return
    }
    setPerkSaving(true)
    try {
      const body = { title: perkForm.title.trim(), description: perkForm.description.trim(), icon: perkForm.icon }
      if (editingPerk === "new") {
        const res = await fetch("/api/depot-perks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error("Failed to create perk")
        toast.success("Perk added")
      } else if (editingPerk) {
        const res = await fetch(`/api/depot-perks/${editingPerk.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error("Failed to update perk")
        toast.success("Perk updated")
      }
      setEditingPerk(null)
      fetchPerks()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save perk")
    } finally {
      setPerkSaving(false)
    }
  }

  const handleDeletePerk = async (id: string) => {
    if (!confirm("Remove this perk?")) return
    setDeletingPerkId(id)
    try {
      const res = await fetch(`/api/depot-perks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Perk removed")
      fetchPerks()
    } catch {
      toast.error("Failed to delete perk")
    } finally {
      setDeletingPerkId(null)
    }
  }

  const fetchWalletData = async (showToast = false) => {
    try {
      const res = await fetch("/api/wallet")
      if (!res.ok) throw new Error("Failed to load wallet data")
      const data = await res.json()
      setBalance(data.balance)
      if (showToast) {
        toast.success("Wallet ledger synchronized")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Could not fetch real-time wallet details")
    } finally {
      setWalletLoading(false)
      setWalletRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPromos()
    fetchPerks()
    fetchWalletData()
  }, [])

  // Back on Rewards after ordering with credits: show the new balance, no spinner.
  useOnTabShown("offers", () => {
    void fetchWalletData()
  })

  const handleRefreshWallet = () => {
    setWalletRefreshing(true)
    fetchWalletData(true)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied code "${code}" to clipboard!`)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
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

  const handleBulkCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkAmount || !bulkDesc) {
      toast.error("Amount and description are required")
      return
    }
    const amt = parseFloat(bulkAmount)
    if (isNaN(amt) || amt === 0) {
      toast.error("Amount must be a non-zero number")
      return
    }
    if (!window.confirm(`Apply £${amt.toFixed(2)} to every trade account? This can't be undone in bulk.`)) return

    setBulkSubmitting(true)
    try {
      const res = await fetch("/api/wallet/bulk-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, description: bulkDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to credit accounts")
      toast.success(`Applied £${amt.toFixed(2)} to ${data.accountsCredited} accounts`)
      setBulkAmount("")
      setBulkDesc("")
      fetchWalletData()
    } catch (err: any) {
      toast.error(err.message || "Failed to credit accounts")
    } finally {
      setBulkSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader
        title="Rewards & Wallet"
        subtitle="Exclusive vouchers and your trade credits balance"
      />
      <main className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* Promo banner strip — replaces the old always-on balance card up top */}
        <PromoBannerStrip isAdmin={isAdmin} />

        {/* Dynamic Vouchers List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Active Trade Promo Vouchers
            </h3>
            <button
              onClick={() => { setPromosLoading(true); fetchPromos(); }}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Refresh Offers
            </button>
          </div>

          {promosLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-white animate-pulse rounded-2xl border border-slate-100"></div>
              ))}
            </div>
          ) : promos.length === 0 ? (
            <div className="unity-card border border-dashed border-slate-200 bg-white py-8 px-4 text-center">
              <Tag className="h-7 w-7 text-slate-400 mx-auto mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">No promo codes active</p>
              <p className="text-xs text-slate-400 mt-1">Check back later for seasonal trade offers.</p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {promos.map((promo) => {
                const copied = copiedCode === promo.code
                return (
                  <div key={promo.id}>
                    <div className="relative flex overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white shadow-sm hover:shadow-md transition-shadow">
                      {isAdmin && (
                        <div className="absolute right-2 top-2 z-10 flex gap-1">
                          <button type="button" onClick={() => openEditVoucher(promo)} aria-label="Edit voucher" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-blue-600 shadow ring-1 ring-slate-200/80 hover:bg-blue-50">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteVoucher(promo.id)} disabled={deletingVoucherId === promo.id} aria-label="Delete voucher" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow ring-1 ring-slate-200/80 hover:bg-red-50">
                            {deletingVoucherId === promo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5 p-5 text-left">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black leading-none text-blue-700">
                            {promo.discountType === "percentage" ? `${promo.value}%` : `£${promo.value}`}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">off</span>
                        </div>
                        <p className="font-bold text-slate-700 text-[13px] leading-snug">{promo.description}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {promo.minOrderValue > 0
                            ? `Min. order £${promo.minOrderValue.toFixed(2)}`
                            : "No minimum order"}
                        </p>
                      </div>

                      {/* Ticket perforation — punch-hole notches read as a torn stub */}
                      <div className="relative w-0 shrink-0">
                        <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-slate-50" />
                        <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-slate-50" />
                        <div className="h-full border-l-2 border-dashed border-blue-200" />
                      </div>

                      <button
                        onClick={() => copyToClipboard(promo.code)}
                        className={`flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 px-2 py-4 text-center transition-all active:scale-95 ${
                          copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <span className="font-mono text-[12px] font-black tracking-wider break-all">{promo.code}</span>
                        {copied ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                            <Check className="h-3.5 w-3.5" /> Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </span>
                        )}
                      </button>
                    </div>

                    {isAdmin && editingVoucher !== "new" && editingVoucher?.id === promo.id && (
                      <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="CODE" value={voucherForm.code} onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className={bannerFormInput} />
                          <select value={voucherForm.discountType} onChange={(e) => setVoucherForm((f) => ({ ...f, discountType: e.target.value }))} className={bannerFormInput}>
                            <option value="percentage">% off</option>
                            <option value="fixed_amount">£ off</option>
                          </select>
                        </div>
                        <input placeholder="Description" value={voucherForm.description} onChange={(e) => setVoucherForm((f) => ({ ...f, description: e.target.value }))} className={bannerFormInput} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Value" type="number" step="0.01" value={voucherForm.value} onChange={(e) => setVoucherForm((f) => ({ ...f, value: e.target.value }))} className={bannerFormInput} />
                          <input placeholder="Min order £ (optional)" type="number" step="0.01" value={voucherForm.minOrderValue} onChange={(e) => setVoucherForm((f) => ({ ...f, minOrderValue: e.target.value }))} className={bannerFormInput} />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleSaveVoucher} disabled={voucherSaving} className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50">
                            {voucherSaving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setEditingVoucher(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isAdmin && (
            <>
              {editingVoucher !== "new" ? (
                <button
                  type="button"
                  onClick={() => openEditVoucher("new")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-2.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add voucher
                </button>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="CODE" value={voucherForm.code} onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className={bannerFormInput} />
                    <select value={voucherForm.discountType} onChange={(e) => setVoucherForm((f) => ({ ...f, discountType: e.target.value }))} className={bannerFormInput}>
                      <option value="percentage">% off</option>
                      <option value="fixed_amount">£ off</option>
                    </select>
                  </div>
                  <input placeholder="Description" value={voucherForm.description} onChange={(e) => setVoucherForm((f) => ({ ...f, description: e.target.value }))} className={bannerFormInput} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Value" type="number" step="0.01" value={voucherForm.value} onChange={(e) => setVoucherForm((f) => ({ ...f, value: e.target.value }))} className={bannerFormInput} />
                    <input placeholder="Min order £ (optional)" type="number" step="0.01" value={voucherForm.minOrderValue} onChange={(e) => setVoucherForm((f) => ({ ...f, minOrderValue: e.target.value }))} className={bannerFormInput} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveVoucher} disabled={voucherSaving} className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50">
                      {voucherSaving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditingVoucher(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Wallet Balance Card — slim strip */}
        <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 px-5 py-3.5 text-white shadow-lg shadow-blue-900/15">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 shrink-0 text-blue-300" />
            <div>
              <span className="block text-[9.5px] font-black uppercase tracking-widest text-blue-200">
                Available Credits
              </span>
              {walletLoading ? (
                <div className="mt-1 h-5 w-20 animate-pulse rounded bg-white/15" />
              ) : (
                <p className="text-xl font-black leading-tight tracking-tight">£{(Math.round(balance * 100) / 100 || 0).toFixed(2)}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleRefreshWallet}
            disabled={walletRefreshing}
            className="shrink-0 rounded-xl bg-white/5 p-2 text-blue-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${walletRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Admin Credit Adjustments (Only visible to admin) */}
        {isAdmin && (
          <section className="unity-card bg-slate-900 border border-slate-800 p-5 text-white rounded-3xl space-y-4 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Plus className="h-5 w-5 text-blue-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-blue-400">
                Admin Adjustments Panel
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Transaction Type</label>
                  <select
                    value={adminType}
                    onChange={(e) => setAdminType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none"
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
                    placeholder="Initial bonus, deposit, etc."
                    value={adminDesc}
                    onChange={(e) => setAdminDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
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

            {/* Bulk "credit everyone" — distinct from the per-customer form above */}
            <div className="space-y-4 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-400">
                  Credit Every Trade Account
                </h4>
              </div>
              <form onSubmit={handleBulkCredit} className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount, e.g. 10.00"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Reason, e.g. Launch bonus"
                    value={bulkDesc}
                    onChange={(e) => setBulkDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-99 shadow-lg shadow-amber-500/15"
                >
                  {bulkSubmitting ? "Applying to every account..." : "Apply to Every Trade Account"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Depot Perks — admin-managed (Admin → Rewards → Depot Perks) */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-left">
            Depot Wholesale Perks
          </h3>
          {perksLoading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => <div key={i} className="h-20 bg-white animate-pulse rounded-2xl border border-slate-100" />)}
            </div>
          ) : perks.length === 0 ? (
            <div className="unity-card border border-dashed border-slate-200 bg-white py-6 px-4 text-center">
              <p className="text-xs text-slate-400">No perks listed yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {perks.map((perk) => {
                const Icon = PERK_ICONS[perk.icon] ?? Gift
                return (
                  <div key={perk.id}>
                    <div className="relative unity-card bg-white border border-slate-100 flex gap-4 p-4 shadow-sm">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                        <Icon className="h-6 w-6 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-bold text-slate-900 text-sm">{perk.title}</p>
                        <p className="unity-meta mt-1">{perk.description}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-start gap-1">
                          <button type="button" onClick={() => openEditPerk(perk)} aria-label="Edit perk" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeletePerk(perk.id)} disabled={deletingPerkId === perk.id} aria-label="Delete perk" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                            {deletingPerkId === perk.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {isAdmin && editingPerk !== "new" && editingPerk?.id === perk.id && (
                      <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                        <input placeholder="Title" value={perkForm.title} onChange={(e) => setPerkForm((f) => ({ ...f, title: e.target.value }))} className={bannerFormInput} />
                        <input placeholder="Description" value={perkForm.description} onChange={(e) => setPerkForm((f) => ({ ...f, description: e.target.value }))} className={bannerFormInput} />
                        <select value={perkForm.icon} onChange={(e) => setPerkForm((f) => ({ ...f, icon: e.target.value }))} className={bannerFormInput}>
                          {Object.keys(PERK_ICONS).map((key) => <option key={key} value={key}>{key}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleSavePerk} disabled={perkSaving} className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50">
                            {perkSaving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setEditingPerk(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isAdmin && (
            editingPerk !== "new" ? (
              <button
                type="button"
                onClick={() => openEditPerk("new")}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-2.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add perk
              </button>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                <input placeholder="Title (e.g. Scotland Pallet Deliveries)" value={perkForm.title} onChange={(e) => setPerkForm((f) => ({ ...f, title: e.target.value }))} className={bannerFormInput} />
                <input placeholder="Description" value={perkForm.description} onChange={(e) => setPerkForm((f) => ({ ...f, description: e.target.value }))} className={bannerFormInput} />
                <select value={perkForm.icon} onChange={(e) => setPerkForm((f) => ({ ...f, icon: e.target.value }))} className={bannerFormInput}>
                  {Object.keys(PERK_ICONS).map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSavePerk} disabled={perkSaving} className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50">
                    {perkSaving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingPerk(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}
        </section>

        <p className="text-center text-[10px] text-slate-400 py-3">
          Unity Cash &amp; Carry · Trade wholesale · Glasgow
        </p>
      </main>
    </div>
  )
}
