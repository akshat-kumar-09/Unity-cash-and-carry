"use client"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import {
  SHOP_CATEGORIES,
  VAPING_BRANDS,
  POUCH_BRANDS,
  type ProductCategorySlug,
} from "@/lib/product-categories"
import { BrandLinePicker } from "@/components/brand-line-picker"
import { FlavourQuickAddList } from "@/components/flavour-quick-add-list"
import { BrandMark } from "@/components/brand-mark"

/** Only simple-browse categories (papers/filters/lighters/other) still leave the
 *  accordion — everything brand-driven (vapes/e-liquids/pouches) now expands inline. */
export type ShopNavigatePayload = {
  categorySlug: ProductCategorySlug
}

type ShopCategoryAccordionProps = {
  onNavigate: (payload: ShopNavigatePayload) => void
  search: string
}

function BrandRow({
  brand,
  expanded,
  onSelect,
}: {
  brand: string
  expanded: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
      {expanded ? (
        <ChevronUp className="h-4 w-4 shrink-0 text-blue-500" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-blue-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
      )}
    </button>
  )
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
  const [brands, setBrands] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || brands !== null) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("category", categorySlug)
        params.set("limit", "100")
        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        const set = new Set<string>()
        for (const p of Array.isArray(data?.products) ? data.products : []) {
          if (p?.brand) set.add(p.brand)
        }
        setBrands([...set].sort())
      } catch {
        if (!cancelled) setBrands([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [categorySlug, enabled, brands])

  return { brands: brands ?? [], loading }
}

function BrandDrilldownCard({
  def,
  brands: staticBrands,
  mode,
  defaultOpen = false,
  search,
}: {
  def: (typeof SHOP_CATEGORIES)[number]
  /** Omit to derive the brand list live from the catalogue instead of a fixed roster. */
  brands?: readonly string[]
  mode: "brand_then_line" | "brand_only"
  defaultOpen?: boolean
  search: string
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const [openBrand, setOpenBrand] = useState<string | null>(null)
  const { brands: dynamicBrands, loading: loadingBrands } = useDynamicBrands(
    def.id,
    !staticBrands && expanded
  )
  const brands = staticBrands ?? dynamicBrands

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-blue-300/80 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
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
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-blue-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-blue-500" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-dashed border-blue-200/80 px-2.5 pb-2.5 pt-2">
          <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner">
            {loadingBrands && brands.length === 0 && (
              <div className="px-3 py-3 text-center">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500/80">Loading brands…</p>
                </div>
              </div>
            )}
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
                    onSelect={() => setOpenBrand(isOpen ? null : brand)}
                  />
                  {isOpen && (
                    mode === "brand_only" ? (
                      <div className="border-t border-dashed border-blue-100/90 p-1.5">
                        <FlavourQuickAddList categorySlug={def.id} brand={brand} search={search} />
                      </div>
                    ) : (
                      <BrandLinePicker categorySlug={def.id} brand={brand} search={search} />
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>
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

function ComingSoonTile({
  label,
  keywords,
}: {
  label: string
  keywords: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300/90 bg-gradient-to-br from-slate-100/90 via-white to-slate-50/80 px-4 py-3.5 shadow-inner">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500/5 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600">
            {label}
          </span>
          <p className="mt-1 max-w-[220px] text-[10px] font-medium leading-snug text-slate-400">
            {keywords}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          <Sparkles className="h-3 w-3" />
          Soon
        </span>
      </div>
    </div>
  )
}

export function ShopCategoryAccordion({ onNavigate, search }: ShopCategoryAccordionProps) {
  return (
    <div className="space-y-3 px-3 pb-28 pt-2">
      {SHOP_CATEGORIES.map((cat) => {
        if (cat.status === "coming_soon") {
          return (
            <ComingSoonTile
              key={cat.id}
              label={cat.label}
              keywords={cat.keywords}
            />
          )
        }

        if (cat.drilldown === "brand_then_line") {
          return (
            <BrandDrilldownCard
              key={cat.id}
              def={cat}
              brands={VAPING_BRANDS}
              mode="brand_then_line"
              defaultOpen={cat.id === "vapes"}
              search={search}
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
    </div>
  )
}
