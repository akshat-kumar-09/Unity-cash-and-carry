"use client"

import { useState, useEffect } from "react"
import { Package, Truck, Store, X, Trash2, CheckCircle, Minus, Plus, ArrowLeft, TrendingUp, Landmark, Banknote, CreditCard } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useSession } from "next-auth/react"
import { getEffectiveMaxQtyPerOrder } from "@/lib/products"
import { useBackHandler } from "@/lib/use-back-handler"
import { usePulseOnCartAdded } from "@/lib/cart-feedback"
import { UNITY_BUSINESS, VPD_EFFECTIVE_DATE } from "@/lib/unity-business"
import { defaultPaymentMethod, isPaymentMethodAllowed, payableMethod, type PaymentMethod } from "@/lib/payment"
import { PaymentInstructions } from "@/components/payment-instructions"
import { CollectionPass } from "@/components/collection-pass"
import { useShopStaging } from "@/lib/shop-staging"
import { useFloatingBarPresence } from "@/lib/floating-ui"

type FulfillmentMethod = "delivery" | "click_and_collect"

type CheckoutFormData = {
  fulfillmentMethod: FulfillmentMethod
  /** Delivery is paid by bank transfer; click & collect by cash or card at the counter. */
  paymentMethod: PaymentMethod
  customerPhone: string
  shippingAddress: string
  notes: string
  rememberDetails: boolean
}

/** What /api/account/checkout-details returns — details remembered from a past checkout. */
type SavedCheckoutDetails = {
  phone: string | null
  address: string | null
  fulfillmentMethod: string | null
  paymentMethod: string | null
}

const initialForm: CheckoutFormData = {
  fulfillmentMethod: "delivery",
  paymentMethod: "bank_transfer",
  customerPhone: "",
  shippingAddress: "",
  notes: "",
  rememberDetails: true,
}

/** The form a returning retailer starts from: their remembered details, else blank. */
function prefilledForm(saved: SavedCheckoutDetails | null): CheckoutFormData {
  if (!saved) return initialForm
  const fulfillmentMethod: FulfillmentMethod =
    saved.fulfillmentMethod === "click_and_collect" ? "click_and_collect" : "delivery"
  const paymentMethod =
    saved.paymentMethod && isPaymentMethodAllowed(saved.paymentMethod, fulfillmentMethod)
      ? (saved.paymentMethod as PaymentMethod)
      : defaultPaymentMethod(fulfillmentMethod)
  return {
    ...initialForm,
    fulfillmentMethod,
    paymentMethod,
    customerPhone: saved.phone ?? "",
    shippingAddress: saved.address ?? "",
  }
}

/** The parts of a just-placed order the confirmation screen needs. */
type PlacedOrder = {
  orderNumber: string
  total: number
  paymentStatus: string
  paymentMethod: string | null
  paymentReference: string | null
  fulfillmentMethod: string
  customerPhone: string | null
  collectionCode: string | null
}

/** Real margin math for one cart line — null when the product has no admin-set retail
 *  price yet (honest-pending: never guesses a resale price). Wholesale cost uses the
 *  actual case price paid; retail value is the suggested per-unit resale price times
 *  every individual unit in the cases ordered. */
function computeLineMargin(item: { product: { casePrice: number; unitsPerPack: number; retailPriceUnit?: number | null }; quantity: number }) {
  const rrp = item.product.retailPriceUnit
  if (!rrp || rrp <= 0) return null
  const totalUnits = item.quantity * item.product.unitsPerPack
  const wholesaleCost = item.product.casePrice * item.quantity
  const retailValue = rrp * totalUnits
  const profit = retailValue - wholesaleCost
  const marginPct = retailValue > 0 ? (profit / retailValue) * 100 : 0
  return { totalUnits, wholesaleCost, retailValue, profit, marginPct }
}

