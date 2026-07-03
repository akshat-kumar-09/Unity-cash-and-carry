"use client"

import { useState, useEffect, useMemo } from "react"
import { Package, ChevronRight, ChevronDown, Loader2, RefreshCw, Search, Truck, CheckCircle2, Clock, XCircle } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { toast } from "sonner"

type OrderItem = {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    name: string
    brand: string
    sku: string
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
  notes: string | null
  createdAt: string
  user?: { name: string | null; email: string }
  items?: OrderItem[]
}

const STATUS_OPTIONS = ["pending", "confirmed", "dispatched", "delivered", "cancelled"] as const

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-cyan-50 text-cyan-700 border-cyan-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
}

export function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const fetchOrders = async (showToast = false) => {
    try {
      setLoading(true)
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

  useEffect(() => {
    fetchOrders()
  }, [])

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (!q) return true
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.customerPhone ?? "").toLowerCase().includes(q) ||
        (o.user?.email ?? "").toLowerCase().includes(q)
      )
    })
  }, [orders, statusFilter, search])

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
      <AppScreenHeader title="Incoming Orders" subtitle="Every order placed, across all retailers" />

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, retailer name, phone..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm hover:bg-slate-50"
            aria-label="Refresh orders"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                statusFilter === s
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
              }`}
            >
              {s} {counts[s] ? `(${counts[s]})` : s === "all" ? "(0)" : ""}
            </button>
          ))}
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
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">No orders match</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((order) => {
              const isExpanded = expandedId === order.id
              return (
                <li key={order.id} className="unity-card bg-white border border-slate-150 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-mono text-sm font-black text-slate-900 truncate">#{order.orderNumber}</p>
                      <p className="text-[11px] font-semibold text-slate-500 truncate">
                        {order.customerName || order.user?.name || "Unknown"} · {formatDate(order.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          £{order.total.toFixed(2)}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border ${STATUS_STYLE[order.status] ?? STATUS_STYLE.pending}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-450" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-4 text-left">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1 bg-white border border-slate-150 rounded-2xl p-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deliver to</h4>
                          <p className="font-bold text-slate-750">{order.customerName}</p>
                          <p className="text-slate-500">{order.customerPhone}</p>
                          <p className="text-slate-500 font-mono mt-1">{order.shippingAddress}</p>
                          <p className="text-slate-400 mt-1">Account: {order.user?.email}</p>
                          {order.notes && (
                            <p className="text-slate-450 italic mt-1.5 border-t border-slate-100 pt-1.5">Note: "{order.notes}"</p>
                          )}
                        </div>
                        <div className="space-y-1 bg-white border border-slate-150 rounded-2xl p-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Items</h4>
                          <div className="divide-y divide-slate-100">
                            {order.items?.map((item) => (
                              <div key={item.id} className="py-1.5 flex items-center justify-between">
                                <span className="font-semibold text-slate-700 truncate pr-2">
                                  {item.quantity}x {item.product?.name ?? "Product"}
                                </span>
                                <span className="font-mono text-slate-500 shrink-0">£{item.totalPrice.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-150 rounded-2xl p-3.5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Update status</h4>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={updatingId === order.id || order.status === s}
                              onClick={() => handleUpdateStatus(order.id, s)}
                              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                                order.status === s
                                  ? STATUS_STYLE[s]
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
      </main>
    </div>
  )
}
