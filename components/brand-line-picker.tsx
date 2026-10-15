"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { PRODUCT_LINES_BY_BRAND, type ProductCategorySlug } from "@/lib/product-categories"
import { FlavourQuickAddList } from "@/components/flavour-quick-add-list"
import { BrandMark } from "@/components/brand-mark"
import { Expand } from "@/components/expand"
import { useProducts } from "@/lib/product-store"
import { anchorScroll } from "@/lib/anchor-scroll"

type BrandLineRowsProps = {
  categorySlug: ProductCategorySlug
  brand: string
  search: string
  isAdmin?: boolean
  onProductUpdated?: () => void
}

/** Nested inside an expanded brand row (Vaping/E-liquids): the brand's real product
 *  lines as a single-open accordion — tapping a line expands straight into its flavour
 *  quick-add rows. Lines and flavours come from one cached request for the brand, so
 *  opening, closing and reopening lines is instant. */
export function BrandLinePicker({ categorySlug, brand, search, isAdmin = false, onProductUpdated }: BrandLineRowsProps) {
  const { products, failed, retry } = useProducts({ category: categorySlug, brand })
  const [openLine, setOpenLine] = useState<string | null>(null)

  const lines = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products ?? []) {
      if (!p.productLine) continue
      counts.set(p.productLine, (counts.get(p.productLine) ?? 0) + 1)
    }
    const known = PRODUCT_LINES_BY_BRAND[brand] ?? []
    const ordered = known.filter((line) => counts.has(line))
    const extra = [...counts.keys()].filter((line) => !ordered.includes(line)).sort()
    return [...ordered, ...extra].map((line) => ({ line, count: counts.get(line) ?? 0 }))
  }, [products, brand])

  if (products === null && !failed) {
    return (
      <div className="border-t border-dashed border-blue-100/90 px-1.5 pb-1.5 pt-1" aria-busy="true" aria-label={`Loading ${brand} lines`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-dashed border-blue-200/70 bg-white/70 px-3.5 py-3.5 first:mt-0">
            <div className="h-6 w-10 rounded-md bg-slate-100" />
            <div className="h-3 flex-1 rounded bg-slate-100" />
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (failed) {
    return (
      <div className="border-t border-dashed border-blue-100/90 px-3 py-3 text-center">
        <p className="text-[11px] font-semibold text-slate-500">Couldn&apos;t load {brand} right now.</p>
        <button type="button" onClick={retry} className="mt-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
          Try again
        </button>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="border-t border-dashed border-blue-100/90 px-3 py-3 text-center">
        <p className="text-[11px] font-semibold text-slate-400">
          No lines live yet for {brand} in this section.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-dashed border-blue-100/90 px-1.5 pb-1.5 pt-1">
      {lines.map(({ line, count }) => {
        const isOpen = openLine === line
        return (
          <div key={line} className="mt-1.5 overflow-hidden rounded-xl border border-dashed border-blue-300/80 bg-gradient-to-br from-white via-blue-50/35 to-white shop-vape-stripes shadow-inner first:mt-0">
            <button
              type="button"
              onClick={(e) => anchorScroll(e.currentTarget, () => setOpenLine(isOpen ? null : line))}
              className="unity-tap flex w-full items-center justify-between gap-2 px-3.5 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <BrandMark brand={brand} size="xs" />
                <span className="min-w-0 truncate text-[14px] font-bold text-blue-700">
                  {line}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-500">
                  {count} {count === 1 ? "flavour" : "flavours"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-blue-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {isOpen && (
              <Expand>
                <div className="border-t border-dashed border-blue-100/90 p-1.5">
                  <FlavourQuickAddList
                    categorySlug={categorySlug}
                    brand={brand}
                    productLine={line}
                    search={search}
                    isAdmin={isAdmin}
                    onProductUpdated={onProductUpdated}
                  />
                </div>
              </Expand>
            )}
          </div>
        )
      })}
    </div>
  )
}
