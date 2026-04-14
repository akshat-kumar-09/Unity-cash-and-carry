"use client"

import { useState } from "react"
import { ShieldCheck, Sparkles, Plus } from "lucide-react"
import { AddProductModal } from "./add-product-modal"

export function AdminBanner({ onProductAdded, morphed = false }: { onProductAdded?: () => void; morphed?: boolean }) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div
        className={`relative z-10 mb-1.5 shrink-0 bg-amber-500 text-amber-950 border-b-2 border-amber-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          morphed ? "py-0" : ""
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            morphed ? "px-3 py-1" : "px-3 py-2"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className={`shrink-0 transition-all duration-300 ${morphed ? "w-3 h-3" : "w-4 h-4"}`} />
            <span className={`font-bold uppercase tracking-wider transition-all duration-300 ${morphed ? "text-[10px]" : "text-xs"}`}>
              Admin exclusive
            </span>
            <Sparkles className={`shrink-0 opacity-80 transition-all duration-300 ${morphed ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={`shrink-0 bg-amber-900 text-amber-100 font-bold uppercase tracking-wider rounded flex items-center gap-1.5 hover:bg-amber-950 transition-all duration-300 ${
              morphed ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]"
            }`}
          >
            <Plus className={morphed ? "w-3 h-3" : "w-3.5 h-3.5"} />
            Add Product
          </button>
        </div>
      </div>
      <AddProductModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); onProductAdded?.() }}
      />
    </>
  )
}