/** Shown once an order exists: confirms it and, if there's a balance, says how to pay it. */
function OrderPlacedPanel({ order, onDone }: { order: PlacedOrder; onDone: () => void }) {
  const isCollect = order.fulfillmentMethod === "click_and_collect"
  const isPaid = order.paymentStatus === "paid"
  const method = payableMethod(order)

  const textTo = order.customerPhone ? ` on ${order.customerPhone}` : ""
  let message: string
  if (isCollect) {
    message = `Your order is in. We'll text you${textTo} the moment it's ready to collect.`
  } else if (isPaid) {
    message = "Your order has been confirmed. Estimated dispatch under 24 hours."
  } else {
    message = "Your order is in. Pay by bank transfer and we'll dispatch within 24 hours of receiving it."
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-600 flex items-center justify-center mb-4 rounded-full shadow-lg shadow-blue-600/30">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Order Placed</h3>
          <p className="mt-1 font-mono text-[11px] font-semibold text-slate-400">#{order.orderNumber}</p>
          <p className="text-sm text-slate-600 mt-2">{message}</p>
        </div>

        {!isPaid && method === "bank_transfer" && order.paymentReference && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <PaymentInstructions amount={order.total} reference={order.paymentReference} />
          </div>
        )}

        {isCollect && order.collectionCode && (
          <div className="mt-5">
            <CollectionPass code={order.collectionCode} amountDue={isPaid ? 0 : order.total} />
          </div>
        )}

        {(!isPaid || isCollect) && (
          <p className="mt-3 text-center text-[11px] text-slate-500">
            {method === "counter" ? "Your collection pass is also under Orders." : "You can find these details again under Orders."}
          </p>
        )}
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
        >
          Done
        </button>
      </div>
    </div>
  )
}

