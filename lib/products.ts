import { SHOP_CATEGORIES, type ProductCategorySlug } from "@/lib/product-categories"

export type Category = ProductCategorySlug

export type Brand =
  | "Elf Bar"
  | "SKE"
  | "IVG"
  | "Higo"
  | "Lost Mary"
  | "Hayati"
  | "Pyne Pods"
  | "Dojo"
  | "Rizla"
  | "RAW"
  | "Swan"
  | "Clipper"

export type Product = {
  id: string
  name: string
  brand: string // Changed from Brand to string for API compatibility
  category: string // Changed from Category to string for API compatibility
  sku: string
  packLabel: string
  unitsPerPack: number
  unitPrice: number
  casePrice: number
  badge?: string | null
  isActive?: boolean
  /** Product image URL. Use getProductImageUrl() for placeholder when missing. */
  imageUrl?: string | null
}

const CATEGORY_IMAGES: Record<string, string> = {
  vapes: "/categories/vapes.svg",
  e_liquids: "/categories/vapes.svg",
  papers: "/categories/papers.svg",
  lighters_fire: "/categories/lighters.svg",
  filters: "/categories/filters.svg",
  other: "/categories/accessories.svg",
  accessories: "/categories/accessories.svg",
}

/** Product image URL, or category image when no imageUrl (shows category at a glance). */
export function getProductImageUrl(product: { imageUrl?: string | null; category: string; id: string }): string {
  if (product.imageUrl) return product.imageUrl
  const cat = product.category || "other"
  return CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.vapes
}

// Brand bar uses these display labels -- "Accessories" groups Rizla/RAW/Swan/Clipper
export const brandFilters = [
  "All",
  "Higo",
  "Elf Bar",
  "IVG",
  "SKE",
  "Lost Mary",
  "Hayati",
  "Pyne Pods",
  "Dojo",
  "Accessories",
] as const
export type BrandFilter = (typeof brandFilters)[number]

// Which real brands fall under "Accessories"
const accessoryBrands: string[] = ["Rizla", "RAW", "Swan", "Clipper"]
export function matchesBrandFilter(product: Product, filter: BrandFilter): boolean {
  if (filter === "All") return true
  if (filter === "Accessories") return accessoryBrands.includes(product.brand)
  return product.brand === filter
}

/** Admin & forms: all DB category slugs with labels */
export const categories: { key: Category; label: string }[] = SHOP_CATEGORIES.map((c) => ({
  key: c.id as Category,
  label: c.label,
}))

// ── Helper to generate vape SKUs ───────────────────────────────────
function vape(
  brand: Brand,
  line: string,
  flavour: string,
  skuPrefix: string,
  packLabel: string,
  units: number,
  unitPrice: number,
  casePrice: number,
  badge?: string,
): Product {
  const slug = flavour.toLowerCase().replace(/\s+/g, "-")
  return {
    id: `${skuPrefix.toLowerCase()}-${slug}`,
    name: `${line} ${flavour}`,
    brand,
    category: "vapes",
    sku: `${skuPrefix}-${slug.toUpperCase().slice(0, 4)}`,
    packLabel,
    unitsPerPack: units,
    unitPrice,
    casePrice,
    badge,
  }
}

