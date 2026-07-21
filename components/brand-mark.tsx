"use client"

import { useState } from "react"
import { brandInitials } from "@/lib/product-categories"
import { brandLogoPrefersDarkTile, brandSlug, getBrandLogoCandidates } from "@/lib/brand-logos"

/** Fixed slot + object-contain so tall/wide/wordmark assets align in the brand list */
const LOGO_SHELL_BY_SIZE = {
  xs: "flex h-7 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-sm",
  sm: "flex h-12 w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm sm:w-[6rem]",
  lg: "flex h-20 w-[9rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-md",
}
const LOGO_TEXT_BY_SIZE = { xs: "text-[7px]", sm: "text-[10px]", lg: "text-lg" }
const LOGO_MAX_H_BY_SIZE = { xs: "max-h-[1.4rem]", sm: "max-h-[2.75rem]", lg: "max-h-[4.75rem]" }

/** Deterministic color per brand for the initials-fallback badge — keeps every unlogo'd
 *  brand (papers, lighters, most pouches) visually distinct instead of one flat pale tile
 *  repeated everywhere, without needing a real logo asset. Stays in the app's blue family. */
const INITIALS_PALETTES = [
  "from-blue-500 to-indigo-600 ring-blue-300/50",
  "from-cyan-500 to-blue-600 ring-cyan-300/50",
  "from-indigo-500 to-purple-600 ring-indigo-300/50",
  "from-sky-500 to-blue-700 ring-sky-300/50",
  "from-blue-600 to-cyan-500 ring-blue-300/50",
]

function paletteForBrand(brand: string): string {
  let hash = 0
  for (let i = 0; i < brand.length; i++) hash = (hash * 31 + brand.charCodeAt(i)) >>> 0
  return INITIALS_PALETTES[hash % INITIALS_PALETTES.length]
}

export function BrandMark({ brand, size = "sm" }: { brand: string; size?: "xs" | "sm" | "lg" }) {
  const slug = brandSlug(brand)
  const candidates = getBrandLogoCandidates(brand)
  const [idx, setIdx] = useState(0)
  const darkTile = brandLogoPrefersDarkTile(slug)
  const shell = LOGO_SHELL_BY_SIZE[size]

  if (idx >= candidates.length) {
    return (
      <span
        className={`${shell} bg-gradient-to-br ${paletteForBrand(brand)} text-white font-black shadow-sm ring-1 ${LOGO_TEXT_BY_SIZE[size]}`}
      >
        {brandInitials(brand)}
      </span>
    )
  }

  const src = candidates[idx]
  const tile =
    darkTile
      ? "border-neutral-700/90 bg-neutral-950 ring-1 ring-black/25"
      : "border-slate-200/80 bg-white ring-1 ring-slate-200/70"

  return (
    <span className={`${shell} ${tile}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={`h-full w-full object-contain p-1 ${LOGO_MAX_H_BY_SIZE[size]} ${darkTile ? "brightness-[1.02]" : ""}`}
        onError={() => setIdx((i) => i + 1)}
      />
    </span>
  )
}
