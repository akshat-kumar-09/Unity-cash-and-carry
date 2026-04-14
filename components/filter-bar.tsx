"use client"

import { SearchBar } from "./search-bar"
import { BrandBar } from "./brand-bar"
import type { BrandFilter } from "@/lib/products"

type FilterBarProps = {
  search: string
  onSearchChange: (v: string) => void
  activeBrand: BrandFilter
  onBrandChange: (b: BrandFilter) => void
  morphed: boolean
}

export function FilterBar({
  search,
  onSearchChange,
  activeBrand,
  onBrandChange,
  morphed,
}: FilterBarProps) {
  return (
    <div
      className={`sticky top-[96px] flex-shrink-0 z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        morphed
          ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-300/40 border border-slate-200 rounded-2xl mx-3 mt-2 mb-2"
          : "bg-white border-b border-slate-200"
      }`}
    >
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          morphed ? "px-3 pt-2 pb-1.5" : "px-3 pt-1.5 pb-1"
        }`}
      >
        <SearchBar value={search} onChange={onSearchChange} compact={morphed} />
      </div>
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          morphed ? "px-2 pb-2" : "px-3 pb-2"
        }`}
      >
        <BrandBar activeBrand={activeBrand} onBrandChange={onBrandChange} compact={morphed} />
      </div>
    </div>
  )
}
