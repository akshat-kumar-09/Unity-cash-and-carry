import type { Product } from "./products"

/** Demo-only UK-style product information text (real listings use DB `description`). */
const DEMO_UK_DESCRIPTION =
  "Trade-only wholesale listing. Nicotine-containing product where applicable — not for sale to persons under 18. See retail packaging for full ingredients, nicotine strength, warnings, batch traceability and responsible person details (UK product information)."

/**
 * Hardcoded demo catalogue (12–24 items) for when API/DB is empty.
 * Admin will manage items later; this ensures the UI never shows "No products found".
 */
const rawDemoProducts: Omit<Product, "description">[] = [
  { id: "demo-eb6-blurazz", name: "600 Blue Razz", brand: "Elf Bar", category: "vapes", sku: "EB6-BLRA", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.25, casePrice: 32.5, badge: "Popular" },
  { id: "demo-eb6-watermelon", name: "600 Watermelon", brand: "Elf Bar", category: "vapes", sku: "EB6-WAT", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.25, casePrice: 32.5 },
  { id: "demo-eb6-mango", name: "600 Triple Mango", brand: "Elf Bar", category: "vapes", sku: "EB6-MAN", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.25, casePrice: 32.5 },
  { id: "demo-skec-blurazz", name: "Crystal Blue Razz", brand: "SKE", category: "vapes", sku: "SKC-BLRA", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.5, casePrice: 35.0, badge: "Popular" },
  { id: "demo-skec-watermelon", name: "Crystal Watermelon", brand: "SKE", category: "vapes", sku: "SKC-WAT", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.5, casePrice: 35.0 },
  { id: "demo-ivg24-blurazz", name: "2400 Blue Razz", brand: "IVG", category: "vapes", sku: "IVG24-BLRA", packLabel: "Outer of 5", unitsPerPack: 5, unitPrice: 7.0, casePrice: 35.0 },
  { id: "demo-ivg24-pink", name: "2400 Pink Lemonade", brand: "IVG", category: "vapes", sku: "IVG24-PINK", packLabel: "Outer of 5", unitsPerPack: 5, unitPrice: 7.0, casePrice: 35.0, badge: "New" },
  { id: "demo-hg4k-mango", name: "Crystal 4000 Mango", brand: "Higo", category: "vapes", sku: "HG4K-MAN", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.8, casePrice: 38.0, badge: "Popular" },
  { id: "demo-hg4k-mint", name: "Crystal 4000 Fresh Mint", brand: "Higo", category: "vapes", sku: "HG4K-MINT", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.8, casePrice: 38.0 },
  { id: "demo-hg4k-watermelon", name: "Crystal 4000 Watermelon Bubblegum", brand: "Higo", category: "vapes", sku: "HG4K-WAT", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.8, casePrice: 38.0 },
  { id: "demo-pp-blurazz", name: "Pod Blue Razz", brand: "Pyne Pods", category: "vapes", sku: "PP-BLRA", packLabel: "Pack of 10", unitsPerPack: 10, unitPrice: 3.0, casePrice: 30.0 },
  { id: "demo-pp-cherry", name: "Pod Cherry Cola", brand: "Pyne Pods", category: "vapes", sku: "PP-CHCO", packLabel: "Pack of 10", unitsPerPack: 10, unitPrice: 3.0, casePrice: 30.0 },
  { id: "demo-lm-nera", name: "Lost Mary Nera 30K", brand: "Lost Mary", category: "vapes", sku: "LM-NERA-30K", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 4.2, casePrice: 42.0, badge: "New" },
  { id: "demo-lm-bm600", name: "600 Blueberry", brand: "Lost Mary", category: "vapes", sku: "LM-600-BB", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.2, casePrice: 32.0 },
  { id: "demo-rizla-blue", name: "Blue Regular", brand: "Rizla", category: "papers", sku: "RZ-BLU-50", packLabel: "Box of 50", unitsPerPack: 50, unitPrice: 0.38, casePrice: 19.0, badge: "Best Seller" },
  { id: "demo-rizla-silver", name: "Silver King Size", brand: "Rizla", category: "papers", sku: "RZ-SLV-50", packLabel: "Box of 50", unitsPerPack: 50, unitPrice: 0.45, casePrice: 22.5 },
  { id: "demo-raw-classic", name: "Classic King Size", brand: "RAW", category: "papers", sku: "RAW-CLS-50", packLabel: "Box of 50", unitsPerPack: 50, unitPrice: 0.52, casePrice: 26.0 },
  { id: "demo-swan-filters", name: "Extra Slim Filters", brand: "Swan", category: "filters", sku: "SWN-XSL", packLabel: "Bag", unitsPerPack: 1, unitPrice: 4.2, casePrice: 4.2 },
  { id: "demo-clipper-48", name: "Classic Lighters", brand: "Clipper", category: "lighters_fire", sku: "CLP-CLS-48", packLabel: "Tray of 48", unitsPerPack: 48, unitPrice: 0.65, casePrice: 31.2 },
  { id: "demo-eliq-salt-eb", name: "Nic Salt 10ml Blue Razz", brand: "Elf Bar", category: "e_liquids", sku: "ELIQ-SALT-EB-BR", packLabel: "Pack of 5", unitsPerPack: 5, unitPrice: 2.5, casePrice: 12.5, badge: "New" },
  { id: "demo-eliq-salt-ske", name: "Nic Salt 10ml Watermelon", brand: "SKE", category: "e_liquids", sku: "ELIQ-SALT-SK-W", packLabel: "Pack of 5", unitsPerPack: 5, unitPrice: 2.6, casePrice: 13.0 },
  { id: "demo-eliq-free-ivg", name: "Freebase 50ml Pink Lemonade", brand: "IVG", category: "e_liquids", sku: "ELIQ-FB-IVG-PL", packLabel: "Each", unitsPerPack: 1, unitPrice: 12.99, casePrice: 12.99 },
  { id: "demo-eliq-short-higo", name: "Shortfill 100ml Mango", brand: "Higo", category: "e_liquids", sku: "ELIQ-SF-HG-M", packLabel: "Each", unitsPerPack: 1, unitPrice: 14.5, casePrice: 14.5 },
  { id: "demo-eliq-bar-lm", name: "Bar Salt 20mg Cherry", brand: "Lost Mary", category: "e_liquids", sku: "ELIQ-BS-LM-CH", packLabel: "Box of 10", unitsPerPack: 10, unitPrice: 3.1, casePrice: 31.0 },
]

export const demoProducts: Product[] = rawDemoProducts.map((p) => ({
  ...p,
  description: DEMO_UK_DESCRIPTION,
  maxQtyPerOrder: 100,
}))
