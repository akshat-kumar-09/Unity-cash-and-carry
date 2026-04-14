"use client"

import React from "react"

import { Minus, Plus, Pencil, ShoppingCart } from "lucide-react"
import type { Product } from "@/lib/products"
import { getProductImageUrl } from "@/lib/products"
import { useCart } from "@/lib/cart-context"

export function ProductCard({
  product,
  index = 0,
  isAdmin = false,
  onAdminEdit,
}: {
  product: Product
  index?: number
  isAdmin?: boolean
  onAdminEdit?: () => void
}) {
  const { addItem, removeItem, getQuantity } = useCart()
  const quantity = getQuantity(product.id)
  const imageUrl = getProductImageUrl(product)

  const animateIn = index < 24

  return (
    <div
      className={`unity-card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        quantity > 0
          ? "border-2 border-blue-400/60 shadow-md shadow-blue-500/10 ring-1 ring-blue-100"
          : "border-slate-200/90 hover:border-blue-200"
      } ${animateIn ? "opacity-0 animate-slide-up-fade [animation-fill-mode:forwards]" : ""}`}
      style={animateIn ? { animationDelay: `${Math.min(index * 35, 350)}ms` } : undefined}
    >
      {/* Product image — img tag so placeholders load; fallback to local if external fails */}
      <div className="relative aspect-square w-full bg-gradient-to-b from-slate-50 to-slate-100/80">
        {isAdmin && onAdminEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAdminEdit()
            }}
            className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-blue-600 shadow-md ring-1 ring-slate-200/80 transition hover:bg-blue-50"
            aria-label="Edit product"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-2"
          onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg"; }}
        />
        {product.badge && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
            {product.badge}
          </span>
        )}
      </div>

      {/* Brand + name */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
          {product.brand}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-slate-900">
          {product.name}
        </h3>
      </div>

      {/* Pack label */}
      <div className="px-3 pb-2">
        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider rounded">
          {product.packLabel}
        </span>
      </div>

      {/* Pricing — Ex-VAT with green tint, spaced for readability */}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-slate-100 px-3 py-2.5 shop-card-price-tint">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          Ex-VAT
        </p>
        <p className="text-lg font-bold leading-none text-slate-900">
          {"£"}
          {product.casePrice.toFixed(2)}
        </p>
        <p className="text-[10px] text-slate-500">
          {"£"}
          {product.unitPrice.toFixed(2)}/unit
        </p>
      </div>

      {/* Quick Add -- large tap targets */}
      <div className="flex items-center border-t border-slate-100">
        {quantity === 0 ? (
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
              className="flex-1 py-3.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center"
              aria-label={`Add one more ${product.name}`}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
