"use client"

import { useState } from "react"
import type { BrandFilter } from "@/lib/products"

const brandTagline: Record<BrandFilter, string> = {
  All: "All brands",
  Higo: "Premium disposable vapes",
  "Elf Bar": "Best-selling disposables",
  IVG: "High-puff disposables",
  SKE: "Crystal range",
  "Lost Mary": "Popular disposables",
  Killa: "Nicotine pouches",
  "Nordic Spirit": "Nicotine pouches",
  Pablo: "Nicotine pouches",
  Velo: "Nicotine pouches",
  Accessories: "Papers, lighters, filters & more",
}

/** Slug for brand banner filenames: /public/brand-banners/{slug}.jpg */
export const brandBannerSlug: Record<BrandFilter, string> = {
  All: "all",
  Higo: "higo",
  "Elf Bar": "elf-bar",
  IVG: "ivg",
  SKE: "ske",
  "Lost Mary": "lost-mary",
  Killa: "killa",
  "Nordic Spirit": "nordic-spirit",
  Pablo: "pablo",
  Velo: "velo",
  Accessories: "accessories",
}

/** CSS gradients when no banner image is used — blue with subtle green tint */
const brandGradient: Record<BrandFilter, string> = {
  All: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)",
  Higo: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
  "Elf Bar": "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
  IVG: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
  SKE: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
  "Lost Mary": "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  Killa: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
  "Nordic Spirit": "linear-gradient(135deg, #1e3a8a 0%, #38bdf8 100%)",
  Pablo: "linear-gradient(135deg, #78350f 0%, #d97706 100%)",
  Velo: "linear-gradient(135deg, #1e293b 0%, #64748b 100%)",
  Accessories: "linear-gradient(135deg, #1e3a8a 0%, #2dd4bf 90%)",
}

type BrandHeaderProps = {
  brand: BrandFilter
}

/** Brand header: uses image from /public/brand-banners/{slug}.jpg if present, else gradient. See SETUP.md for adding images. */
export function BrandHeader({ brand }: BrandHeaderProps) {
  const [bannerError, setBannerError] = useState(false)
  const tagline = brandTagline[brand]
  const gradient = brandGradient[brand]
  const slug = brandBannerSlug[brand]
  const bannerSrc = `/brand-banners/${slug}.jpg`

  return (
    <section
      className="relative w-full min-h-[100px] flex flex-col justify-center px-4 py-5 mb-4 rounded-lg overflow-hidden border border-blue-200/50 shadow-sm"
      style={{ background: gradient }}
      aria-label={`${brand} – ${tagline}`}
    >
      {/* Optional banner image from /public/brand-banners/{slug}.jpg; onError falls back to gradient */}
      {!bannerError && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
            onError={() => setBannerError(true)}
          />
          <div className="absolute inset-0 bg-slate-900/50 z-[1]" aria-hidden />
        </>
      )}
      <h2 className="text-lg font-bold text-white uppercase tracking-wider drop-shadow-md relative z-10">
        {brand}
      </h2>
      <p className="text-xs text-white/90 font-mono uppercase tracking-wider mt-0.5 relative z-10">
        {tagline}
      </p>
    </section>
  )
}
