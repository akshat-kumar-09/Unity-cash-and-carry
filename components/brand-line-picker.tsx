"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Product } from "@/lib/products"
import { PRODUCT_LINES_BY_BRAND, type ProductCategorySlug } from "@/lib/product-categories"
import { FlavourQuickAddList } from "@/components/flavour-quick-add-list"
import { BrandMark } from "@/components/brand-mark"

/** Matches the higher fetch cap used elsewhere when a screen needs "everything for
 *  this brand" rather than a paginated page — a brand's SKU count within one category
 *  is small (a handful of lines × a handful of flavours), well under the API's 100 cap. */
const LINE_FETCH_LIMIT = 100

type BrandLineRowsProps = {
  categorySlug: ProductCategorySlug
  brand: string
  search: string
}

/** Nested inside an expanded brand row (Vaping/E-liquids): fetches that brand's real
 *  product lines and renders them as its own single-open accordion — tapping a line
 *  expands straight into its flavour quick-add rows, no screen navigation involved. */
export function BrandLinePicker({ categorySlug, brand, search }: BrandLineRowsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openLine, setOpenLine] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("category", categorySlug)
        params.set("brand", brand)
        params.set("limit", String(LINE_FETCH_LIMIT))
        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        setProducts(Array.isArray(data?.products) ? data.products : [])
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [categorySlug, brand])

  useEffect(() => {
    setOpenLine(null)
  }, [categorySlug, brand])

  const lines = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      if (!p.productLine) continue
      counts.set(p.productLine, (counts.get(p.productLine) ?? 0) + 1)
    }
    const known = PRODUCT_LINES_BY_BRAND[brand] ?? []
    const ordered = known.filter((line) => counts.has(line))
    const extra = [...counts.keys()].filter((line) => !ordered.includes(line)).sort()
    return [...ordered, ...extra].map((line) => ({ line, count: counts.get(line) ?? 0 }))
  }, [products, brand])

  if (loading) {
    return (
      <div className="border-t border-dashed border-blue-100/90 px-3 py-3 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500/80">Loading lines…</p>
        </div>
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
              onClick={() => setOpenLine(isOpen ? null : line)}
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
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-blue-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-blue-500" />
                )}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-dashed border-blue-100/90 p-1.5">
                <FlavourQuickAddList
                  categorySlug={categorySlug}
                  brand={brand}
                  productLine={line}
                  search={search}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
