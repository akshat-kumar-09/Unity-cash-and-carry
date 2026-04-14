"use client"

import { Tag } from "lucide-react"

export function TraderBanner({ morphed = false }: { morphed?: boolean }) {
  return (
    <div
      className={`sticky top-[52px] z-40 bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 border-b-2 border-amber-600/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        morphed ? "shadow-md py-0 overflow-hidden" : "shadow-md"
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          morphed ? "px-3 py-1" : "px-3 py-2.5"
        }`}
      >
        <Tag className={`shrink-0 drop-shadow-sm transition-all duration-300 ${morphed ? "w-3 h-3" : "w-4 h-4"}`} />
        <span
          className={`font-bold uppercase tracking-wider transition-all duration-300 ${
            morphed ? "text-[10px]" : "text-xs"
          }`}
        >
          Trade access — Best prices in Glasgow
        </span>
      </div>
    </div>
  )
}
