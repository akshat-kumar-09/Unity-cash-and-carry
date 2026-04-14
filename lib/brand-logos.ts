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
}

/** Official Elf Bar artwork is on black — match with a dark tile in lists */
export function brandLogoPrefersDarkTile(slug: string): boolean {
  return slug === "elf-bar"
}

/** URLs to try in order; first loadable wins (handled in UI with onError). */
export function getBrandLogoCandidates(brand: string): string[] {
  const s = brandSlug(brand)
  const remote = BRAND_LOGO_REMOTE_URLS[s]?.trim()
  const local = [`/brands/${s}.png`, `/brands/${s}.webp`, `/brands/${s}.svg`]
  if (remote) return [remote, ...local]
  return local
}
