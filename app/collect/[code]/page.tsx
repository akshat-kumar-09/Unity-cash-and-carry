"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Banknote, CheckCircle2, CreditCard, Loader2, Store, XCircle } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"
import { paymentMethodLabel, type CounterPaymentMethod } from "@/lib/payment"

type CollectOrder = {
  id: string
  orderNumber: string
  status: string
  total: number
  paymentStatus: string
  paymentMethod: string | null
  collectionCode: string
  readyAt: string | null
  collectedAt: string | null
  customerName: string | null
  user: { name: string | null; email: string; companyName: string | null }
  items: { id: string; quantity: number; product: { name: string; brand: string } | null }[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Counter handover, opened by scanning a retailer's collection pass with a staff phone.
 *  Shows what to hand over and what to take, then records it in one tap. */
export default function CollectPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [order, setOrder] = useState<CollectOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin"

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?callbackUrl=${encodeURIComponent(`/collect/${code}`)}`)
  }, [status, router, code])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/collect/${encodeURIComponent(code)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Couldn't find that order")
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find that order")
    }
  }, [code])

  useEffect(() => {
    if (status === "authenticated" && isAdmin) void load()
  }, [status, isAdmin, load])

  const handOver = async (paymentMethod?: CounterPaymentMethod) => {
    if (!order) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentMethod ? { paymentMethod } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) throw new Error(data.error || "Couldn't record the collection")
      setOrder((o) => (o ? { ...o, ...(res.status === 409 ? data.order : data) } : o))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record the collection")
    } finally {
      setSaving(false)
    }
  }

  const owes = order ? order.paymentStatus !== "paid" && order.total > 0 : false
  const retailer = order ? order.user.companyName || order.customerName || order.user.name || order.user.email : ""

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50">
      <header className="flex items-center gap-3 bg-blue-700 px-4 py-3 text-white">
        <div className="rounded-xl bg-white p-1">
          <UnityLogo size={28} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">Counter handover</p>
          <p className="font-mono text-lg font-black tracking-[0.12em]">{String(code).toUpperCase()}</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">
        {status === "authenticated" && !isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">This screen is for Unity depot staff.</p>
            <p className="mt-1 text-[13px] text-slate-500">Show your collection pass at the counter and we&apos;ll scan it.</p>
          </div>
        )}

        {isAdmin && !order && !error && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-medium text-red-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {order && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retailer</p>
              <p className="text-[17px] font-bold text-slate-900">{retailer}</p>
              <p className="font-mono text-[11px] text-slate-400">#{order.orderNumber}</p>
              <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0 truncate font-semibold text-slate-700">{item.product?.name ?? "Product"}</span>
                    <span className="shrink-0 font-mono font-bold text-slate-900">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.collectedAt ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="text-lg font-black uppercase tracking-wider text-emerald-800">Handed over</p>
                <p className="text-[13px] text-emerald-800/80">
                  {formatTime(order.collectedAt)}
                  {order.paymentMethod ? ` · ${paymentMethodLabel(order.paymentMethod)}` : ""}
                </p>
              </div>
            ) : order.status === "cancelled" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-600">
                This order was cancelled — don&apos;t hand it over.
              </div>
            ) : (
              <>
                <div className={`rounded-2xl p-4 text-center ${owes ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${owes ? "text-amber-700" : "text-emerald-700"}`}>
                    {owes ? "Take payment" : "Already paid"}
                  </p>
                  <p className={`font-mono text-3xl font-black ${owes ? "text-amber-900" : "text-emerald-800"}`}>
                    £{order.total.toFixed(2)}
                  </p>
                  {owes && order.paymentMethod && (
                    <p className="text-[12px] text-amber-800/80">They chose {paymentMethodLabel(order.paymentMethod).toLowerCase()}</p>
                  )}
                  {!order.readyAt && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-[12px] text-slate-500">
                      <Store className="h-3.5 w-3.5" /> Not marked ready yet — check it&apos;s been picked
                    </p>
                  )}
                </div>

                {owes ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handOver("cash")}
                      className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-600 py-5 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Banknote className="h-6 w-6" />
                      <span className="text-sm font-black uppercase tracking-wider">Paid cash</span>
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handOver("card")}
                      className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-600 py-5 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm font-black uppercase tracking-wider">Paid card</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handOver()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-5 w-5" /> Hand over
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Back to the app
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
