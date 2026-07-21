"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, ShoppingCart, Mail } from "lucide-react"
import {
  matchesBrandFilter,
  getEffectiveMaxQtyPerOrder,
  getProductImageUrl,
  type Product,
} from "@/lib/products"
import type { ProductCategorySlug } from "@/lib/product-categories"
import { useCart } from "@/lib/cart-context"
import { triggerCartAddedFeedback } from "@/lib/cart-feedback"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { NotifyMeModal } from "@/components/notify-me-modal"

const FETCH_LIMIT = 100
const HOLD_DELAY_MS = 420
const HOLD_INTERVAL_MS = 90
const INITIAL_VISIBLE = 24
const VISIBLE_STEP = 24

/** Strips a leading "<line> " prefix from a product name so the row only shows the
 *  flavour part (e.g. "Crystal 4000 Huba Huba" + line "Crystal 4000" → "Huba Huba").
 *  Falls back to the full name when the prefix doesn't match — never hides data. */
function flavourLabel(name: string, line?: string | null): string {
  if (!line) return name
  const prefix = `${line} `
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
    return name.slice(prefix.length).trim() || name
  }
  return name
}

/** Press-and-hold repeat for the stepper buttons: one immediate step on press, then
 *  (after a short delay so a normal tap doesn't feel laggy) repeats until released. */
function usePressAndHold(onStep: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  const clear = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const start = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    onStepRef.current()
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => onStepRef.current(), HOLD_INTERVAL_MS)
    }, HOLD_DELAY_MS)
  }, [])

  useEffect(() => clear, [clear])

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  }
}

