"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Package, ChevronDown, Loader2, RefreshCw, Printer, ArrowRightLeft, FileText, X, MapPin, Phone, Truck, CheckCircle2, Clock, XCircle } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { useCart } from "@/lib/cart-context"
import { useBackHandler } from "@/lib/use-back-handler"
import { toast } from "sonner"

type OrderItem = {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    id: string
    name: string
    brand: string
    sku: string
    packLabel: string
    casePrice: number
    unitsPerPack: number
  }
}

type Order = {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  vat: number
  total: number
  promoCode: string | null
  discountAmount: number
  walletCreditsUsed: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  shippingAddress: string | null
  notes: string | null
  createdAt: string
  paymentStatus: string
  items?: OrderItem[]
}

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; dot: string; icon: typeof Clock; accent: string; card: string }
> = {
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500", icon: Clock, accent: "border-l-amber-400", card: "from-white to-amber-50/60" },
  confirmed: { bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500", icon: CheckCircle2, accent: "border-l-cyan-400", card: "from-white to-cyan-50/60" },
  dispatched: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500", icon: Truck, accent: "border-l-blue-400", card: "from-white to-blue-50/70" },
  delivered: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2, accent: "border-l-emerald-400", card: "from-white to-emerald-50/60" },
  cancelled: { bg: "bg-slate-100 border-slate-200", text: "text-slate-500", dot: "bg-slate-400", icon: XCircle, accent: "border-l-slate-300", card: "from-white to-slate-100/70" },
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

/** Short "what was bought" summary for the card header — replaces the raw order
 *  reference as the primary label, which read as clutter rather than useful info. */
function orderBrief(order: Order): string {
  const names = (order.items ?? []).map((i) => i.product?.name).filter((n): n is string => Boolean(n))
  if (names.length === 0) return "Order details unavailable"
  if (names.length <= 2) return names.join(", ")
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`
}

export function OrdersView() {
  const { addItems, openCart } = useCart()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI States
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  useBackHandler(invoiceOrder !== null, () => setInvoiceOrder(null))

  const handlePayNow = async (order: Order) => {
    setPayingOrderId(order.id)
    try {
      const res = await fetch("/api/payments/viva/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start payment")
      window.location.href = data.checkoutUrl
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment")
      setPayingOrderId(null)
    }
  }

  const fetchOrders = async (showToast = false) => {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to load orders")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
      if (showToast) {
        toast.success("Order list updated")
      }
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
      const d = new Date(dateStr)
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return dateStr
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  const handleQuickReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      toast.error("No items found in this order history")
      return
    }

    // Map order items to cart product items
    const itemsToAdd = order.items
      .filter((item) => item.product)
      .map((item) => ({
        product: {
          id: item.product!.id,
          name: item.product!.name,
          brand: item.product!.brand,
          sku: item.product!.sku,
          packLabel: item.product!.packLabel,
          casePrice: item.product!.casePrice,
          unitsPerPack: item.product!.unitsPerPack,
        } as any,
        quantity: item.quantity,
      }))

    if (itemsToAdd.length === 0) {
      toast.error("The products from this order are no longer active")
      return
    }

    addItems(itemsToAdd)
    openCart()
    toast.success("Reordered items appended to your shopping cart!")
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden pb-28 md:max-w-4xl md:mx-auto md:w-full md:shadow-xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950">
      {/* White design bits — soft decorative shapes on the blue page */}
      <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <AppScreenHeader title="Orders" subtitle="Your order history and status" />

      {/* Print Overlay CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Premium summary band — frosted glass panel, the page itself is already blue */}
      {!loading && !error && (
        <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white shadow-lg backdrop-blur-md">
          <p className="text-[9.5px] font-black uppercase tracking-[0.25em] text-blue-100/80">
            Order History
          </p>
          <div className="mt-2">
            <p className="text-[26px] font-black leading-none">{orders.length}</p>
            <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-blue-100/70">
              {orders.length === 1 ? "Order placed" : "Orders placed"}
            </p>
          </div>
        </div>
      )}

      <main className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-blue-100/80 uppercase tracking-wider">
            {loading ? "Loading…" : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          </p>
          <button
            onClick={() => { setLoading(true); fetchOrders(true); }}
            className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white hover:bg-white/20 uppercase tracking-widest transition-all active:scale-[0.97]"
          >
            <RefreshCw className="h-3 w-3" /> Sync
          </button>
        </div>

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

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-white to-blue-50/50 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
              <Package className="h-7 w-7 text-blue-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">No orders placed yet</p>
            <p className="unity-meta mt-1 max-w-[240px]">
              Orders you submit from the Shop tab will appear in this history list.
            </p>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <ul className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id
              const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
              return (
                <li
                  key={order.id}
                  className={`overflow-hidden rounded-2xl border border-l-4 bg-gradient-to-br shadow-sm transition-all ${s.card} ${s.accent} ${
                    isExpanded ? "border-blue-300 shadow-md ring-1 ring-blue-100" : "border-slate-150 hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  {/* Summary Card Header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left focus:outline-none"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.bg} border shadow-sm`}>
                      <Package className={`h-5 w-5 ${s.text}`} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-bold text-slate-800 truncate">
                          {orderBrief(order)}
                        </p>
                        <p className="shrink-0 font-mono text-[15px] font-black text-blue-700">
                          £{order.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] font-semibold text-slate-400 truncate">
                          #{order.orderNumber} · {formatDate(order.createdAt)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {order.paymentStatus === "unpaid" && order.total > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-red-600">
                              Unpaid
                            </span>
                          )}
                          <StatusPill status={order.status} />
                        </div>
                      </div>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-350 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded Order Items Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3.5 text-left">
                      {/* Products List */}
                      <div className="space-y-1.5">
                        <h4 className="px-0.5 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Items</h4>
                        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-150 bg-white overflow-hidden">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-bold text-slate-800 truncate">{item.product?.name || "Product details unavailable"}</p>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                  {item.product?.brand} · {item.product?.sku}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[12.5px] font-bold text-slate-700">{item.quantity} case{item.quantity === 1 ? "" : "s"}</p>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">£{item.unitPrice.toFixed(2)}/case</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping + Payment */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                          <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Delivery</h4>
                          <div className="space-y-1.5 text-[12px]">
                            <p className="font-bold text-slate-800">{order.customerName}</p>
                            {order.customerPhone && (
                              <p className="flex items-center gap-1.5 text-slate-500">
                                <Phone className="h-3 w-3 shrink-0 text-slate-350" /> {order.customerPhone}
                              </p>
                            )}
                            {order.shippingAddress && (
                              <p className="flex items-start gap-1.5 font-mono text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-slate-350" /> {order.shippingAddress}
                              </p>
                            )}
                            {order.notes && (
                              <p className="border-t border-slate-100 pt-1.5 italic text-slate-400">
                                "{order.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-150 bg-white p-3.5">
                          <h4 className="mb-2 text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Payment Summary</h4>
                          <div className="space-y-1.5 text-[12px] font-semibold text-slate-500">
                            <div className="flex justify-between">
                              <span>Subtotal (ex. VAT)</span>
                              <span className="font-mono font-bold text-slate-800">£{order.subtotal.toFixed(2)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span>Discount ({order.promoCode})</span>
                                <span className="font-mono font-bold">-£{order.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>VAT</span>
                              <span className="font-mono">£{order.vat.toFixed(2)}</span>
                            </div>
                            {order.walletCreditsUsed > 0 && (
                              <div className="flex justify-between text-blue-600">
                                <span>Wallet Credits</span>
                                <span className="font-mono font-bold">-£{order.walletCreditsUsed.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900">
                              <span>Total</span>
                              <span className="font-mono text-blue-600">£{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                        {order.paymentStatus === "unpaid" && order.total > 0 && (
                          <button
                            onClick={() => handlePayNow(order)}
                            disabled={payingOrderId === order.id}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                          >
                            {payingOrderId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Pay £{order.total.toFixed(2)} Now</>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleQuickReorder(order)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98]"
                        >
                          <ArrowRightLeft className="h-4 w-4" /> Quick Reorder
                        </button>
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
                        >
                          <FileText className="h-4 w-4 text-blue-600" /> VAT Invoice
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

      {/* Invoice Generator Modal — portaled so it isn't trapped by any transformed ancestor */}
      {invoiceOrder && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-150">
            {/* Modal actions header */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">VAT Trade Invoice</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow shadow-blue-600/10"
                >
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setInvoiceOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-550 p-2.5 rounded-xl transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Print Area Content */}
            <div className="print-area text-left space-y-6 text-slate-800 text-sm font-sans">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">UNITY CASH & CARRY</h1>
                  <p className="text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase">PARTNERS IN PROFIT</p>
                  <div className="text-xs text-slate-500 leading-relaxed pt-1.5 font-medium">
                    <p>Unit 7/8, 85–87 Vermont Street</p>
                    <p>Glasgow, G41 1LU</p>
                    <p>Email: info.unitycashandcarry@gmail.com</p>
                    <p className="font-semibold text-slate-700">VAT Registration: GB 482 1293 88</p>
                  </div>
                </div>
                <div className="text-left sm:text-right space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 uppercase">INVOICE</h2>
                  <p className="font-mono font-bold text-slate-700">#{invoiceOrder.orderNumber}</p>
                  <p className="text-xs text-slate-500">Date: {formatDate(invoiceOrder.createdAt)}</p>
                  <p className="text-xs text-slate-500">Payment Status: <span className="font-bold text-slate-700 uppercase">{invoiceOrder.status}</span></p>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Addresses section */}
              <div className="grid sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Wholesaler (Issuer)</span>
                  <p className="font-bold text-slate-800">Unity Cash & Carry Ltd</p>
                  <p className="text-slate-500">Vermont Street, Glasgow</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bill To (Trader Partner)</span>
                  <p className="font-bold text-slate-800">{invoiceOrder.customerName}</p>
                  <p className="text-slate-500">Phone: {invoiceOrder.customerPhone}</p>
                  <p className="font-mono text-slate-500">{invoiceOrder.shippingAddress}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-3 pl-4">Brand / Product Description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Case RRP</th>
                      <th className="p-3 text-right pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {invoiceOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 pl-4">
                          <p className="font-bold text-slate-800">{item.product?.name}</p>
                          <span className="text-[9px] font-mono text-slate-450 block mt-0.5">SKU: {item.product?.sku}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">{item.quantity}</td>
                        <td className="p-3 text-right font-mono text-slate-500">£{item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800 pr-4">£{item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculations */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between">
                    <span>Subtotal (ex. VAT)</span>
                    <span className="font-mono font-bold text-slate-800">£{invoiceOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {invoiceOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Promo Discount ({invoiceOrder.promoCode})</span>
                      <span className="font-mono font-bold">-£{invoiceOrder.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>VAT (20%)</span>
                    <span className="font-mono">£{invoiceOrder.vat.toFixed(2)}</span>
                  </div>
                  {invoiceOrder.walletCreditsUsed > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Wallet Credits Deducted</span>
                      <span className="font-mono font-bold">-£{invoiceOrder.walletCreditsUsed.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-900 font-bold">
                    <span>Total Paid</span>
                    <span className="font-mono text-sm text-blue-650">£{invoiceOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 pt-2"></div>

              {/* Legal Notice */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Thank you for sourcing with Unity Cash & Carry. This trade document acts as an official VAT commercial invoice for tax purposes. For questions or logistics claims, reach out to Glasgow account support.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
