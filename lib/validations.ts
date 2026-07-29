import { z } from 'zod'
import { PRODUCT_CATEGORY_SLUGS, type ProductCategorySlug } from '@/lib/product-categories'

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

const isProductCategory = (c: string): c is ProductCategorySlug =>
  (PRODUCT_CATEGORY_SLUGS as readonly string[]).includes(c)

const productFields = {
  name: z.string().min(1),
  /** UK product information — required for new listings (visible description). */
  description: z
    .string()
    .min(20, "Description must be at least 20 characters (UK product information).")
    .max(8000),
  brand: z.string().min(1),
  category: z.string().refine(isProductCategory, 'Invalid category'),
  /** Real per-brand product line (e.g. "BB 4000 Kit", "Higo Salts") — drives the shop's brand→line drilldown for vapes/e-liquids. Null/omitted for categories without a line ladder. */
  productLine: z.string().trim().max(120).optional().nullable(),
  /** Omitted or blank → server assigns an auto SKU */
  sku: z.string().min(1).max(64).optional(),
  packLabel: z.string().min(1),
  unitsPerPack: z.number().int().positive(),
  unitPrice: z.number().positive(),
  casePrice: z.number().positive(),
  /** Tier C/B wholesale overrides — omitted/null falls back to unitPrice/casePrice (Tier A). */
  unitPriceA: z.number().positive().optional().nullable(),
  casePriceA: z.number().positive().optional().nullable(),
  unitPriceB: z.number().positive().optional().nullable(),
  casePriceB: z.number().positive().optional().nullable(),
  /** Suggested resale price per unit, for the cart's margin projection. Omitted/null = hidden. */
  retailPriceUnit: z.number().positive().optional().nullable(),
  maxQtyPerOrder: z.number().int().min(1).max(99999).default(100),
  badge: z.string().optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
  liquidVolumeMl: z.number().nonnegative().default(2.0),
  isSubjectToVapeDuty: z.boolean().default(true),
  nicotineStrengthMg: z.number().nonnegative().default(20.0),
}

export const productSchema = z.preprocess((data) => {
  if (!data || typeof data !== "object") return data
  const d = { ...(data as Record<string, unknown>) }
  if (typeof d.sku === "string" && !d.sku.trim()) delete d.sku
  return d
}, z.object(productFields))

export const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
})

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1),
    /** "delivery" (default) requires a shippingAddress; "click_and_collect" collects
     *  from the Glasgow depot and needs no address. */
    fulfillmentMethod: z.enum(["delivery", "click_and_collect"]).default("delivery"),
    shippingAddress: z.string().min(1).optional(),
    customerPhone: z.string().min(1),
    notes: z.string().optional(),
    promoCode: z.string().optional(),
    useWalletCredits: z.boolean().optional(),
  })
  .refine((d) => d.fulfillmentMethod === "click_and_collect" || !!d.shippingAddress?.trim(), {
    message: "Shipping address is required for delivery orders",
    path: ["shippingAddress"],
  })

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "dispatched", "delivered", "cancelled"]),
})

export const createGuestOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1),
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    customerPhone: z.string().min(1),
    fulfillmentMethod: z.enum(["delivery", "click_and_collect"]).default("delivery"),
    shippingAddress: z.string().min(1).optional(),
    notes: z.string().optional(),
    tradeCode: z.string().min(1),
  })
  .refine((d) => d.fulfillmentMethod === "click_and_collect" || !!d.shippingAddress?.trim(), {
    message: "Shipping address is required for delivery orders",
    path: ["shippingAddress"],
  })

export const tradeCodeSchema = z.object({
  code: z.string().min(1),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  tradeCode: z.string().optional(),
})

