"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import {
  SHOP_CATEGORIES,
  VAPING_BRANDS,
  E_LIQUID_BRANDS,
  POUCH_BRANDS,
  type ProductCategorySlug,
} from "@/lib/product-categories"
import { BrandLinePicker } from "@/components/brand-line-picker"
import { FlavourQuickAddList } from "@/components/flavour-quick-add-list"
import { BrandMark } from "@/components/brand-mark"
import { Expand } from "@/components/expand"
import { prefetchProducts, useProducts } from "@/lib/product-store"
import { anchorScroll } from "@/lib/anchor-scroll"

/** Only simple-browse categories (papers/filters/lighters/other) still leave the
 *  accordion — everything brand-driven (vapes/e-liquids/pouches) now expands inline. */
export type ShopNavigatePayload = {
  categorySlug: ProductCategorySlug
}

type ShopCategoryAccordionProps = {
  onNavigate: (payload: ShopNavigatePayload) => void
  search: string
  isAdmin?: boolean
  onProductUpdated?: () => void
}

function BrandRow({
  brand,
  expanded,
  onSelect,
  onIntent,
}: {
  brand: string
  expanded: boolean
  onSelect: (row: HTMLElement) => void
  /** Finger down / pointer over — start loading before the tap completes. */
  onIntent: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => onSelect(e.currentTarget)}
      onPointerDown={onIntent}
      onPointerEnter={onIntent}
      aria-expanded={expanded}
      className={`unity-tap group flex w-full items-center gap-3 border-b border-blue-100 px-3 py-3 text-left transition hover:bg-blue-50/60 active:bg-blue-50 ${
        expanded
          ? "bg-blue-50/80"
          : "bg-gradient-to-br from-white via-blue-50/30 to-white shop-vape-stripes"
      }`}
    >
      <BrandMark brand={brand} />
      <span className="min-w-0 flex-1 text-[15px] font-bold tracking-tight text-blue-700 group-hover:text-blue-800">
        {brand}
      </span>
      <ChevronRight
        className={`h-4 w-4 shrink-0 text-blue-400 transition-transform duration-200 ${expanded ? "rotate-90 text-blue-500" : ""}`}
      />
    </button>
  )
}

/** Quietly loads each brand of an open category in the background, one at a time while
 *  the phone is idle, so the first tap on any brand opens instantly. Skipped on Data
 *  Saver or a slow connection, where it would cost the retailer more than it saves. */
function usePrefetchBrands(category: string, brands: readonly string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || brands.length === 0) return
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType ?? "")) return

    let cancelled = false
    let index = 0
    const idle = (fn: () => void) => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout: 2000 })
      else setTimeout(fn, 300)
    }
    const next = () => {
      if (cancelled || index >= brands.length) return
      const brand = brands[index++]
      prefetchProducts({ category, brand })
      idle(next)
    }
    const start = window.setTimeout(() => idle(next), 1200)
    return () => {
      cancelled = true
      window.clearTimeout(start)
    }
  }, [category, brands, enabled])
}

/** Category card that expands to a flat brand list; tapping a brand expands it
 *  in-place (single-open, like the category card itself) to reveal either the brand's
 *  product lines (vapes/e-liquids) or its flavours directly (nicotine pouches) —
 *  no screen navigation, all within this same scrolling accordion. */
/** Categories without a fixed brand roster (papers/filters/lighters/other) derive
 *  their brand list from whatever's actually live in the catalogue for that
 *  category, fetched once the card is first expanded — same lazy-load shape as the
 *  line picker uses for product lines, so a new brand shows up automatically the
 *  moment admin adds stock under it, with no taxonomy file to keep in sync. */
function useDynamicBrands(categorySlug: string, enabled: boolean) {
  const { products, failed } = useProducts(enabled ? { category: categorySlug } : null)
  const brands = useMemo(
    () => [...new Set((products ?? []).map((p) => p.brand).filter(Boolean))].sort(),
    [products]
  )
  return { brands, loading: enabled && products === null && !failed }
}

