import { z } from 'zod'
import { PRODUCT_CATEGORY_SLUGS, type ProductCategorySlug } from '@/lib/product-categories'

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
  /** Omitted or blank → server assigns an auto SKU */
  sku: z.string().min(1).max(64).optional(),
  packLabel: z.string().min(1),
  unitsPerPack: z.number().int().positive(),
  unitPrice: z.number().positive(),
  casePrice: z.number().positive(),
  /** Tier A/B wholesale overrides — omitted/null falls back to unitPrice/casePrice (Tier C). */
  unitPriceA: z.number().positive().optional().nullable(),
  casePriceA: z.number().positive().optional().nullable(),
  unitPriceB: z.number().positive().optional().nullable(),
  casePriceB: z.number().positive().optional().nullable(),
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

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  shippingAddress: z.string().min(1),
  customerPhone: z.string().min(1),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
  useWalletCredits: z.boolean().optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "dispatched", "delivered", "cancelled"]),
})

export const createGuestOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  shippingAddress: z.string().min(1),
  notes: z.string().optional(),
  tradeCode: z.string().min(1),
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
    unitPrice: z.number().positive().optional(),
    casePrice: z.number().positive().optional(),
    /** Tier A/B wholesale overrides — null clears the override back to unitPrice/casePrice. */
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
      d.nicotineStrengthMg !== undefined,
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
