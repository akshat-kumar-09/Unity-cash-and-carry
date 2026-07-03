export type PriceTier = "A" | "B" | "C"

export function isPriceTier(value: unknown): value is PriceTier {
  return value === "A" || value === "B" || value === "C"
}

type TieredProduct = {
  unitPrice: number
  casePrice: number
  unitPriceA?: number | null
  casePriceA?: number | null
  unitPriceB?: number | null
  casePriceB?: number | null
}

/** Tier A/B are optional per-SKU overrides — null/missing falls back to the base (Tier C) price. */
export function resolveProductPrice(product: TieredProduct, tier: PriceTier): { unitPrice: number; casePrice: number } {
  if (tier === "A" && product.unitPriceA != null && product.casePriceA != null) {
    return { unitPrice: product.unitPriceA, casePrice: product.casePriceA }
  }
  if (tier === "B" && product.unitPriceB != null && product.casePriceB != null) {
    return { unitPrice: product.unitPriceB, casePrice: product.casePriceB }
  }
  return { unitPrice: product.unitPrice, casePrice: product.casePrice }
}
