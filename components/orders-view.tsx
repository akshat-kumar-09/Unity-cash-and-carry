"use client"

import { useState, useEffect } from "react"
import { Package, ChevronRight, ChevronDown, Loader2, RefreshCw, Printer, ArrowRightLeft, FileText, X } from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"
import { useCart } from "@/lib/cart-context"
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
  items?: OrderItem[]
}

export function OrdersView() {
  const { addItems, openCart } = useCart()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI States
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)

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
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl bg-slate-50/50">
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

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-end">
          <button 
            onClick={() => { setLoading(true); fetchOrders(true); }}
            className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Sync History
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        )}
        
        {error && (
          <div className="unity-card border-red-100 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-800 text-left">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Package className="h-7 w-7 text-slate-400" />
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
              return (
                <li key={order.id} className="unity-card bg-white border border-slate-150 overflow-hidden transition-all">
                  {/* Summary Card Header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="flex w-full items-center justify-between px-4 py-4.5 text-left bg-white focus:outline-none"
                  >
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-black text-slate-900">
                        #{order.orderNumber}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          £{order.total.toFixed(2)} inc. VAT
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded ${
                          order.status === "delivered" ? "bg-emerald-50 text-emerald-700" :
                          order.status === "dispatched" ? "bg-blue-50 text-blue-700" :
                          order.status === "cancelled" ? "bg-slate-150 text-slate-500" :
                          "bg-amber-50 text-amber-700"
                        }`}>
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

                  {/* Expanded Order Items Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-4 text-left">
                      {/* Products List */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items in Order</h4>
                        <div className="divide-y divide-slate-100 bg-white border border-slate-150 rounded-2xl overflow-hidden">
                          {order.items?.map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-slate-800">{item.product?.name || "Product details unavailable"}</p>
                                <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                                  {item.product?.brand} · SKU: {item.product?.sku}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-slate-700">{item.quantity} case(s)</p>
                                <p className="text-[10px] text-slate-450 font-semibold mt-0.5">£{(item.unitPrice).toFixed(2)}/case</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Calculations breakdown */}
                      <div className="grid md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-white border border-slate-150 rounded-2xl p-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Shipping Details</h4>
                          <p className="font-bold text-slate-750">{order.customerName}</p>
                          <p className="text-slate-500 mt-0.5">{order.customerPhone}</p>
                          <p className="text-slate-500 font-mono mt-1">{order.shippingAddress}</p>
                          {order.notes && (
                            <p className="text-slate-450 italic mt-1.5 border-t border-slate-100 pt-1.5">
                              Note: "{order.notes}"
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 bg-white border border-slate-150 rounded-2xl p-3.5 font-semibold text-slate-500">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Summary</h4>
                          <div className="flex justify-between">
                            <span>Subtotal (ex. VAT)</span>
                            <span className="font-mono font-bold text-slate-800">£{order.subtotal.toFixed(2)}</span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Discount Applied ({order.promoCode})</span>
                              <span className="font-mono font-bold">-£{order.discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>VAT (20%)</span>
                            <span className="font-mono">£{order.vat.toFixed(2)}</span>
                          </div>
                          {order.walletCreditsUsed > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Wallet Credits Used</span>
                              <span className="font-mono font-bold">-£{order.walletCreditsUsed.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1.5 border-t border-slate-100 text-slate-900 font-bold">
                            <span>Grand Total Paid</span>
                            <span className="font-mono text-sm text-blue-600">£{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                          onClick={() => handleQuickReorder(order)}
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all active:scale-97 shadow"
                        >
                          <ArrowRightLeft className="h-4 w-4" /> Quick Reorder
                        </button>
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all active:scale-97"
                        >
                          <FileText className="h-4 w-4 text-blue-600" /> View VAT Invoice
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

      {/* Invoice Generator Modal */}
      {invoiceOrder && (
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
        </div>
      )}
    </div>
  )
}