export const products: Product[] = [
  // ── Elf Bar 600 (Box of 10) ──────────────────────────────────────
  vape("Elf Bar", "600", "Blue Razz", "EB6", "Box of 10", 10, 3.25, 32.5, "Popular"),
  vape("Elf Bar", "600", "Blueberry Sour", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Strawberry Raspberry", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Watermelon", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Grape", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Kiwi Passion", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Pink Lemonade", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Triple Mango", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Strawberry Ice Cream", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Cola", "EB6", "Box of 10", 10, 3.25, 32.5),
  vape("Elf Bar", "600", "Cherry", "EB6", "Box of 10", 10, 3.25, 32.5),

  // ── SKE Crystal (Box of 10) ──────────────────────────────────────
  vape("SKE", "Crystal", "Blue Razz", "SKC", "Box of 10", 10, 3.5, 35.0, "Popular"),
  vape("SKE", "Crystal", "Blueberry Sour", "SKC", "Box of 10", 10, 3.5, 35.0),
  vape("SKE", "Crystal", "Watermelon", "SKC", "Box of 10", 10, 3.5, 35.0),
  vape("SKE", "Crystal", "Pink Lemonade", "SKC", "Box of 10", 10, 3.5, 35.0),
  vape("SKE", "Crystal", "Mango", "SKC", "Box of 10", 10, 3.5, 35.0),
  vape("SKE", "Crystal", "Cherry Cola", "SKC", "Box of 10", 10, 3.5, 35.0),

  // ── IVG 2400 (Outer of 5) ───────────────────────────────────────
  vape("IVG", "2400", "Blue Razz", "IVG24", "Outer of 5", 5, 7.0, 35.0),
  vape("IVG", "2400", "Blueberry Sour", "IVG24", "Outer of 5", 5, 7.0, 35.0),
  vape("IVG", "2400", "Watermelon", "IVG24", "Outer of 5", 5, 7.0, 35.0),
  vape("IVG", "2400", "Pink Lemonade", "IVG24", "Outer of 5", 5, 7.0, 35.0, "New"),
  vape("IVG", "2400", "Mango", "IVG24", "Outer of 5", 5, 7.0, 35.0),

  // ── Higo Crystal / 4000 (Box of 10) ─────────────────────────────
  vape("Higo", "Crystal 4000", "Huba Huba", "HG4K", "Box of 10", 10, 3.8, 38.0),
  vape("Higo", "Crystal 4000", "Watermelon Bubblegum", "HG4K", "Box of 10", 10, 3.8, 38.0),
  vape("Higo", "Crystal 4000", "Fresh Mint", "HG4K", "Box of 10", 10, 3.8, 38.0),
  vape("Higo", "Crystal 4000", "Mango", "HG4K", "Box of 10", 10, 3.8, 38.0, "Popular"),
  vape("Higo", "Crystal 4000", "Strawberry Ice Cream", "HG4K", "Box of 10", 10, 3.8, 38.0),

  // ── Pyne Pods (Pack of 10) ──────────────────────────────────────
  vape("Pyne Pods", "Pod", "Blue Razz", "PP", "Pack of 10", 10, 3.0, 30.0),
  vape("Pyne Pods", "Pod", "Blueberry Sour", "PP", "Pack of 10", 10, 3.0, 30.0),
  vape("Pyne Pods", "Pod", "Watermelon", "PP", "Pack of 10", 10, 3.0, 30.0),
  vape("Pyne Pods", "Pod", "Cherry Cola", "PP", "Pack of 10", 10, 3.0, 30.0),

  // ── Accessories ──────────────────────────────────────────────────
  {
    id: "rizla-blue-50",
    name: "Blue Regular",
    brand: "Rizla",
    category: "papers",
    sku: "RZ-BLU-50",
    packLabel: "Box of 50",
    unitsPerPack: 50,
    unitPrice: 0.38,
    casePrice: 19.0,
    badge: "Best Seller",
  },
  {
    id: "rizla-silver-50",
    name: "Silver King Size",
    brand: "Rizla",
    category: "papers",
    sku: "RZ-SLV-50",
    packLabel: "Box of 50",
    unitsPerPack: 50,
    unitPrice: 0.45,
    casePrice: 22.5,
  },
  {
    id: "raw-classic-50",
    name: "Classic King Size",
    brand: "RAW",
    category: "papers",
    sku: "RAW-CLS-50",
    packLabel: "Box of 50",
    unitsPerPack: 50,
    unitPrice: 0.52,
    casePrice: 26.0,
  },
  {
    id: "raw-organic-50",
    name: "Organic Hemp KS",
    brand: "RAW",
    category: "papers",
    sku: "RAW-ORG-50",
    packLabel: "Box of 50",
    unitsPerPack: 50,
    unitPrice: 0.56,
    casePrice: 28.0,
  },
  {
    id: "swan-extra-slim",
    name: "Extra Slim Filters",
    brand: "Swan",
    category: "filters",
    sku: "SWN-XSL-BG",
    packLabel: "Bag",
    unitsPerPack: 1,
    unitPrice: 4.2,
    casePrice: 4.2,
  },
  {
    id: "clipper-tray-48",
    name: "Classic Lighters",
    brand: "Clipper",
    category: "lighters_fire",
    sku: "CLP-CLS-48",
    packLabel: "Tray of 48",
    unitsPerPack: 48,
    unitPrice: 0.65,
    casePrice: 31.2,
  },
]
