"use client"

import { createPortal } from "react-dom"
import { Minus, Plus, ShoppingCart, Mail } from "lucide-react"
import type { Product } from "@/lib/products"
import { getEffectiveMaxQtyPerOrder, getProductImageUrl } from "@/lib/products"
import { useCart } from "@/lib/cart-context"

type ProductDetailModalProps = {
  product: Product
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
  /** Called instead of the built-in "Notify Me" flow when the caller wants to handle
   *  out-of-stock subscription itself (e.g. closing this modal first). */
  onNotifyMe?: () => void
}

/** Full product detail — description, compliance specs, price breakdown, add-to-cart
 *  stepper. Shared by the grid ProductCard (image/name tap) and the flavour quick-add
 *  rows (row tap) so both "expand for details" entry points behave identically. */
export function ProductDetailModal({ product, isOpen, onClose, isAdmin = false, onNotifyMe }: ProductDetailModalProps) {
  const { addItem, removeItem, getQuantity } = useCart()
  const quantity = getQuantity(product.id)
  const maxPerOrder = getEffectiveMaxQtyPerOrder(product)
  const atMaxQty = quantity >= maxPerOrder
  const imageUrl = getProductImageUrl(product)

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full bg-gradient-to-br from-white via-slate-50 to-slate-100/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain p-6"
            onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg"; }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md ring-1 ring-slate-200/80 hover:bg-slate-50"
            aria-label="Close details"
          >
            ✕
          </button>
          {product.stock === 0 ? (
            <span className="absolute left-3 top-3 rounded-md bg-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
              Out of Stock
            </span>
          ) : product.badge && (
            <span className="absolute left-3 top-3 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700/90">
              {product.brand}
            </p>
            <h3 className="mt-1 text-[17px] font-bold leading-snug tracking-tight text-slate-900">
              {product.name}
            </h3>
          </div>

          {/* Compliance & Specifications */}
          <div className="flex flex-col gap-1.5">
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

          {/* Full product information */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product information</p>
            <p
              className={`text-[13px] leading-relaxed ${
                product.description?.trim()
                  ? "text-slate-700"
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

          {/* Price breakdown */}
          <div className="border-t border-slate-100 pt-3 flex flex-col gap-1 shop-card-price-tint rounded-xl p-3 -mx-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-black leading-none tracking-tight text-slate-900 tabular-nums">
                  {"£"}
                  {product.casePrice.toFixed(2)}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">/case</p>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ex-VAT</p>
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

          {/* Add to cart controls */}
          {product.stock === 0 ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onNotifyMe?.()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition"
            >
              <Mail className="w-4 h-4 text-blue-300" />
              Notify Me
            </button>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={() => addItem(product)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Order
            </button>
          ) : (
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-200">
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
                aria-label={`Remove one ${product.name}`}
              >
                <Minus className="w-5 h-5" strokeWidth={3} />
              </button>
              <span className="w-12 text-center py-3.5 bg-white text-slate-800 font-bold font-mono text-lg">
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
      </div>
    </div>,
    document.body
  )
}
