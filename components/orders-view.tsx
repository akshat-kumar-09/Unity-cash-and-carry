"use client"

import { useState, useEffect } from "react"
import { Package, ChevronRight, Loader2 } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type OrderItem = {
  id: string
  productId: string
  quantity: number
  product?: { name: string; brand: string }
}

type Order = {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items?: OrderItem[]
}

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders")
        if (!res.ok) throw new Error("Failed to load orders")
        const data = await res.json()
        if (!cancelled) setOrders(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOrders()
    return () => {
      cancelled = true
    }
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl">
      <AppScreenHeader title="Orders" subtitle="Your order history and status" />
      <main className="flex-1 overflow-y-auto px-4 py-4">
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
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-[15px] font-semibold text-slate-800">No orders yet</p>
            <p className="unity-meta mt-1 max-w-[240px]">
              Orders you place from the Shop tab will appear here.
            </p>
          </div>
        )}
        {!loading && !error && orders.length > 0 && (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  className="unity-tap unity-card flex w-full items-center justify-between px-4 py-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div>
                    <p className="font-mono text-[15px] font-bold text-slate-900">
                      #{order.orderNumber}
                    </p>
                    <p className="unity-meta mt-0.5">{formatDate(order.createdAt)}</p>
                    <p className="mt-1.5 text-[14px] font-semibold text-slate-700">
                      £{Number(order.total).toFixed(2)}{" "}
                      <span className="font-normal text-slate-500">· {order.status}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
