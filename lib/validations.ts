import { z } from 'zod'
import { PRODUCT_CATEGORY_SLUGS, type ProductCategorySlug } from '@/lib/product-categories'

const isProductCategory = (c: string): c is ProductCategorySlug =>
  (PRODUCT_CATEGORY_SLUGS as readonly string[]).includes(c)

const productFields = {
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().refine(isProductCategory, 'Invalid category'),
  /** Omitted or blank → server assigns an auto SKU */
  sku: z.string().min(1).max(64).optional(),
  packLabel: z.string().min(1),
  unitsPerPack: z.number().int().positive(),
  unitPrice: z.number().positive(),
  casePrice: z.number().positive(),
  badge: z.string().optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
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

/** Admin partial update — name and/or product image URL (absolute URL or path like /brands/x.png; empty clears) */
export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    imageUrl: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.name !== undefined || d.imageUrl !== undefined, {
    message: "At least one field required",
  })