function BrandDrilldownCard({
  def,
  brands: staticBrands,
  mode,
  defaultOpen = false,
  search,
  isAdmin,
  onProductUpdated,
}: {
  def: (typeof SHOP_CATEGORIES)[number]
  /** Omit to derive the brand list live from the catalogue instead of a fixed roster. */
  brands?: readonly string[]
  mode: "brand_then_line" | "brand_only"
  defaultOpen?: boolean
  search: string
  isAdmin?: boolean
  onProductUpdated?: () => void
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  // Open by default on load: show it open from the first paint. Only a tap animates.
  const [animateOpen, setAnimateOpen] = useState(!defaultOpen)
  const [openBrand, setOpenBrand] = useState<string | null>(null)
  const { brands: dynamicBrands, loading: loadingBrands } = useDynamicBrands(
    def.id,
    !staticBrands && expanded
  )
  const brands = staticBrands ?? dynamicBrands
  usePrefetchBrands(def.id, brands, expanded)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-blue-300/80 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner">
      <button
        type="button"
        onClick={(e) =>
          anchorScroll(e.currentTarget, () => {
            setAnimateOpen(true)
            setExpanded((open) => !open)
          })
        }
        className="unity-tap flex w-full items-center justify-between px-3.5 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <span className="text-[13px] font-bold uppercase tracking-wider text-blue-600">
            {def.label}
          </span>
          <p className="mt-0.5 text-[10px] font-medium leading-snug text-blue-600/75">
            {def.keywords}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-blue-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <Expand appear={animateOpen}>
        <div className="border-t border-dashed border-blue-200/80 px-2.5 pb-2.5 pt-2">
          <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner">
            {loadingBrands && brands.length === 0 &&
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-blue-100 px-3 py-3" aria-hidden>
                  <div className="h-9 w-14 rounded-lg bg-slate-100" />
                  <div className="h-3 w-24 rounded bg-slate-100" />
                </div>
              ))}
            {!loadingBrands && brands.length === 0 && (
              <p className="px-3 py-3 text-center text-[11px] font-semibold text-slate-400">
                No brands live yet in this section.
              </p>
            )}
            {brands.map((brand) => {
              const isOpen = openBrand === brand
              return (
                <div key={brand}>
                  <BrandRow
                    brand={brand}
                    expanded={isOpen}
                    onSelect={(row) => anchorScroll(row, () => setOpenBrand(isOpen ? null : brand))}
                    onIntent={() => prefetchProducts({ category: def.id, brand })}
                  />
                  {isOpen && (
                    <Expand>
                    {mode === "brand_only" ? (
                      <div className="border-t border-dashed border-blue-100/90 p-1.5">
                        <FlavourQuickAddList
                          categorySlug={def.id}
                          brand={brand}
                          search={search}
                          isAdmin={isAdmin}
                          onProductUpdated={onProductUpdated}
                        />
                      </div>
                    ) : (
                      <BrandLinePicker
                        categorySlug={def.id}
                        brand={brand}
                        search={search}
                        isAdmin={isAdmin}
                        onProductUpdated={onProductUpdated}
                      />
                    )}
                    </Expand>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </Expand>
      )}
    </div>
  )
}

function SimpleCategoryTile({
  label,
  keywords,
  onSelect,
}: {
  label: string
  keywords: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="unity-tap relative w-full overflow-hidden rounded-2xl border border-dashed border-blue-300/80 bg-gradient-to-br from-white via-blue-50/35 to-white px-3.5 py-3 text-left shadow-inner shop-vape-stripes transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[13px] font-bold uppercase tracking-wider text-blue-600">
            {label}
          </span>
          <p className="mt-0.5 text-[10px] font-medium leading-snug text-blue-600/75">
            {keywords}
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      </div>
    </button>
  )
}

/** Every not-yet-live category in one compact block at the end — previously each had its
 *  own full-size tile, which put 17 "Soon" cards between Vaping and Papers/Filters. */
function ComingSoonGroup({ categories }: { categories: { id: string; label: string }[] }) {
  if (categories.length === 0) return null
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/90 bg-gradient-to-br from-slate-100/90 via-white to-slate-50/80 px-4 py-3.5 shadow-inner">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Sparkles className="h-3.5 w-3.5" /> Coming soon
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <span
            key={cat.id}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500"
          >
            {cat.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ShopCategoryAccordion({ onNavigate, search, isAdmin = false, onProductUpdated }: ShopCategoryAccordionProps) {
  const live = SHOP_CATEGORIES.filter((cat) => cat.status !== "coming_soon")
  const comingSoon = SHOP_CATEGORIES.filter((cat) => cat.status === "coming_soon")

  return (
    <div className="space-y-3 px-3 pb-28 pt-2">
      {live.map((cat) => {
        if (cat.drilldown === "brand_then_line") {
          return (
            <BrandDrilldownCard
              key={cat.id}
              def={cat}
              brands={cat.id === "e_liquids" ? E_LIQUID_BRANDS : VAPING_BRANDS}
              mode="brand_then_line"
              defaultOpen={cat.id === "vapes"}
              search={search}
              isAdmin={isAdmin}
              onProductUpdated={onProductUpdated}
            />
          )
        }

        if (cat.drilldown === "brand_only") {
          return (
            <BrandDrilldownCard
              key={cat.id}
              def={cat}
              brands={cat.id === "nicotine_pouches" ? POUCH_BRANDS : undefined}
              mode="brand_only"
              search={search}
              isAdmin={isAdmin}
              onProductUpdated={onProductUpdated}
            />
          )
        }

        return (
          <SimpleCategoryTile
            key={cat.id}
            label={cat.label}
            keywords={cat.keywords}
            onSelect={() => onNavigate({ categorySlug: cat.id })}
          />
        )
      })}
      <ComingSoonGroup categories={comingSoon} />
    </div>
  )
}
