"use client"

import { Search, X } from "lucide-react"

export function SearchBar({
  value,
  onChange,
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  compact?: boolean
}) {
  return (
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-all ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by Brand, Flavour, or SKU"
        className={`w-full bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans shadow-sm transition-all ${
          compact ? "pl-8 pr-8 py-2 text-[13px]" : "pl-9 pr-9 py-2.5 text-sm"
        }`}
        aria-label="Search products"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded ${compact ? "right-2 w-4 h-4" : "right-2.5 w-5 h-5"}`}
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
