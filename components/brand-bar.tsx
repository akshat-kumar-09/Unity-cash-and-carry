"use client"

import { useRef, useCallback } from "react"
import { brandFilters, type BrandFilter } from "@/lib/products"

export function BrandBar({
  activeBrand,
  onBrandChange,
  compact = false,
}: {
  activeBrand: BrandFilter
  onBrandChange: (brand: BrandFilter) => void
  compact?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (brand: BrandFilter) => {
      onBrandChange(brand)
    },
    [onBrandChange],
  )

  return (
    <div
      ref={scrollRef}
      className={`flex overflow-x-auto scrollbar-hide transition-all ${compact ? "gap-1.5 px-2 py-1" : "gap-2 px-3 py-2"}`}
      role="tablist"
      aria-label="Filter by brand"
    >
      {brandFilters.map((brand) => {
        const isActive = activeBrand === brand
        return (
          <button
            key={brand}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(brand)}
            className={`shrink-0 font-bold uppercase tracking-wider transition-all whitespace-nowrap rounded-xl ${
              compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
            } ${
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-600 border border-slate-200 hover:text-slate-800 hover:border-blue-300 shadow-sm"
            }`}
          >
            {brand}
          </button>
        )
      })}
    </div>
  )
}
