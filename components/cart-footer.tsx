"use client"

import { useState } from "react"
import { Package, Truck, X, Trash2, CheckCircle, Minus, Plus, ArrowLeft } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useSession } from "next-auth/react"

type CheckoutFormData = {
  customerPhone: string
  shippingAddress: string
  notes: string
}

const initialForm: CheckoutFormData = {
  customerPhone: "",
  shippingAddress: "",
  notes: "",
}

export function CartFooter() {
  const {
    items,
    totalItems,
    subtotal,
    vat,
    total,
    removeItem,
    addItem,
    clearCart,
    isCartOpen,
    openCart,
    closeCart,
  } = useCart()
  const { data: session } = useSession()
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [formData, setFormData] = useState<CheckoutFormData>(initialForm)
  const [formError, setFormError] = useState("")

  if (totalItems === 0 && !isCartOpen) return null

  const handlePlaceOrderClick = () => {
    if (!session) {
      alert("Please sign in to place an order.")
      return
    }
    setShowCheckoutForm(true)
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    const { customerPhone, shippingAddress, notes } = formData
    if (!customerPhone.trim() || !shippingAddress.trim()) {
      setFormError("Please fill in shipping address and phone.")
      return
    }

    try {
      const orderData = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim() || undefined,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Failed to place order")
      }

      setOrderPlaced(true)
      setTimeout(() => {
        clearCart()
        closeCart()
        setShowCheckoutForm(false)
        setOrderPlaced(false)
        setFormData(initialForm)
      }, 2500)
    } catch (error) {
      console.error("Error placing order:", error)
      setOrderPlaced(false)
      setFormError(error instanceof Error ? error.message : "Failed to place order. Please try again.")
    }
  }

  const handleBackFromCheckout = () => {
    setShowCheckoutForm(false)
    setFormError("")
  }

  return (
    <>
      {/* Sticky Footer Bar — only when cart has items */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-700 border-t-2 border-blue-800/50 shadow-lg pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={openCart}
            className="w-full px-4 py-3 flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white flex items-center justify-center rounded">
                <Package className="w-4 h-4 text-blue-700" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-blue-100 font-mono uppercase">
                  {totalItems} {totalItems === 1 ? "case" : "cases"}
                </p>
                <p className="text-sm font-bold text-white font-mono">
                  {"£"}
                  {total.toFixed(2)}
                  {" inc. VAT"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              View Order
            </span>
          </button>
        </div>
      )}

      {/* Full-screen Cart Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-700 border-b border-blue-800/50 text-white">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Your Order
              </h2>
              <p className="text-[10px] text-blue-100 font-mono uppercase">
                {totalItems} {totalItems === 1 ? "case" : "cases"} total
              </p>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="w-8 h-8 flex items-center justify-center text-blue-100 hover:text-white"
              aria-label="Close order"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {orderPlaced ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="w-16 h-16 bg-blue-600 flex items-center justify-center mb-4 rounded-full shadow-lg shadow-blue-600/30">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                Order Placed
              </h3>
              <p className="text-sm text-slate-600 mt-2 text-center">
                Your order has been confirmed. Estimated dispatch under 24
                hours.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <span className="w-6 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
                <span className="w-2 h-2 rounded-full bg-blue-500/40" />
                <span className="w-6 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              </div>
            </div>
          ) : showCheckoutForm ? (
            /* Checkout Form */
            <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <button
                  type="button"
                  onClick={handleBackFromCheckout}
                  className="flex items-center gap-2 text-sm text-blue-700 font-bold uppercase tracking-wider hover:text-blue-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to order
                </button>
                {session?.user && (
                  <div className="px-3 py-2 bg-slate-100 rounded text-sm text-slate-600">
                    <span className="font-bold">{session.user.name || "Account"}</span>
                    <span className="mx-1">•</span>
                    <span>{session.user.email}</span>
                  </div>
                )}
                <div>
                  <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Phone *
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="07XXX XXXXXX"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="shippingAddress" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Shipping address *
                  </label>
                  <textarea
                    id="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={(e) => setFormData((p) => ({ ...p, shippingAddress: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Full address for delivery"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Delivery instructions, etc."
                  />
                </div>
                {formError && (
                  <p className="text-sm text-red-600 font-medium">{formError}</p>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <button
                  type="submit"
                  disabled={orderPlaced}
                  className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded disabled:opacity-50"
                >
                  {orderPlaced ? "Placing..." : "Confirm Order"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Package className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm">No items in your order</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 bg-white">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="px-4 py-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-blue-700 font-bold font-mono uppercase">
                            {item.product.brand}
                          </p>
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.product.packLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            className="w-9 h-9 bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors rounded"
                            aria-label={`Remove one ${item.product.name}`}
                          >
                            <Minus className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <span className="w-9 text-center font-mono font-bold text-slate-800 text-lg">
                            {item.quantity}
                          </span>
            <button
              type="button"
              onClick={() => addItem(item.product)}
              className="w-9 h-9 bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors rounded"
                            aria-label={`Add one more ${item.product.name}`}
                          >
                            <Plus className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </div>
                        <p className="w-16 text-right text-sm font-bold font-mono text-slate-800">
                          {"£"}
                          {(item.product.casePrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {items.length > 0 && (
                <div className="border-t border-slate-200 bg-white">
                  {/* Dispatch Notice */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-slate-100">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                      Fast UK Tracked Postage | Dispatched within 24hrs
                    </span>
                  </div>

                  {/* VAT Breakdown */}
                  <div className="px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 uppercase font-mono">
                        Subtotal (ex. VAT)
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-800">
                        {"£"}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 uppercase font-mono">
                        VAT (20%)
                      </span>
                      <span className="text-sm font-mono text-slate-700">
                        {"£"}
                        {vat.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-sm font-bold text-slate-800 uppercase">
                        Total
                      </span>
                      <span className="text-xl font-bold font-mono text-blue-700">
                        {"£"}
                        {total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handlePlaceOrderClick}
                      className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
                    >
                      Place Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart()
                        closeCart()
                      }}
                      className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Order
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