function FlavourRow({
  product,
  qty,
  maxQty,
  onIncrement,
  onDecrement,
  onSetExact,
  onOpenDetail,
  onNotify,
}: {
  product: Product
  qty: number
  maxQty: number
  onIncrement: () => void
  onDecrement: () => void
  onSetExact: (n: number) => void
  onOpenDetail: () => void
  onNotify: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(qty))
  const outOfStock = product.stock === 0
  const atMax = qty >= maxQty

  const plusHandlers = usePressAndHold(onIncrement)
  const minusHandlers = usePressAndHold(onDecrement)

  const commitDraft = () => {
    const n = parseInt(draft.replace(/\D/g, ""), 10)
    onSetExact(Number.isNaN(n) ? 0 : n)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 border-b border-blue-100/90 bg-gradient-to-br from-white via-blue-50/30 to-white shop-vape-stripes px-2 py-2 last:border-b-0">
      <button type="button" onClick={onOpenDetail} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getProductImageUrl(product)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-8 w-8 shrink-0 rounded-md border border-slate-150 bg-slate-50 object-contain p-0.5"
          onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg"; }}
        />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-snug text-slate-900">
            {flavourLabel(product.name, product.productLine)}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {outOfStock && (
              <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Out of stock
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-700 tabular-nums">
              £{product.casePrice.toFixed(2)}<span className="font-medium text-slate-400">/case</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400 tabular-nums">
              £{product.unitPrice.toFixed(2)}/unit
            </span>
          </div>
        </div>
      </button>

      {outOfStock ? (
        <button
          type="button"
          onClick={onNotify}
          className="unity-tap flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-900"
        >
          <Mail className="h-3.5 w-3.5 text-blue-300" />
          Notify
        </button>
      ) : (
        <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            {...minusHandlers}
            disabled={qty <= 0}
            className={`flex h-9 w-9 items-center justify-center text-lg font-bold transition-colors ${
              qty <= 0 ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
            }`}
            aria-label={`Remove one ${product.name} from batch`}
          >
            −
          </button>
          {editing ? (
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur() }
                if (e.key === "Escape") { setEditing(false) }
              }}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 w-11 border-x border-slate-200 bg-white text-center font-mono text-[15px] font-bold text-slate-900 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setDraft(String(qty)); setEditing(true) }}
              className="h-9 w-11 border-x border-slate-200 bg-white text-center font-mono text-[15px] font-bold text-slate-900"
              aria-label={`${product.name} quantity, tap to type a number`}
            >
              {qty}
            </button>
          )}
          <button
            type="button"
            {...plusHandlers}
            disabled={atMax}
            title={atMax ? `Order limit: ${maxQty} case(s)` : undefined}
            className={`flex h-9 w-9 items-center justify-center text-lg font-bold transition-colors ${
              atMax ? "bg-slate-100 text-slate-300" : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            }`}
            aria-label={`Add one more ${product.name} to batch`}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

type FlavourQuickAddListProps = {
  categorySlug: ProductCategorySlug
  brand: string
  /** Exact productLine match (vapes/e-liquids). Omit/null for brand-only categories
   *  (nicotine pouches) where every flavour under the brand is shown directly. */
  productLine?: string | null
  search: string
}

/** Rendered inline inside the shop accordion — the innermost expanded level (brand,
 *  or brand → line) drops straight into this rather than navigating to a new screen. */
export function FlavourQuickAddList({
  categorySlug,
  brand,
  productLine = null,
  search,
}: FlavourQuickAddListProps) {
  const { addItems } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staged, setStaged] = useState<Record<string, number>>({})
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  // Caps how many rows (and images) mount at once — a line with hundreds of flavours
  // shouldn't force the browser to paint/decode all of them the instant it expands.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("category", categorySlug)
        params.set("brand", brand)
        params.set("limit", String(FETCH_LIMIT))
        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !Array.isArray(data?.products)) throw new Error("Failed to load")
        setProducts(data.products)
      } catch {
        if (!cancelled) {
          setProducts([])
          setError("Could not load flavours. Pull down to try again.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [categorySlug, brand])

  // Reset staged quantities and the visible-row cap whenever the leaf changes so
  // state from one flavour list never leaks into another after navigating.
  useEffect(() => {
    setStaged({})
    setVisibleCount(INITIAL_VISIBLE)
  }, [categorySlug, brand, productLine])

  // A new search term can reveal a match beyond the current cap — don't make the
  // user hit "show more" just to see a result they explicitly searched for.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [search])

  const flavours = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => matchesBrandFilter(p, brand))
      .filter((p) => (productLine ? p.productLine === productLine : true))
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, brand, productLine, search])

  const setQty = useCallback((product: Product, updater: (prev: number) => number) => {
    const max = getEffectiveMaxQtyPerOrder(product)
    setStaged((prev) => {
      const current = prev[product.id] ?? 0
      const next = Math.max(0, Math.min(max, updater(current)))
      if (next === current) return prev
      if (next === 0) {
        const { [product.id]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [product.id]: next }
    })
  }, [])

  const totalStaged = useMemo(
    () => Object.values(staged).reduce((sum, n) => sum + n, 0),
    [staged]
  )
  const totalPrice = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return Object.entries(staged).reduce((sum, [id, qty]) => {
      const p = byId.get(id)
      return p ? sum + p.casePrice * qty : sum
    }, 0)
  }, [staged, products])

  const handleBatchAdd = () => {
    if (totalStaged === 0) return
    const byId = new Map(products.map((p) => [p.id, p]))
    const itemsToAdd = Object.entries(staged)
      .map(([id, quantity]) => ({ product: byId.get(id), quantity }))
      .filter((x): x is { product: Product; quantity: number } => !!x.product && x.quantity > 0)
    if (itemsToAdd.length === 0) return
    addItems(itemsToAdd)
    setStaged({})
    triggerCartAddedFeedback()
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1100)
  }

  return (
    <div className={totalStaged > 0 ? "pb-16" : ""}>
      {loading && (
        <div className="px-3 py-8 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500/80">Loading…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="mx-1 my-1 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-center">
          <p className="text-[12px] font-medium leading-snug text-amber-950/90">{error}</p>
        </div>
      )}

      {!loading && !error && flavours.length === 0 && (
        <div className="mx-1 my-1 rounded-xl border border-dashed border-blue-200/70 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes py-8 text-center shadow-inner">
          <p className="text-[13px] font-semibold text-slate-800">No flavours found</p>
          <p className="unity-meta mx-auto mt-1 max-w-[240px] text-[11px]">
            {search.trim() ? "Try a different search." : "Nothing live in this line yet."}
          </p>
        </div>
      )}

      {!loading && !error && flavours.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-dashed border-blue-200/70 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner">
            {flavours.slice(0, visibleCount).map((product) => (
              <FlavourRow
                key={product.id}
                product={product}
                qty={staged[product.id] ?? 0}
                maxQty={getEffectiveMaxQtyPerOrder(product)}
                onIncrement={() => setQty(product, (q) => q + 1)}
                onDecrement={() => setQty(product, (q) => q - 1)}
                onSetExact={(n) => setQty(product, () => n)}
                onOpenDetail={() => setDetailProduct(product)}
                onNotify={() => setNotifyProduct(product)}
              />
            ))}
          </div>
          {visibleCount < flavours.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
              className="unity-tap mt-2 w-full rounded-xl border border-dashed border-blue-200/80 bg-white/70 py-2.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50/60"
            >
              Show {Math.min(VISIBLE_STEP, flavours.length - visibleCount)} more ({flavours.length - visibleCount} left)
            </button>
          )}
        </>
      )}

      {totalStaged > 0 && (
        <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-[35] flex justify-center px-3">
          <button
            type="button"
            onClick={handleBatchAdd}
            className={`pointer-events-auto unity-tap flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 transition-colors ${
              justAdded ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add {totalStaged} {totalStaged === 1 ? "item" : "items"} — £{totalPrice.toFixed(2)}
              </>
            )}
          </button>
        </div>
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          isOpen={!!detailProduct}
          onClose={() => setDetailProduct(null)}
          onNotifyMe={() => setNotifyProduct(detailProduct)}
        />
      )}
      {notifyProduct && (
        <NotifyMeModal
          product={notifyProduct}
          isOpen={!!notifyProduct}
          onClose={() => setNotifyProduct(null)}
        />
      )}
    </div>
  )
}