export function CartFooter({ showBar = true }: { showBar?: boolean }) {
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
  const cartPulsing = usePulseOnCartAdded()
  // While picks are staged, the shop's "Add N items" bar owns the bottom slot.
  const { totalItems: stagedItems, justAdded: stagingJustAdded } = useShopStaging()
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CheckoutFormData>(initialForm)
  const [formError, setFormError] = useState("")
  const [savedDetails, setSavedDetails] = useState<SavedCheckoutDetails | null>(null)

  // Back button: closes the cart/checkout sheet instead of leaving the app (no history
  // entry otherwise). Deliberately ONE combined boolean, not two nested ones keyed off
  // showCheckoutForm — two independent hooks here caused a real bug: opening the
  // checkout form flips a "isCartOpen && !showCheckoutForm" condition to false as a
  // side effect, which the hook can't tell apart from an actual close, so it fired a
  // spurious history.back() that closed the form the instant it opened.
  //
  // Closing after an order was placed also resets the sheet, so the confirmation
  // doesn't reappear the next time the cart is opened.
  const handleCloseSheet = () => {
    closeCart()
    if (placedOrder) {
      setPlacedOrder(null)
      setShowCheckoutForm(false)
    }
  }
  useBackHandler(isCartOpen, handleCloseSheet)

  // Wallet and Promo states
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWalletCredits, setUseWalletCredits] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [promoError, setPromoError] = useState("")

  // Fetch wallet balance and any remembered checkout details when the cart opens, so the
  // checkout form is already filled in by the time "Place Order" is tapped.
  useEffect(() => {
    if (isCartOpen && session) {
      fetch("/api/wallet")
        .then((res) => res.json())
        .then((data) => setWalletBalance(data.balance))
        .catch((err) => console.error("Error loading wallet balance for cart:", err))
      fetch("/api/account/checkout-details")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSavedDetails(data))
        .catch(() => setSavedDetails(null))
    }
  }, [isCartOpen, session])

  const handleApplyPromo = async () => {
    setPromoError("")
    if (!promoCodeInput.trim()) return

    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          subtotal,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Invalid promo code")
      }
      setAppliedPromo(data)
      setPromoCodeInput("")
    } catch (err: any) {
      setPromoError(err.message)
      setAppliedPromo(null)
    }
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoError("")
  }

  // Calculate totals
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0
  const updatedSubtotal = Math.max(0, subtotal - discountAmount)
  
  // Calculate live Vape Product Duty (VPD) — mirrors the order-creation gate in
  // app/api/orders/route.ts: the duty isn't law until 1 Oct 2026, so the cart total
  // shown pre-checkout must match what checkout will actually charge.
  const vpdIsLive = new Date() >= VPD_EFFECTIVE_DATE
  const vapeDutyAmount = items.reduce((acc, item) => {
    if (vpdIsLive && item.product.isSubjectToVapeDuty) {
      const vol = item.product.liquidVolumeMl ?? 2.0
      return acc + item.quantity * item.product.unitsPerPack * vol * 0.22
    }
    return acc
  }, 0)
  const roundedVapeDuty = Math.round(vapeDutyAmount * 100) / 100

  // Calculate total e-liquid volume (ml)
  const totalLiquidVolumeMl = items.reduce((acc, item) => {
    if (item.product.isSubjectToVapeDuty) {
      const vol = item.product.liquidVolumeMl ?? 2.0
      return acc + item.quantity * item.product.unitsPerPack * vol
    }
    return acc
  }, 0)

  // Pre-Oct-1 FOMO nudge: shown whenever the cart has liquid subject to future duty,
  // so retailers see the real coming cost increase without it silently inflating today's total.
  const projectedDutyPreview = Math.round(totalLiquidVolumeMl * 0.22 * 100) / 100

  const updatedVat = Math.round((updatedSubtotal + roundedVapeDuty) * 0.2 * 100) / 100
  const preWalletTotal = Math.round((updatedSubtotal + roundedVapeDuty + updatedVat) * 100) / 100

  // Aggregate margin projection — only counts lines where admin has actually set a
  // retail price, so this never includes a guessed number.
  const marginTotals = items.reduce(
    (acc, item) => {
      const m = computeLineMargin(item)
      if (!m) return acc
      acc.wholesaleCost += m.wholesaleCost
      acc.retailValue += m.retailValue
      acc.profit += m.profit
      acc.linesWithData += 1
      return acc
    },
    { wholesaleCost: 0, retailValue: 0, profit: 0, linesWithData: 0 }
  )
  const marginPct = marginTotals.retailValue > 0 ? (marginTotals.profit / marginTotals.retailValue) * 100 : 0
  const creditsToUse = useWalletCredits ? Math.min(walletBalance, preWalletTotal) : 0
  const finalTotal = Math.round((preWalletTotal - creditsToUse) * 100) / 100

  // Gift items (e.g. the welcome-build pack) shouldn't pop the sticky bar on their own —
  // it should only appear once the retailer has actually added a real product. The gift
  // still shows normally inside the full cart drawer once opened.
  const hasRealItems = items.some((i) => !i.product.isGiftItem)
  const barVisible = hasRealItems && showBar && stagedItems === 0 && !stagingJustAdded
  useFloatingBarPresence(barVisible)

  if (totalItems === 0 && !isCartOpen) return null

  const handlePlaceOrderClick = () => {
    if (!session) {
      alert("Please sign in to place an order.")
      return
    }
    setFormData(prefilledForm(savedDetails))
    setShowCheckoutForm(true)
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setFormError("")

    const { fulfillmentMethod, paymentMethod, customerPhone, shippingAddress, notes } = formData
    const isDelivery = fulfillmentMethod === "delivery"
    if (!customerPhone.trim() || (isDelivery && !shippingAddress.trim())) {
      setFormError(isDelivery ? "Please fill in shipping address and phone." : "Please fill in your phone number.")
      return
    }

    setIsSubmitting(true)
    try {
      const orderData = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        fulfillmentMethod,
        customerPhone: customerPhone.trim(),
        shippingAddress: isDelivery ? shippingAddress.trim() : undefined,
        notes: notes.trim() || undefined,
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        useWalletCredits,
        paymentMethod,
        saveDetails: formData.rememberDetails,
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

      // The order exists server-side from here, so the cart is finished with whether or
      // not it's paid yet. The confirmation shows how to pay (bank details, or cash at the
      // counter); the same details stay on the order under "Orders".
      setPlacedOrder(await response.json())
      clearCart()
      setAppliedPromo(null)
      setUseWalletCredits(false)
    } catch (error) {
      console.error("Error placing order:", error)
      setFormError(error instanceof Error ? error.message : "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackFromCheckout = () => {
    setShowCheckoutForm(false)
    setFormError("")
  }

  return (
    <>
      {/* Sticky Footer Bar — only once a real (non-gift) product is in the cart.
          Same rounded-pill shape/font treatment as the "Add N items" staging bar
          (flavour-quick-add-list.tsx) so both floating cart CTAs read as one family. */}
      {barVisible && (
        <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3">
          <button
            type="button"
            onClick={openCart}
            className={`pointer-events-auto unity-tap flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 transition-colors bg-blue-700 hover:bg-blue-800 ${
              cartPulsing ? "animate-cart-pulse" : ""
            }`}
          >
            <Package className="h-4 w-4" />
            View Order — {totalItems} {totalItems === 1 ? "case" : "cases"} — £{finalTotal.toFixed(2)}
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
              {!placedOrder && (
                <p className="text-[10px] text-blue-100 font-mono uppercase">
                  {totalItems} {totalItems === 1 ? "case" : "cases"} total
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseSheet}
              className="w-8 h-8 flex items-center justify-center text-blue-100 hover:text-white"
              aria-label="Close order"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {placedOrder ? (
            <OrderPlacedPanel order={placedOrder} onDone={handleCloseSheet} />
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    How do you want this order?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, fulfillmentMethod: "delivery", paymentMethod: "bank_transfer" }))}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                        formData.fulfillmentMethod === "delivery"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <Truck className="h-4 w-4" /> Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          fulfillmentMethod: "click_and_collect",
                          paymentMethod: isPaymentMethodAllowed(p.paymentMethod, "click_and_collect") ? p.paymentMethod : "cash",
                        }))
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                        formData.fulfillmentMethod === "click_and_collect"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <Store className="h-4 w-4" /> Click &amp; Collect
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Phone *
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="07XXX XXXXXX"
                    required
                  />
                </div>
                {formData.fulfillmentMethod === "delivery" ? (
                  <div>
                    <label htmlFor="shippingAddress" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Shipping address *
                    </label>
                    <textarea
                      id="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData((p) => ({ ...p, shippingAddress: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      placeholder="Full address for delivery"
                      required
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                      <Store className="h-3.5 w-3.5" /> Collect from
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-800 leading-snug">
                      {UNITY_BUSINESS.legalName}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {UNITY_BUSINESS.addressLines.join(", ")}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      We'll text the number above the moment your order is ready to collect.
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="notes" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Delivery instructions, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    How do you want to pay?
                  </label>
                  {finalTotal <= 0 ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-sm font-semibold text-slate-800">
                      Covered by your wallet credits — nothing to pay.
                    </div>
                  ) : (
                    <>
                      {formData.fulfillmentMethod === "click_and_collect" && (
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          {([
                            { method: "cash", label: "Cash", Icon: Banknote },
                            { method: "card", label: "Card", Icon: CreditCard },
                          ] as const).map(({ method, label, Icon }) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, paymentMethod: method }))}
                              aria-pressed={formData.paymentMethod === method}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                                formData.paymentMethod === method
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              <Icon className="h-4 w-4" /> {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                          {formData.paymentMethod === "cash" ? (
                            <><Banknote className="h-3.5 w-3.5" /> Cash at the counter</>
                          ) : formData.paymentMethod === "card" ? (
                            <><CreditCard className="h-3.5 w-3.5" /> Card at the counter</>
                          ) : (
                            <><Landmark className="h-3.5 w-3.5" /> Bank transfer</>
                          )}
                          <span className="ml-auto font-mono text-sm text-slate-800">£{finalTotal.toFixed(2)}</span>
                        </p>
                        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                          {formData.paymentMethod === "bank_transfer"
                            ? "You'll get our bank details and a payment reference as soon as you confirm."
                            : "Pay when you collect from the depot — nothing to pay now."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={formData.rememberDetails}
                    onChange={(e) => setFormData((p) => ({ ...p, rememberDetails: e.target.checked }))}
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">Remember these details</span>
                    <span className="block text-[11px] leading-snug text-slate-500">
                      Your phone, address and choices are filled in next time.
                    </span>
                  </span>
                </label>
                {formError && (
                  <p className="text-sm text-red-600 font-medium">{formError}</p>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded disabled:opacity-50"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Order"}
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
                    {items.map((item) => {
                      const lineMax = getEffectiveMaxQtyPerOrder(item.product)
                      const lineAtMax = item.quantity >= lineMax
                      const margin = computeLineMargin(item)
                      return (
                      <div key={item.product.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
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
                              disabled={lineAtMax}
                              title={lineAtMax ? `Order limit: ${lineMax} case(s)` : undefined}
                              className={`w-9 h-9 flex items-center justify-center transition-colors rounded ${
                                lineAtMax
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
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
                        {margin && (
                          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <TrendingUp className="h-3 w-3 shrink-0" />
                              Resell {margin.totalUnits} unit{margin.totalUnits === 1 ? "" : "s"} for ~£{margin.retailValue.toFixed(2)}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] font-black text-emerald-700">
                              +£{margin.profit.toFixed(2)} ({margin.marginPct.toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>
                      )
                    })}
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

                  {/* Promo & Wallet Inputs */}
                  <div className="px-4 py-3 border-b border-slate-100 space-y-3 bg-slate-50/50">
                    {/* Promo Code Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher Code</label>
                      {appliedPromo ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-3.5 py-2">
                          <div className="text-left">
                            <span className="font-mono font-black text-emerald-800 text-xs mr-2">{appliedPromo.code}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Applied</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={handleRemovePromo} 
                            className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. WELCOME20"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value)}
                            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyPromo}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                      {promoError && (
                        <p className="text-[11px] text-red-600 font-medium text-left">{promoError}</p>
                      )}
                    </div>

                    {/* Wallet Credits Toggle */}
                    {walletBalance > 0 && (
                      <div className="flex items-center justify-between py-1 bg-white border border-slate-150 rounded-xl px-3.5 py-2.5">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Use Wallet Credits</p>
                          <p className="text-[10px] font-semibold text-slate-500">Available balance: £{walletBalance.toFixed(2)}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={useWalletCredits}
                          onChange={(e) => setUseWalletCredits(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Margin projection — only when at least one line has a real retail price set */}
                  {marginTotals.linesWithData > 0 && (
                    <div className="mx-4 mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" /> Your Potential Profit
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700/80">
                          Resell for ~£{marginTotals.retailValue.toFixed(2)} · you pay £{marginTotals.wholesaleCost.toFixed(2)}
                        </span>
                        <span className="font-mono text-sm font-black text-emerald-700">
                          +£{marginTotals.profit.toFixed(2)} ({marginPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* VAT Breakdown */}
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">
                        Subtotal (ex. VAT)
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-800">
                        £{subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-xs uppercase font-bold tracking-wide">
                          Promo Discount
                        </span>
                        <span className="text-sm font-mono font-bold">
                          -£{discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {!vpdIsLive && totalLiquidVolumeMl > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 my-1">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
                        <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                          Vaping Products Duty adds ~£{projectedDutyPreview.toFixed(2)} to this basket from 1 Oct 2026 (£2.20/10ml). Stock up now at today&apos;s price.
                        </p>
                      </div>
                    )}

                    {roundedVapeDuty > 0 && (
                      <>
                        {totalLiquidVolumeMl > 0 && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs uppercase font-bold tracking-wide">
                              Total E-Liquid Volume
                            </span>
                            <span className="text-sm font-mono font-bold">
                              {totalLiquidVolumeMl.toLocaleString()} ml
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="text-xs uppercase font-bold tracking-wide">
                            Vaping Products Duty
                          </span>
                          <span className="text-sm font-mono font-bold">
                            +£{roundedVapeDuty.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">
                        VAT (20% inc. Duty)
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-800">
                        £{updatedVat.toFixed(2)}
                      </span>
                    </div>

                    {creditsToUse > 0 && (
                      <div className="flex items-center justify-between text-blue-600">
                        <span className="text-xs uppercase font-bold tracking-wide">
                          Credits Applied
                        </span>
                        <span className="text-sm font-mono font-bold">
                          -£{creditsToUse.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-slate-800">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        Total
                      </span>
                      <span className="text-2xl font-black font-mono text-blue-700">
                        £{finalTotal.toFixed(2)}
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
