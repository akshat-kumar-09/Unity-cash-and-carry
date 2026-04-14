"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import type { BrandFilter } from "@/lib/products"
import {
  SHOP_CATEGORIES,
  VAPING_SUBCATEGORIES,
  E_LIQUID_SUBCATEGORIES,
  VAPING_BRANDS,
  brandInitials,
  type ProductCategorySlug,
} from "@/lib/product-categories"
import { getBrandLogoCandidates } from "@/lib/brand-logos"

export type ShopNavigatePayload = {
  categorySlug: ProductCategorySlug
  subcategory: string | null
  brand: BrandFilter | null
}

type ShopCategoryAccordionProps = {
  onNavigate: (payload: ShopNavigatePayload) => void
}

/** Logo from /public/brands/{slug}.png|webp|svg — falls back to initials */
function BrandMark({ brand }: { brand: BrandFilter }) {
  const candidates = getBrandLogoCandidates(brand)
  const [idx, setIdx] = useState(0)
  if (idx >= candidates.length) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100/90 text-[10px] font-bold text-blue-800 ring-1 ring-blue-200/60">
        {brandInitials(brand)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidates[idx]}
      alt=""
      className="h-8 w-8 shrink-0 object-contain"
      onError={() => setIdx((i) => i + 1)}
    />
  )
}

function BrandRow({
  brand,
  onSelect,
}: {
  brand: BrandFilter
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="unity-tap group flex w-full items-center gap-2.5 border-b border-blue-100/90 bg-white/80 px-3 py-2 text-left transition last:border-b-0 hover:bg-blue-50/60 active:bg-blue-50"
    >
      <BrandMark brand={brand} />
      <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-tight text-blue-700 group-hover:text-blue-800">
        {brand}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-blue-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </button>
  )
}

function VapeStyleCategoryCard({
  def,
  subcategories,
  defaultOpen = true,
  onPickBrand,
}: {
  def: (typeof SHOP_CATEGORIES)[number]
  subcategories: readonly string[]
  defaultOpen?: boolean
  onPickBrand: (subcategory: string, brand: BrandFilter) => void
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const [openSub, setOpenSub] = useState<string | null>(subcategories[0] ?? null)

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
        <div className="space-y-2 border-t border-dashed border-blue-200/80 px-2.5 pb-2.5 pt-2">
          {subcategories.map((sub) => {
            const isOpen = openSub === sub
            return (
              <div
                key={sub}
                className="overflow-hidden rounded-xl border border-dashed border-blue-200/70 bg-white/70"
              >
                <button
                  type="button"
                  onClick={() => setOpenSub(isOpen ? null : sub)}
                  className="unity-tap flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-[12px] font-semibold text-blue-600">{sub}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-blue-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-blue-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-dashed border-blue-100/90 px-1 pb-1 pt-0.5">
                    <div className="overflow-hidden rounded-lg border border-blue-100/80 bg-white/90">
                      {VAPING_BRANDS.map((brand) => (
                        <BrandRow
                          key={`${sub}-${brand}`}
                          brand={brand}
                          onSelect={() => onPickBrand(sub, brand)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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

export function ShopCategoryAccordion({ onNavigate }: ShopCategoryAccordionProps) {
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

        if (cat.drilldown === "vape_style" && cat.id === "vapes") {
          return (
            <VapeStyleCategoryCard
              key={cat.id}
              def={cat}
              subcategories={VAPING_SUBCATEGORIES}
              defaultOpen
              onPickBrand={(sub, brand) =>
                onNavigate({
                  categorySlug: "vapes",
                  subcategory: sub,
                  brand,
                })
              }
            />
          )
        }

        if (cat.drilldown === "vape_style" && cat.id === "e_liquids") {
          return (
            <VapeStyleCategoryCard
              key={cat.id}
              def={cat}
              subcategories={E_LIQUID_SUBCATEGORIES}
              defaultOpen={false}
              onPickBrand={(sub, brand) =>
                onNavigate({
                  categorySlug: "e_liquids",
                  subcategory: sub,
                  brand,
                })
              }
            />
          )
        }

        return (
          <SimpleCategoryTile
            key={cat.id}
            label={cat.label}
            keywords={cat.keywords}
            onSelect={() =>
              onNavigate({
                categorySlug: cat.id,
                subcategory: null,
                brand: "All",
              })
            }
          />
        )
      })}
    </div>
  )
}