/** Admin partial update — name, description, image, prices, units per pack */
export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters (UK product information).")
      .max(8000)
      .optional(),
    imageUrl: z.string().max(2000).optional().nullable(),
    /** Real per-brand product line — null clears it back to "not grouped under a line". */
    productLine: z.string().trim().max(120).optional().nullable(),
    unitPrice: z.number().positive().optional(),
    casePrice: z.number().positive().optional(),
    /** Tier C/B wholesale overrides — null clears the override back to unitPrice/casePrice. */
    unitPriceA: z.number().positive().optional().nullable(),
    casePriceA: z.number().positive().optional().nullable(),
    unitPriceB: z.number().positive().optional().nullable(),
    casePriceB: z.number().positive().optional().nullable(),
    /** Units per box/case (wholesale pack size). */
    unitsPerPack: z.number().int().positive().optional(),
    /** Customer-facing pack line on cards (e.g. Box of 10, Outer of 5). */
    packLabel: z.string().min(1).max(120).optional(),
    /** Max cases per customer order for this line. */
    maxQtyPerOrder: z.number().int().min(1).max(99999).optional(),
    liquidVolumeMl: z.number().nonnegative().optional(),
    isSubjectToVapeDuty: z.boolean().optional(),
    nicotineStrengthMg: z.number().nonnegative().optional(),
    /** "What's Selling" admin curation — any non-null badge features the product on the
     *  trending shelf (e.g. "Popular", "New"); null unfeatures it. */
    badge: z.string().trim().max(40).optional().nullable(),
    /** Manual sort position among featured/promoted products (lower = earlier). Null
     *  falls back to updatedAt ordering. */
    trendingOrder: z.number().int().optional().nullable(),
    /** Suggested resale price per unit, for the cart's margin projection. Null clears it. */
    retailPriceUnit: z.number().positive().optional().nullable(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.imageUrl !== undefined ||
      d.unitPrice !== undefined ||
      d.casePrice !== undefined ||
      d.unitPriceA !== undefined ||
      d.casePriceA !== undefined ||
      d.unitPriceB !== undefined ||
      d.casePriceB !== undefined ||
      d.unitsPerPack !== undefined ||
      d.packLabel !== undefined ||
      d.maxQtyPerOrder !== undefined ||
      d.liquidVolumeMl !== undefined ||
      d.isSubjectToVapeDuty !== undefined ||
      d.nicotineStrengthMg !== undefined ||
      d.badge !== undefined ||
      d.trendingOrder !== undefined ||
      d.retailPriceUnit !== undefined,
    { message: "At least one field required" }
  )

/** Admin: same fields applied to many products (catalog bulk edit). */
export const bulkUpdateProductsSchema = z
  .object({
    productIds: z.array(z.string().min(1)).min(1).max(300),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters (UK product information).")
      .max(8000)
      .optional(),
    casePrice: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
    unitPriceA: z.number().positive().optional().nullable(),
    casePriceA: z.number().positive().optional().nullable(),
    unitPriceB: z.number().positive().optional().nullable(),
    casePriceB: z.number().positive().optional().nullable(),
    unitsPerPack: z.number().int().positive().optional(),
    packLabel: z.string().min(1).max(120).optional(),
    maxQtyPerOrder: z.number().int().min(1).max(99999).optional(),
    liquidVolumeMl: z.number().nonnegative().optional(),
    isSubjectToVapeDuty: z.boolean().optional(),
    nicotineStrengthMg: z.number().nonnegative().optional(),
  })
  .refine(
    (d) =>
      d.description !== undefined ||
      d.casePrice !== undefined ||
      d.unitPrice !== undefined ||
      d.unitPriceA !== undefined ||
      d.casePriceA !== undefined ||
      d.unitPriceB !== undefined ||
      d.casePriceB !== undefined ||
      d.unitsPerPack !== undefined ||
      d.packLabel !== undefined ||
      d.maxQtyPerOrder !== undefined ||
      d.liquidVolumeMl !== undefined ||
      d.isSubjectToVapeDuty !== undefined ||
      d.nicotineStrengthMg !== undefined,
    { message: "At least one field to update is required" }
  )

// ---- Rewards page admin content (promo codes, banners, depot perks) ----

export const createPromoCodeSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((s) => s.toUpperCase()),
  description: z.string().trim().min(1).max(200),
  discountType: z.enum(["percentage", "fixed_amount"]),
  value: z.number().positive(),
  minOrderValue: z.number().nonnegative().optional(),
})

export const updatePromoCodeSchema = z
  .object({
    description: z.string().trim().min(1).max(200).optional(),
    discountType: z.enum(["percentage", "fixed_amount"]).optional(),
    value: z.number().positive().optional(),
    minOrderValue: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "At least one field required" })

export const createPromoBannerSchema = z.object({
  imageUrl: z.string().trim().min(1).max(2000),
  altText: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().optional(),
})

export const updatePromoBannerSchema = z
  .object({
    imageUrl: z.string().trim().min(1).max(2000).optional(),
    altText: z.string().trim().min(1).max(200).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "At least one field required" })

/** Fixed icon set the frontend can render for a depot perk — keeps admin input constrained
 *  to icons that actually exist in the UI's icon map. */
export const DEPOT_PERK_ICONS = ["gift", "truck", "shield", "clock", "percent", "star"] as const

export const createDepotPerkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(400),
  icon: z.enum(DEPOT_PERK_ICONS),
  sortOrder: z.number().int().optional(),
})

export const updateDepotPerkSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(400).optional(),
    icon: z.enum(DEPOT_PERK_ICONS).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "At least one field required" })

// ---- Admin orders: bulk actions ----

export const bulkOrderStatusSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["pending", "confirmed", "dispatched", "delivered", "cancelled"]),
})

export const bulkWalletCreditSchema = z.object({
  amount: z.number().refine((n) => n !== 0, "Amount must be non-zero"),
  description: z.string().trim().min(1).max(200),
})
