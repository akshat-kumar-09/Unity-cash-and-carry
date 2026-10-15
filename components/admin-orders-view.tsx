"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  ClipboardList,
  Phone,
  MapPin,
  Store,
  MessageSquare,
  Banknote,
  CreditCard,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"
import { getProductImageUrl } from "@/lib/products"
import { payableMethod, paymentMethodLabel, type CounterPaymentMethod, type PaymentStatus } from "@/lib/payment"
import { BookkeepingSummary } from "@/components/bookkeeping-summary"
import { AdminTrendingShelf } from "@/components/admin-trending-shelf"
import { useOnTabShown } from "@/lib/tab-events"

type OrderItem = {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    id: string
    name: string
    brand: string
    sku: string
    imageUrl?: string | null
    category?: string
  }
}

type Order = {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  vat: number
  total: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  shippingAddress: string | null
  fulfillmentMethod: string
  notes: string | null
  createdAt: string
  paymentStatus: string
  paymentMethod: string | null
  paymentReference: string | null
  paidAt: string | null
  collectionCode: string | null
  readyAt: string | null
  readyNotice: string | null
  collectedAt: string | null
  user?: { name: string | null; email: string }
  items?: OrderItem[]
}

type AdminAnalytics = {
  monthly: { month: string; total: number }[]
  lifetimeRevenue: number
  averageOrderValue: number
  totalOrders: number
  windowTotal: number
  revenueByCategory: { label: string; total: number }[]
  revenueByBrand: { label: string; total: number }[]
  topRetailers: { label: string; total: number }[]
}

const STATUS_OPTIONS = ["pending", "confirmed", "dispatched", "delivered", "cancelled"] as const

/** Status colour lives only in the pill — mirrors the trader-facing orders page so
 *  admin and trader read as one consistent design language. */
