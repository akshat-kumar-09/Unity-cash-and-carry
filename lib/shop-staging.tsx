"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { Check, ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { getEffectiveMaxQtyPerOrder, type Product } from "@/lib/products"
import { triggerCartAddedFeedback } from "@/lib/cart-feedback"
import { useFloatingBarPresence } from "@/lib/floating-ui"

type Staged = Record<string, { product: Product; qty: number }>

type ShopStagingContextValue = {
  staged: Staged
  qtyOf: (productId: string) => number
  setQty: (product: Product, updater: (prev: number) => number) => void
  totalItems: number
  totalPrice: number
  /** Moves everything staged into the cart. */
  addAllToCart: () => void
  justAdded: boolean
}

const ShopStagingContext = createContext<ShopStagingContextValue | null>(null)

/** Quantities picked with the +/− steppers before "Add to order". Lives above every
 *  accordion level so picks survive a line or brand being collapsed — previously each
 *  flavour list kept its own picks and silently dropped them when it closed. */
export function ShopStagingProvider({ children }: { children: ReactNode }) {
  const { addItems } = useCart()
  const [staged, setStaged] = useState<Staged>({})
  const [justAdded, setJustAdded] = useState(false)

  const setQty = useCallback((product: Product, updater: (prev: number) => number) => {
    const max = getEffectiveMaxQtyPerOrder(product)
    setStaged((prev) => {
      const current = prev[product.id]?.qty ?? 0
      const next = Math.max(0, Math.min(max, updater(current)))
      if (next === current) return prev
      if (next === 0) {
        const { [product.id]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [product.id]: { product, qty: next } }
    })
  }, [])

  const value = useMemo<ShopStagingContextValue>(() => {
    const lines = Object.values(staged)
    return {
      staged,
      qtyOf: (id) => staged[id]?.qty ?? 0,
      setQty,
      totalItems: lines.reduce((sum, l) => sum + l.qty, 0),
      totalPrice: lines.reduce((sum, l) => sum + l.product.casePrice * l.qty, 0),
      addAllToCart: () => {
        if (lines.length === 0) return
        addItems(lines.map((l) => ({ product: l.product, quantity: l.qty })))
        setStaged({})
        triggerCartAddedFeedback()
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 1100)
      },
      justAdded,
    }
  }, [staged, setQty, addItems, justAdded])

  return <ShopStagingContext.Provider value={value}>{children}</ShopStagingContext.Provider>
}

export function useShopStaging() {
  const ctx = useContext(ShopStagingContext)
  if (!ctx) throw new Error("useShopStaging must be used within a ShopStagingProvider")
  return ctx
}

/** The one floating "Add N items" bar for the whole shop, wherever the picks were made.
 *  Shown on the Shop tab only (`active`); picks stay staged while you're elsewhere. */
export function StagedBar({ active = true }: { active?: boolean }) {
  const { totalItems, totalPrice, addAllToCart, justAdded } = useShopStaging()
  const visible = active && (totalItems > 0 || justAdded)
  useFloatingBarPresence(visible)
  if (!visible) return null

  return (
    <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3">
      <button
        type="button"
        onClick={addAllToCart}
        className={`pointer-events-auto unity-tap flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 transition-colors ${
          justAdded ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {justAdded ? (
          <>
            <Check className="h-5 w-5" strokeWidth={3} />
            Added to order
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Add {totalItems} {totalItems === 1 ? "item" : "items"} — £{totalPrice.toFixed(2)}
          </>
        )}
      </button>
    </div>
  )
}
