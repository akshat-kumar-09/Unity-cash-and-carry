/**
 * Brand logos live in /public/brands/
 * Name files with a slug of the brand name, e.g.:
 *   elf-bar.png, ske.png, ivg.png, lost-mary.png, higo.png
 * Supported: .png, .webp, .svg (try in order via getBrandLogoCandidates)
 */

export function brandSlug(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** URLs to try in order; first loadable wins (handled in UI with onError). */
export function getBrandLogoCandidates(brand: string): string[] {
  const s = brandSlug(brand)
  return [`/brands/${s}.png`, `/brands/${s}.webp`, `/brands/${s}.svg`]
}
