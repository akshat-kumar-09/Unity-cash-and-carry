/**
 * Single source of truth for product `category` field (DB + API + admin).
 * ~25 top-level categories for scale; shop copy uses short keyword lines only.
 */

export const PRODUCT_CATEGORY_SLUGS = [
  "vapes",
  "e_liquids",
  "nicotine_pouches",
  "cbd_hemp",
  "limited_editions",
  "coils",
  "batteries_chargers",
  "tanks_atomizers",
  "mods_devices",
  "lighters_fire",
  "cleaning_maintenance",
  "novelty_lifestyle",
  "air_freshening",
  "drip_tips",
  "cases_carrying",
  "replacement_glass",
  "wire_cotton",
  "stands_displays",
  "papers",
  "filters",
  "other",
  "gift_sets",
  "bundles",
  "clearance",
] as const

export type ProductCategorySlug = (typeof PRODUCT_CATEGORY_SLUGS)[number]

export const productCategoryEnumList = [...PRODUCT_CATEGORY_SLUGS] as [string, ...string[]]

/** Categories that browse with category only (no brand ladder). */
export const SIMPLE_BROWSE_SLUGS: readonly ProductCategorySlug[] = [
  "papers",
  "filters",
  "lighters_fire",
  "other",
]

export type ShopCategoryStatus = "active" | "coming_soon"

export type ShopCategoryDef = {
  id: ProductCategorySlug
  label: string
  /** Short keyword line for tiles — not full sentences */
  keywords: string
  status: ShopCategoryStatus
  /** Uses subcategory → brand drill-down in shop */
  drilldown: "vape_style" | "none"
}

/** Full shop IA: order = display order (papers / filters / lighters / other last) */
export const SHOP_CATEGORIES: ShopCategoryDef[] = [
  { id: "vapes", label: "Vaping", keywords: "Disposables • pods • kits • hardware", status: "active", drilldown: "vape_style" },
  { id: "e_liquids", label: "E-liquids", keywords: "Salts • freebase • shortfills • bar salts", status: "active", drilldown: "vape_style" },
  { id: "nicotine_pouches", label: "Nicotine pouches", keywords: "Snus • white pouches • nic pods", status: "coming_soon", drilldown: "none" },
  { id: "cbd_hemp", label: "CBD & hemp", keywords: "Oils • edibles • legal UK", status: "coming_soon", drilldown: "none" },
  { id: "limited_editions", label: "Limited editions", keywords: "Drops • exclusives • collabs", status: "coming_soon", drilldown: "none" },
  { id: "coils", label: "Coils & heating", keywords: "Mesh • stock coils • pods", status: "coming_soon", drilldown: "none" },
  { id: "batteries_chargers", label: "Batteries & chargers", keywords: "18650 • USB • external", status: "coming_soon", drilldown: "none" },
  { id: "tanks_atomizers", label: "Tanks & atomizers", keywords: "Sub-ohm • MTL • RTA • RDA", status: "coming_soon", drilldown: "none" },
  { id: "mods_devices", label: "Mods & devices", keywords: "Box • pod mods • regulated", status: "coming_soon", drilldown: "none" },
  { id: "cleaning_maintenance", label: "Cleaning & maintenance", keywords: "Tools • brushes • solution", status: "coming_soon", drilldown: "none" },
  { id: "novelty_lifestyle", label: "Novelty & lifestyle", keywords: "Apparel • keychains • desk", status: "coming_soon", drilldown: "none" },
  { id: "air_freshening", label: "Air freshening", keywords: "Room • car • neutralise", status: "coming_soon", drilldown: "none" },
  { id: "drip_tips", label: "Drip tips & mouthpieces", keywords: "510 • wide bore • resin", status: "coming_soon", drilldown: "none" },
  { id: "cases_carrying", label: "Cases & carrying", keywords: "Pouches • protection • travel", status: "coming_soon", drilldown: "none" },
  { id: "replacement_glass", label: "Replacement glass", keywords: "Pyrex • sections • bubbles", status: "coming_soon", drilldown: "none" },
  { id: "wire_cotton", label: "Wire & cotton", keywords: "DIY • builders • wick", status: "coming_soon", drilldown: "none" },
  { id: "stands_displays", label: "Stands & displays", keywords: "Retail • collection • counter", status: "coming_soon", drilldown: "none" },
  { id: "gift_sets", label: "Gift sets", keywords: "Bundles • retail packs", status: "coming_soon", drilldown: "none" },
  { id: "bundles", label: "Bundles", keywords: "Multi-buy • case deals", status: "coming_soon", drilldown: "none" },
  { id: "clearance", label: "Clearance", keywords: "Reduced • last chance", status: "coming_soon", drilldown: "none" },
  { id: "papers", label: "Papers", keywords: "Rolling • king • slim", status: "active", drilldown: "none" },
  { id: "filters", label: "Filters", keywords: "Tips • slim • carbon", status: "active", drilldown: "none" },
  { id: "lighters_fire", label: "Lighters & fire", keywords: "Torch • classic • impulse", status: "active", drilldown: "none" },
  { id: "other", label: "Other", keywords: "Catch-all • misc • spare parts", status: "active", drilldown: "none" },
]

/** Subcats under hardware vaping (E-liquids split out to top-level). */
export const VAPING_SUBCATEGORIES = [
  "Big Puff Devices",
  "NEW Compliant 600 Puffs",
  "Pre-filled POD Systems",
  "Open POD Systems",
] as const

/** E-liquid section names — same brand ladder as vaping */
export const E_LIQUID_SUBCATEGORIES = [
  "Nic Salts",
  "Freebase",
  "Shortfills",
  "Bar Salts",
] as const

export const VAPING_BRANDS = [
  "Higo",
  "IVG",
  "Elf Bar",
  "Lost Mary",
  "SKE",
] as const

export type VapingBrand = (typeof VAPING_BRANDS)[number]

/** API sort priority (lower = first) */
export const CATEGORY_SORT_ORDER: Record<string, number> = {
  vapes: 1,
  e_liquids: 2,
  nicotine_pouches: 3,
  cbd_hemp: 4,
  limited_editions: 5,
  coils: 6,
  batteries_chargers: 7,
  tanks_atomizers: 8,
  mods_devices: 9,
  lighters_fire: 10,
  cleaning_maintenance: 11,
  novelty_lifestyle: 12,
  air_freshening: 13,
  drip_tips: 14,
  cases_carrying: 15,
  replacement_glass: 16,
  wire_cotton: 17,
  stands_displays: 18,
  papers: 19,
  filters: 20,
  other: 21,
  gift_sets: 22,
  bundles: 23,
  clearance: 24,
}

export function brandInitials(brand: string): string {
  const parts = brand.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return brand.slice(0, 2).toUpperCase()
}
