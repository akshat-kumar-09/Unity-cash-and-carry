/**
 * Brand logos: optional HTTPS URLs (try first), then /public/brands/{slug}.* 
 * Slugs match VAPING_BRANDS names, e.g. "Elf Bar" → elf-bar
 * White-background logos are fine — UI adds a light ring so they read on pale rows.
 */

export function brandSlug(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Remote logo URLs (HTTPS). Local /public/brands/* still used as fallback on error.
 * Elf Bar asset is designed on black — UI uses a dark tile for that slug.
 */
export const BRAND_LOGO_REMOTE_URLS: Record<string, string> = {
  higo: "https://www.higovape.com/wp-content/uploads/2021/05/logo.png",
  ivg: "https://ivapegreat.com/cdn/shop/files/ivglogo_155x.png?v=1774883860",
  "elf-bar": "https://www.elfbar.co.uk/media/logo/stores/9/elfbar-logo-new-200.webp",
  "lost-mary": "https://www.lostmary.co.uk/media/logo/stores/10/lost-mary-logo.png",
  ske: "https://www.skecrystalbar.com/media/logo/stores/11/ske-logo.png",
  // Verified reachable (curl 200, image/png) 2026-07-21. The rest of the pouch/papers
  // roster (Killa, Pablo, Velo, Rizla, RAW, Swan, Clipper) couldn't be resolved to a
  // real logo asset via automated lookup — see /public/brands/README.txt to drop local
  // files for those instead; BrandMark falls back to an initials badge until then.
  // "nordic-spirit" remote URL removed 2026-07-22: nordicspirit.co.uk's asset loads
  // (200 OK) but renders essentially blank at this size — not usable. Using a local
  // /public/brands/nordic-spirit.png instead (real logo, sourced by the user, on an
  // opaque black background — see brandLogoPrefersDarkTile below).
  // Verified reachable (curl 200, image/svg+xml) 2026-07-22.
  pixl: "https://pixlvape.com/cdn/shop/t/23/assets/logo.svg?v=81473123080934450131746800006",
  hyola: "https://hyolavape.com/cdn/shop/t/1/assets/logo.svg?v=183082550757062265501753705937",
  // Verified reachable + visually confirmed real wordmark (curl 200, image/png) 2026-07-22.
  pablo: "https://pablopouch.com/cdn/shop/files/Untitled_design_5_115x.png?v=1758957133",
  // Killa and Velo: no official-site asset could be resolved automatically (Killa/N.G.P.
  // Tobacco has no dedicated brand site; Velo/BAT's is JS/CMS-rendered behind an age-gate).
  // User supplied real logo images directly 2026-07-22 — visually verified, on white
  // background (JPEG, no alpha) — saved locally as /public/brands/{killa,velo}.jpg, no
  // remote entry needed since the local-file fallback already covers it.
}

/** Official Elf Bar / Nordic Spirit artwork is on black — match with a dark tile in lists */
export function brandLogoPrefersDarkTile(slug: string): boolean {
  return slug === "elf-bar" || slug === "nordic-spirit"
}

/** Per-brand logo scale — CSS-transforms the image only, tile/box size is never
 *  affected. Safe for shrinking (<1); values >1 would get cropped by the tile's
 *  overflow-hidden, so a logo that needs to look bigger should have its source file
 *  trimmed of baked-in whitespace instead (see e.g. velo.jpg) rather than scaled up here. */
const BRAND_LOGO_SCALE: Record<string, number> = {
  pixl: 0.75,
}
export function brandLogoScale(slug: string): number {
  return BRAND_LOGO_SCALE[slug] ?? 1
}

/** URLs to try in order; first loadable wins (handled in UI with onError). */
export function getBrandLogoCandidates(brand: string): string[] {
  const s = brandSlug(brand)
  const remote = BRAND_LOGO_REMOTE_URLS[s]?.trim()
  const local = [`/brands/${s}.png`, `/brands/${s}.webp`, `/brands/${s}.svg`, `/brands/${s}.jpg`]
  if (remote) return [remote, ...local]
  return local
}
