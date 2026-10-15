"use client"

import { useCallback, useEffect, useState } from "react"
import { MapPin, Plus, RotateCcw, Users } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useShopStaging } from "@/lib/shop-staging"
import { useOnTabShown } from "@/lib/tab-events"
import { triggerCartAddedFeedback } from "@/lib/cart-feedback"
import { getProductImageUrl, type Product } from "@/lib/products"
import type { NearYouResult, RestockLine } from "@/lib/insights"

const DISMISS_KEY = "unity:restock-dismissed-on"

function today() {
  return new Date().toDateString()
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

/** Top-of-shop cards built from this shop's own buying (restock) and its area's
 *  (selling near you). Both stay out of the way when there's nothing to say. */
export function ShopInsights() {
  const [restock, setRestock] = useState<{ lines: RestockLine[]; total: number } | null>(null)
  const [nearYou, setNearYou] = useState<NearYouResult | null>(null)
  const [dismissedOn, setDismissedOn] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch("/api/insights/restock")
      .then((r) => (r.ok ? r.json() : null))
      .then(setRestock)
      .catch(() => {})
    fetch("/api/insights/near-you")
      .then((r) => (r.ok ? r.json() : null))
      .then(setNearYou)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setDismissedOn(readDismissed())
    load()
  }, [load])
  useOnTabShown("shop", load)

  const showRestock = restock && restock.lines.length > 0 && dismissedOn !== today()
  const showNearYou = nearYou?.status === "ok" && nearYou.products.length > 0

  if (!showRestock && !showNearYou) return null

  return (
    <div className="space-y-3 px-3 pt-3">
      {showRestock && (
        <RestockCard
          lines={restock!.lines}
          total={restock!.total}
          onDismiss={() => {
            try {
              localStorage.setItem(DISMISS_KEY, today())
            } catch {
              // Private mode — dismissal just won't persist past this session.
            }
            setDismissedOn(today())
          }}
        />
      )}
      {showNearYou && nearYou?.status === "ok" && (
        <NearYouStrip place={nearYou.place} shopCount={nearYou.shopCount} items={nearYou.products} />
      )}
    </div>
  )
}

function RestockCard({ lines, total, onDismiss }: { lines: RestockLine[]; total: number; onDismiss: () => void }) {
  const { addItems, openCart } = useCart()
  const typicalEvery = Math.round(lines.reduce((sum, l) => sum + l.everyDays, 0) / lines.length)

  const addAll = () => {
    addItems(lines.map((l) => ({ product: l.product as unknown as Product, quantity: l.suggestedQty })))
    triggerCartAddedFeedback()
    openCart()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_10px_30px_-12px_rgba(37,99,235,0.6)]">
      <div className="px-4 pb-3 pt-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-100">
          <RotateCcw className="h-3.5 w-3.5" /> Your usual is due
        </p>
        <p className="mt-0.5 text-[13px] text-blue-100/90">
          {lines.length} {lines.length === 1 ? "line" : "lines"} you reorder about every {typicalEvery} days
        </p>
        <ul className="mt-2.5 space-y-1">
          {lines.slice(0, 3).map((l) => (
            <li key={l.product.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate font-semibold">{l.product.name}</span>
              <span className="shrink-0 font-mono text-[12px] text-blue-100">× {l.suggestedQty}</span>
            </li>
          ))}
          {lines.length > 3 && (
            <li className="text-[12px] text-blue-100/80">+ {lines.length - 3} more</li>
          )}
        </ul>
      </div>
      <div className="flex gap-2 border-t border-white/15 bg-white/5 px-3 py-2.5">
        <button
          type="button"
          onClick={addAll}
          className="unity-tap flex-1 rounded-xl bg-white py-2.5 text-[12px] font-black uppercase tracking-wide text-blue-700"
        >
          Add all · £{total.toFixed(2)}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="unity-tap rounded-xl px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-blue-100"
        >
          Not now
        </button>
      </div>
    </section>
  )
}

function NearYouStrip({ place, shopCount, items }: { place: string; shopCount: number; items: { product: RestockLine["product"]; shops: number }[] }) {
  const { qtyOf, setQty } = useShopStaging()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white py-3 shadow-sm">
      <div className="px-4">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
          <MapPin className="h-3.5 w-3.5 text-blue-600" /> Selling near {place}
        </p>
        <p className="text-[12px] text-slate-500">
          What {shopCount} shops around you are buying that you don&apos;t stock yet
        </p>
      </div>
      <div className="mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {items.map(({ product, shops }) => {
          const p = product as unknown as Product
          const qty = qtyOf(p.id)
          return (
            <div key={p.id} className="w-[132px] shrink-0 snap-start rounded-xl border border-slate-150 bg-slate-50/60 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getProductImageUrl(p)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-16 w-full rounded-lg bg-white object-contain p-1"
                onError={(e) => {
                  const t = e.currentTarget
                  if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg"
                }}
              />
              <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-wide text-blue-600">{p.brand}</p>
              <p className="line-clamp-2 min-h-[30px] text-[11.5px] font-semibold leading-tight text-slate-800">{p.name}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Users className="h-3 w-3" /> {shops} shops
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-[12px] font-bold text-slate-900">£{p.casePrice.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => setQty(p, (q) => q + 1)}
                  aria-label={`Add ${p.name}`}
                  className="unity-tap flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-lg bg-blue-600 px-2 text-[12px] font-bold text-white"
                >
                  {qty > 0 ? qty : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
