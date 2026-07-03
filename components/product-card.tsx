"use client"

import React, { useState } from "react"

import { Minus, Plus, Pencil, ShoppingCart, Trash2, Mail } from "lucide-react"
import type { Product } from "@/lib/products"
import { getEffectiveMaxQtyPerOrder, getProductImageUrl } from "@/lib/products"
import { useCart } from "@/lib/cart-context"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

export function ProductCard({
  product,
  index = 0,
  isAdmin = false,
  onAdminEdit,
  onAdminDelete,
  bulkSelected = false,
  onBulkToggle,
}: {
  product: Product
  index?: number
  isAdmin?: boolean
  onAdminEdit?: () => void
  onAdminDelete?: () => void
  /** When set, shows a checkbox for catalog bulk edit (admin + live stock). */
  bulkSelected?: boolean
  onBulkToggle?: () => void
}) {
  const { data: session } = useSession()
  const { addItem, removeItem, getQuantity } = useCart()
  const quantity = getQuantity(product.id)
  const maxPerOrder = getEffectiveMaxQtyPerOrder(product)
  const atMaxQty = quantity >= maxPerOrder
  const imageUrl = getProductImageUrl(product)

  // Notify Me states
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [emailInput, setEmailInput] = useState(session?.user?.email || "")
  const [submitting, setSubmitting] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) {
      toast.error("Please enter a valid email address")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/products/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          email: emailInput.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to subscribe")
      }

      toast.success(`Subscribed to back-in-stock alerts for ${product.name}!`)
      setShowNotifyModal(false)
    } catch (err: any) {
      toast.error("Could not register notification request")
    } finally {
      setSubmitting(false)
    }
  }

  const animateIn = index < 24

  return (
    <div
      className={`unity-card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        bulkSelected
          ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-400/50"
          : quantity > 0
            ? "border-2 border-blue-400/60 shadow-md shadow-blue-500/10 ring-1 ring-blue-100"
            : "border-slate-200/90 hover:border-blue-200"
      } ${animateIn ? "opacity-0 animate-slide-up-fade [animation-fill-mode:forwards]" : ""}`}
      style={animateIn ? { animationDelay: `${Math.min(index * 35, 350)}ms` } : undefined}
    >
      {/* Product image — img tag so placeholders load; fallback to local if external fails */}
      <div className="relative aspect-square w-full bg-gradient-to-br from-white via-slate-50 to-slate-100/70 ring-1 ring-inset ring-slate-100">
        {onBulkToggle && (
          <label className="absolute left-1.5 top-1.5 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow-md ring-1 ring-slate-200/80">
            <input
              type="checkbox"
              checked={bulkSelected}
              onChange={(e) => {
                e.stopPropagation()
                onBulkToggle()
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              aria-label={`Select ${product.name} for bulk edit`}
            />
          </label>
        )}
        {isAdmin && (onAdminEdit || onAdminDelete) && (
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
            {onAdminDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdminDelete()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-md ring-1 ring-slate-200/80 transition hover:bg-red-50"
                aria-label="Remove product from catalog"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {onAdminEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdminEdit()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-blue-600 shadow-md ring-1 ring-slate-200/80 transition hover:bg-blue-50"
                aria-label="Edit product"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-3.5 drop-shadow-sm"
          onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg"; }}
        />
        {product.stock === 0 ? (
          <span className="absolute right-2 top-2 rounded-md bg-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
            Out of Stock
          </span>
        ) : product.badge && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
            {product.badge}
          </span>
        )}
      </div>

      {/* Brand + name */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-blue-700/90">
          {product.brand}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[13.5px] font-bold leading-snug tracking-tight text-slate-900">
          {product.name}
        </h3>
      </div>

      {/* Compliance & Specifications Info */}
      <div className="px-3 pb-2.5 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-650 text-[9px] font-bold uppercase tracking-wider rounded border border-slate-200">
            {product.packLabel}
          </span>
          {product.isSubjectToVapeDuty ? (
            <>
              <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider rounded">
                Duty Stamped [VDS]
              </span>
              {product.liquidVolumeMl != null && product.liquidVolumeMl > 0 && (
                <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-150 text-[9px] font-bold uppercase tracking-wider rounded font-mono">
                  {product.liquidVolumeMl}ml
                </span>
              )}
              {product.nicotineStrengthMg != null && (
                <span className="inline-block px-1.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-150 text-[9px] font-bold uppercase tracking-wider rounded font-mono">
                  {product.nicotineStrengthMg > 0 ? `${product.nicotineStrengthMg}mg` : "Nic-Free"}
                </span>
              )}
            </>
          ) : (
            <span className="inline-block px-1.5 py-0.5 bg-slate-200/50 text-slate-500 border border-slate-350/50 text-[9px] font-bold uppercase tracking-wider rounded">
              Excise Exempt
            </span>
          )}
        </div>

        {product.isSubjectToVapeDuty && product.liquidVolumeMl != null && product.liquidVolumeMl > 0 && (
          <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50/60 rounded-xl p-2 border border-emerald-150/50 flex items-center justify-between font-mono mt-0.5">
            <span>Wholesale Vape Duty:</span>
            <span>+£{(product.unitsPerPack * product.liquidVolumeMl * 0.22).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* UK product information (visible description for trade listings) */}
      <div className="px-3 pb-2 border-t border-slate-100 pt-2">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product information</p>
        <p
          className={`text-[11px] leading-snug ${
            product.description?.trim()
              ? "text-slate-700 line-clamp-5"
              : isAdmin
                ? "text-amber-800/90"
                : "text-slate-600"
          }`}
        >
          {product.description?.trim()
            ? product.description.trim()
            : isAdmin
              ? "No description on file — edit this product to add UK-required information (min. 20 characters)."
              : "See retail packaging for full ingredients, nicotine content, warnings and disposal."}
        </p>
      </div>

      {/* Pricing — Ex-VAT with green tint, spaced for readability */}
      <div className="mt-auto flex flex-col gap-1 border-t border-slate-100 px-3 py-3 shop-card-price-tint">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-black leading-none tracking-tight text-slate-900 tabular-nums">
              {"£"}
              {product.casePrice.toFixed(2)}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">/case</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Ex-VAT
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-semibold text-slate-500 tabular-nums">
            {"£"}
            {product.unitPrice.toFixed(2)}<span className="text-slate-400"> / unit</span>
          </p>
          <p className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold font-mono text-slate-500">
            Limit {maxPerOrder}
          </p>
        </div>
      </div>

      {/* Quick Add -- large tap targets */}
      <div className="flex items-center border-t border-slate-100">
        {product.stock === 0 ? (
          <button
            type="button"
            onClick={() => setShowNotifyModal(true)}
            className="flex flex-1 items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition"
          >
            <Mail className="w-4 h-4 text-blue-300" />
            Notify Me
          </button>
        ) : quantity === 0 ? (
          <button
            type="button"
            onClick={() => addItem(product)}
            className="flex flex-1 items-center justify-center gap-2 bg-blue-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-blue-700"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
        ) : (
          <div className="flex-1 flex items-center">
            <button
              type="button"
              onClick={() => removeItem(product.id)}
              className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
              aria-label={`Remove one ${product.name}`}
            >
              <Minus className="w-5 h-5" strokeWidth={3} />
            </button>
            <span className="w-12 text-center py-3.5 bg-white text-slate-800 font-bold font-mono text-lg border-x border-slate-100">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => addItem(product)}
              disabled={atMaxQty}
              title={atMaxQty ? `Order limit: ${maxPerOrder} case(s)` : undefined}
              className={`flex-1 py-3.5 flex items-center justify-center transition-colors ${
                atMaxQty
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              aria-label={`Add one more ${product.name}`}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      {/* Notify Me Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-150 text-left space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-slate-800 text-[15px] leading-tight">Stock Notification</h3>
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>{product.name}</strong> is currently out of stock. We will notify you immediately at this email once new boxes arrive in Glasgow.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="email"
                placeholder="your.email@business.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
              >
                {submitting ? "Registering..." : "Notify Me When In Stock"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