const STATUS_STYLE: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Clock },
  confirmed: { bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-700", icon: CheckCircle2 },
  dispatched: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Truck },
  delivered: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
  cancelled: { bg: "bg-slate-100 border-slate-200", text: "text-slate-500", icon: XCircle },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider ${s.bg} ${s.text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

/** Money is still owed on it — the orders to chase, or to match against the bank statement. */
function isAwaitingPayment(order: Order): boolean {
  return order.paymentStatus === "unpaid" && order.total > 0 && order.status !== "cancelled"
}

/** Click & collect orders still waiting at the depot — what counter staff work through. */
function isAwaitingCollection(order: Order): boolean {
  return order.fulfillmentMethod === "click_and_collect" && !order.collectedAt && order.status !== "cancelled"
}

function isToday(iso: string | null): boolean {
  return Boolean(iso) && new Date(iso!).toDateString() === new Date().toDateString()
}

function orderBrief(order: Order): string {
  const names = (order.items ?? []).map((i) => i.product?.name).filter((n): n is string => Boolean(n))
  if (names.length === 0) return "Order details unavailable"
  if (names.length <= 2) return names.join(", ")
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`
}

/** Small uppercase section header used for every block on this page — same pattern as
 *  the trader-facing orders page so both read as one design, not two bolted-together
 *  screens. */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Package
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-0.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-[13px] font-black uppercase tracking-widest text-white">{title}</h2>
        <p className="text-[10.5px] font-medium text-blue-100/70">{subtitle}</p>
      </div>
    </div>
  )
}

export function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApplying, setBulkApplying] = useState(false)

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const fetchOrders = async (showToast = false, quiet = false) => {
    try {
      if (!quiet) setLoading(true)
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to load orders")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
      setError(null)
      if (showToast) toast.success("Orders refreshed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/orders/admin-analytics")
      if (!res.ok) throw new Error("Failed to load bookkeeping data")
      const data = await res.json()
      setAnalytics(data)
    } catch {
      setAnalytics(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchAnalytics()
  }, [])

  // Coming back to Orders refreshes in place — new orders appear without a spinner.
  useOnTabShown("orders", () => {
    void fetchOrders(false, true)
  })

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update order status")
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
      toast.success(`Order marked ${status}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update order status")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSetPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update payment")
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: data.paymentStatus, paidAt: data.paidAt } : o))
      )
      toast.success(paymentStatus === "paid" ? "Order marked paid" : "Order marked unpaid")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update payment")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleMarkReady = async (order: Order) => {
    setUpdatingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}/ready`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to mark ready")
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...data.order } : o)))
      if (data.sms?.ok) toast.success(`Ready — texted ${data.sms.to}`)
      else toast.warning(`Marked ready, but the text wasn't sent: ${data.sms?.reason ?? "unknown reason"}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark ready")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCollected = async (order: Order, paymentMethod?: CounterPaymentMethod) => {
    setUpdatingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentMethod ? { paymentMethod } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to record collection")
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...data } : o)))
      toast.success(paymentMethod ? `Collected — paid by ${paymentMethod}` : "Collected")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record collection")
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleSelected = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return
    setBulkApplying(true)
    try {
      const res = await fetch("/api/orders/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selectedIds], status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update orders")
      setOrders((prev) => prev.map((o) => (selectedIds.has(o.id) ? { ...o, status } : o)))
      toast.success(`${data.updated} orders marked ${status}`)
      setSelectedIds(new Set())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed")
    } finally {
      setBulkApplying(false)
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: orders.length,
      unpaid: orders.filter(isAwaitingPayment).length,
      "to collect": orders.filter(isAwaitingCollection).length,
    }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter === "unpaid") {
        if (!isAwaitingPayment(o)) return false
      } else if (statusFilter === "to collect") {
        if (!isAwaitingCollection(o)) return false
      } else if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (!q) return true
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.paymentReference ?? "").toLowerCase().includes(q) ||
        (o.collectionCode ?? "").toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.customerPhone ?? "").toLowerCase().includes(q) ||
        (o.user?.email ?? "").toLowerCase().includes(q)
      )
    })
  }, [orders, statusFilter, search])

  // Today's counter takings — what should be in the till (cash) and on the card machine.
  const counterToday = useMemo(() => {
    const taken = orders.filter(
      (o) => o.fulfillmentMethod === "click_and_collect" && isToday(o.collectedAt) && isToday(o.paidAt)
    )
    const sum = (method: string) => taken.filter((o) => o.paymentMethod === method)
    const cash = sum("cash")
    const card = sum("card")
    return {
      cashTotal: cash.reduce((t, o) => t + o.total, 0),
      cashCount: cash.length,
      cardTotal: card.reduce((t, o) => t + o.total, 0),
      cardCount: card.length,
      waiting: orders.filter(isAwaitingCollection).length,
    }
  }, [orders])

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden pb-28 md:max-w-4xl md:mx-auto md:w-full md:shadow-xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950">
      <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <AppScreenHeader title="Incoming Orders" subtitle="Every order placed, across all retailers" />

      <main className="relative flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* ================= 1. What's Selling (admin-curated) ================= */}
        <AdminTrendingShelf />

        {/* ================= 2. All Orders ================= */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionHeader icon={ClipboardList} title="All Orders" subtitle={loading ? "Loading…" : `${orders.length} on file, across every retailer`} />
            <button
              onClick={() => fetchOrders(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/90 hover:bg-white/15 transition-colors active:scale-[0.97]"
            >
              <RefreshCw className="h-3 w-3" /> Sync
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-blue-100/70" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, ref, collection code…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-blue-100/50 focus:outline-none"
              />
            </div>
          </div>

          {(counterToday.cashCount > 0 || counterToday.cardCount > 0 || counterToday.waiting > 0) && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/10 p-2.5 text-white">
              <div className="rounded-xl bg-white/10 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-blue-100/80"><Banknote className="h-3 w-3" /> Cash today</p>
                <p className="font-mono text-[15px] font-black">£{counterToday.cashTotal.toFixed(2)}</p>
                <p className="text-[10px] text-blue-100/70">{counterToday.cashCount} collection{counterToday.cashCount === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-blue-100/80"><CreditCard className="h-3 w-3" /> Card today</p>
                <p className="font-mono text-[15px] font-black">£{counterToday.cardTotal.toFixed(2)}</p>
                <p className="text-[10px] text-blue-100/70">{counterToday.cardCount} collection{counterToday.cardCount === 1 ? "" : "s"}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter("to collect")}
                className="rounded-xl bg-white/10 px-2.5 py-2 text-left transition-colors hover:bg-white/20"
              >
                <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-blue-100/80"><Store className="h-3 w-3" /> To collect</p>
                <p className="font-mono text-[15px] font-black">{counterToday.waiting}</p>
                <p className="text-[10px] text-blue-100/70">waiting at depot</p>
              </button>
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["all", "to collect", "unpaid", ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  statusFilter === s
                    ? "border-white bg-white text-blue-800 shadow-sm"
                    : "border-white/20 bg-white/5 text-blue-100/80 hover:bg-white/15"
                }`}
              >
                {s} {counts[s] ? `(${counts[s]})` : s === "all" ? "(0)" : ""}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5">
              <span className="text-[11px] font-black text-white">{selectedIds.size} selected</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={bulkApplying}
                    onClick={() => handleBulkStatus(s)}
                    className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[10px] font-bold uppercase tracking-wide text-blue-100/70 hover:text-white">
                Clear
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-white" />
            </div>
          )}

          {error && (
            <div className="unity-card border-red-100 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-800 text-left">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-white to-blue-50/50 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
                <Package className="h-7 w-7 text-blue-400" />
              </div>
              <p className="text-[15px] font-bold text-slate-800">No orders match</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <ul className="space-y-3">
              {filtered.map((order) => {
                const isExpanded = expandedId === order.id
                const isSelected = selectedIds.has(order.id)
                const isPaid = order.paymentStatus === "paid"
                return (
                  <li
                    key={order.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                      isExpanded ? "border-blue-200 shadow-md" : isSelected ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-150 hover:border-blue-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex w-full items-center gap-2 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => toggleSelected(order.id)}
                        aria-label={isSelected ? "Deselect order" : "Select order"}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="flex flex-1 items-center gap-3 py-1.5 text-left focus:outline-none"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-150 bg-gradient-to-br from-slate-50 to-slate-100">
                          {order.items?.[0]?.product ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getProductImageUrl({
                                imageUrl: order.items[0].product.imageUrl,
                                category: order.items[0].product.category ?? "other",
                                id: order.items[0].product.id,
                              })}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-contain p-1"
                              onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg" }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-bold text-slate-800 truncate">
                              {order.customerName || order.user?.name || "Unknown retailer"}
                            </p>
                            <p className="shrink-0 text-[14px] font-black text-slate-900">£{order.total.toFixed(2)}</p>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-500 truncate">{orderBrief(order)}</p>
                          <p className="font-mono text-[10px] font-semibold text-slate-400 truncate">
                            #{order.orderNumber} · {formatDate(order.createdAt)}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {order.fulfillmentMethod === "click_and_collect" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9.5px] font-black uppercase tracking-wider text-blue-700">
                                  <Package className="h-3 w-3" /> Collect
                                </span>
                              )}
                              {isAwaitingPayment(order) && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-red-600">
                                  Unpaid
                                </span>
                              )}
                              <StatusPill status={order.status} />
                          </div>
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3.5 text-left">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                            <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">
                              {order.fulfillmentMethod === "click_and_collect" ? "Click & Collect" : "Deliver to"}
                            </h4>
                            <div className="space-y-1.5 text-[12px]">
                              <p className="font-bold text-slate-800">{order.customerName}</p>
                              {order.customerPhone && (
                                <p className="flex items-center gap-1.5 text-slate-500">
                                  <Phone className="h-3 w-3 shrink-0 text-slate-400" /> {order.customerPhone}
                                </p>
                              )}
                              {order.fulfillmentMethod === "click_and_collect" ? (
                                <p className="flex items-start gap-1.5 text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                                  Collecting from depot — Unit 7 &amp; 8, Vermont Street
                                </p>
                              ) : order.shippingAddress && (
                                <p className="flex items-start gap-1.5 font-mono text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" /> {order.shippingAddress}
                                </p>
                              )}
                              <p className="text-slate-400">Account: {order.user?.email}</p>
                              {order.notes && (
                                <p className="border-t border-slate-100 pt-1.5 italic text-slate-400">"{order.notes}"</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                            <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Items</h4>
                            <div className="divide-y divide-slate-100">
                              {order.items?.map((item) => (
                                <div key={item.id} className="py-1.5 flex items-center justify-between">
                                  <span className="font-semibold text-slate-700 truncate pr-2 text-[12px]">
                                    {item.quantity}x {item.product?.name ?? "Product"}
                                  </span>
                                  <span className="font-mono text-slate-500 shrink-0 text-[12px]">£{item.totalPrice.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Collection: get it ready (texts the retailer), then hand over and take payment */}
                        {order.fulfillmentMethod === "click_and_collect" && order.status !== "cancelled" && (
                          <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Collection</h4>
                              {order.collectionCode && (
                                <span className="font-mono text-[12px] font-black tracking-widest text-slate-700">{order.collectionCode}</span>
                              )}
                            </div>
                            <div className="space-y-0.5 text-[12px]">
                              <p className="font-bold text-slate-800">
                                {order.total <= 0 || isPaid
                                  ? `Paid${order.paymentMethod ? ` · ${paymentMethodLabel(order.paymentMethod)}` : ""}`
                                  : `£${order.total.toFixed(2)} due at the counter${order.paymentMethod ? ` · prefers ${paymentMethodLabel(order.paymentMethod).toLowerCase()}` : ""}`}
                              </p>
                              <p className={`font-semibold ${order.collectedAt ? "text-emerald-600" : order.readyAt ? "text-blue-700" : "text-slate-500"}`}>
                                {order.collectedAt
                                  ? `Collected ${formatDate(order.collectedAt)}`
                                  : order.readyAt
                                    ? `Ready since ${formatDate(order.readyAt)}`
                                    : "Not marked ready yet"}
                              </p>
                              {order.readyNotice && !order.collectedAt && (
                                <p className={`flex items-center gap-1 ${order.readyNotice.startsWith("Texted") ? "text-slate-500" : "text-amber-700"}`}>
                                  <MessageSquare className="h-3 w-3 shrink-0" /> {order.readyNotice}
                                </p>
                              )}
                            </div>
                            {!order.collectedAt && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={updatingId === order.id}
                                  onClick={() => handleMarkReady(order)}
                                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                                    order.readyAt
                                      ? "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                                      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> {order.readyAt ? "Text again" : "Ready — text customer"}
                                </button>
                                {order.total > 0 && !isPaid ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={updatingId === order.id}
                                      onClick={() => handleCollected(order, "cash")}
                                      className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:opacity-40"
                                    >
                                      <Banknote className="h-3.5 w-3.5" /> Collected · cash
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingId === order.id}
                                      onClick={() => handleCollected(order, "card")}
                                      className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:opacity-40"
                                    >
                                      <CreditCard className="h-3.5 w-3.5" /> Collected · card
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={updatingId === order.id}
                                    onClick={() => handleCollected(order)}
                                    className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:opacity-40"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Collected
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment: what's owed, how, and the reference to match on the bank statement */}
                        {order.total > 0 && order.fulfillmentMethod !== "click_and_collect" && (
                          <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                            <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Payment</h4>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 space-y-0.5 text-[12px]">
                                <p className="font-bold text-slate-800">
                                  {paymentMethodLabel(isPaid ? order.paymentMethod : payableMethod(order))} · £{order.total.toFixed(2)}
                                </p>
                                {order.paymentReference && (
                                  <p className="font-mono font-semibold text-slate-500">Ref {order.paymentReference}</p>
                                )}
                                <p className={`font-semibold ${isPaid ? "text-emerald-600" : "text-red-600"}`}>
                                  {isPaid ? `Paid${order.paidAt ? ` ${formatDate(order.paidAt)}` : ""}` : "Awaiting payment"}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleSetPaymentStatus(order.id, isPaid ? "unpaid" : "paid")}
                                className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                                  isPaid
                                    ? "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                                    : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                {isPaid ? "Mark as unpaid" : "Mark as paid"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Admin's extra edit feature: update order status directly */}
                        <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                          <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Update status</h4>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={updatingId === order.id || order.status === s}
                                onClick={() => handleUpdateStatus(order.id, s)}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                                  order.status === s
                                    ? `${STATUS_STYLE[s].bg} ${STATUS_STYLE[s].text}`
                                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                                }`}
                              >
                                {s === "dispatched" && <Truck className="h-3.5 w-3.5" />}
                                {s === "delivered" && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {s === "pending" && <Clock className="h-3.5 w-3.5" />}
                                {s === "cancelled" && <XCircle className="h-3.5 w-3.5" />}
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ================= 3. Bookkeeping Analysis ================= */}
        <section className="space-y-2.5">
          <SectionHeader icon={Wallet} title="Bookkeeping Analysis" subtitle="Revenue across every retailer, last 6 months" />
          <div className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm">
            {!analyticsLoading && !analytics ? (
              <p className="py-6 text-center text-[12px] font-medium text-slate-400">Couldn't load bookkeeping data.</p>
            ) : (
              <BookkeepingSummary
                modalTitle="Bookkeeping Analysis"
                loading={analyticsLoading}
                stats={
                  analytics
                    ? [
                        { label: "6-Month Revenue", value: `£${analytics.windowTotal.toFixed(0)}` },
                        { label: "Avg. Order", value: `£${analytics.averageOrderValue.toFixed(0)}` },
                        { label: "Total Orders", value: `${analytics.totalOrders}` },
                      ]
                    : []
                }
                monthly={analytics?.monthly ?? []}
                breakdowns={
                  analytics
                    ? [
                        { title: "Category", items: analytics.revenueByCategory },
                        { title: "Brand", items: analytics.revenueByBrand },
                        { title: "Retailer", items: analytics.topRetailers },
                      ]
                    : []
                }
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
