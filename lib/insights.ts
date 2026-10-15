// Server-side buying insights shared by the shop cards and Unity Assist.
//
// - Restock autopilot: learns how often a shop reorders each line and suggests the ones
//   that are due, in the quantity they usually take.
// - Selling near you: what other shops in the same postcode area are buying that this shop
//   doesn't stock. Aggregated and anonymised — never shown unless at least
//   MIN_AREA_SHOPS other shops are in the area and MIN_PRODUCT_SHOPS of them bought the
//   product, so no single retailer's buying can be read off it.

import { prisma } from "@/lib/prisma"
import { isPriceTier, resolveProductPrice, type PriceTier } from "@/lib/pricing"
import type { Product } from "@prisma/client"

const DAY_MS = 86_400_000
const RESTOCK_HISTORY_DAYS = 180
const NEAR_YOU_WINDOW_DAYS = 30
const OWN_RECENT_DAYS = 90
const MIN_AREA_SHOPS = 3
const MIN_PRODUCT_SHOPS = 2

/** A product as the cart and shop UI use it: the shop's own tier price applied, and the
 *  long description dropped (not needed here, and it bloats every response). */
export type InsightProduct = Omit<Product, "description"> & { description: string }

export async function priceTierFor(userId: string): Promise<PriceTier> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, priceTier: true } })
  if (!user || user.role === "admin") return "A"
  return isPriceTier(user.priceTier) ? user.priceTier : "A"
}

function forShop(product: Product, tier: PriceTier): InsightProduct {
  return { ...product, ...resolveProductPrice(product, tier), description: "" }
}

async function liveProducts(ids: string[], tier: PriceTier) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true, isCatalogueVisible: true, isGiftItem: false },
  })
  return new Map(products.map((p) => [p.id, forShop(p, tier)]))
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export type RestockLine = {
  product: InsightProduct
  suggestedQty: number
  /** Average days between this shop's orders of the line. */
  everyDays: number
  lastOrderedAt: string
  /** Negative when overdue. */
  dueInDays: number
}

export async function computeRestock(userId: string) {
  const since = new Date(Date.now() - RESTOCK_HISTORY_DAYS * DAY_MS)
  const orders = await prisma.order.findMany({
    where: { userId, status: { not: "cancelled" }, createdAt: { gte: since } },
    select: { createdAt: true, items: { select: { productId: true, quantity: true } } },
    orderBy: { createdAt: "asc" },
  })

  // One data point per order per product (an order can list a product once).
  const history = new Map<string, { at: number; qty: number }[]>()
  for (const order of orders) {
    for (const item of order.items) {
      const points = history.get(item.productId) ?? []
      points.push({ at: order.createdAt.getTime(), qty: item.quantity })
      history.set(item.productId, points)
    }
  }

  const now = Date.now()
  const candidates: { productId: string; suggestedQty: number; everyDays: number; last: number; dueInDays: number }[] = []
  for (const [productId, points] of history) {
    if (points.length < 2) continue
    const first = points[0].at
    const last = points[points.length - 1].at
    const everyDays = (last - first) / DAY_MS / (points.length - 1)
    // Same-day repeat orders aren't a rhythm.
    if (everyDays < 2) continue
    const dueInDays = everyDays - (now - last) / DAY_MS
    // Due now, or within the next day or so.
    if (dueInDays > Math.max(1, everyDays * 0.15)) continue
    candidates.push({
      productId,
      suggestedQty: Math.max(1, Math.round(median(points.map((p) => p.qty)))),
      everyDays: Math.round(everyDays),
      last,
      dueInDays: Math.round(dueInDays),
    })
  }

  const tier = await priceTierFor(userId)
  const products = await liveProducts(candidates.map((c) => c.productId), tier)
  const lines: RestockLine[] = candidates
    .filter((c) => products.has(c.productId))
    .sort((a, b) => a.dueInDays - b.dueInDays)
    .slice(0, 12)
    .map((c) => ({
      product: products.get(c.productId)!,
      suggestedQty: Math.min(c.suggestedQty, products.get(c.productId)!.maxQtyPerOrder || c.suggestedQty),
      everyDays: c.everyDays,
      lastOrderedAt: new Date(c.last).toISOString(),
      dueInDays: c.dueInDays,
    }))

  return {
    lines,
    total: Math.round(lines.reduce((sum, l) => sum + l.product.casePrice * l.suggestedQty, 0) * 100) / 100,
  }
}

/** "G41 1LU" → "G41" (the outward code / postcode district). */
function postcodeDistrict(postcode: string | null | undefined): string | null {
  const compact = (postcode ?? "").replace(/\s+/g, "").toUpperCase()
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) return null
  return compact.slice(0, -3)
}

/** "G41" → "G" (the postcode area, e.g. Glasgow). */
function postcodeArea(district: string | null): string | null {
  return district?.match(/^[A-Z]{1,2}/)?.[0] ?? null
}

/** Readable names for the postcode areas Unity's customers are in ("near Glasgow", not "near G"). */
const AREA_NAMES: Record<string, string> = {
  G: "Glasgow", PA: "Paisley", ML: "Motherwell", KA: "Kilmarnock", FK: "Falkirk", EH: "Edinburgh",
  KY: "Kirkcaldy", DD: "Dundee", PH: "Perth", AB: "Aberdeen", IV: "Inverness", DG: "Dumfries",
  TD: "the Borders", KW: "Kirkwall", HS: "the Western Isles", ZE: "Shetland",
}

export type NearYouProduct = { product: InsightProduct; shops: number; cases: number }

export type NearYouResult =
  | { status: "ok"; place: string; shopCount: number; products: NearYouProduct[] }
  | { status: "no_postcode" | "not_enough_shops"; products: [] }

export async function computeNearYou(userId: string): Promise<NearYouResult> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { postcode: true } })
  const myDistrict = postcodeDistrict(me?.postcode)
  if (!myDistrict) return { status: "no_postcode", products: [] }
  const myArea = postcodeArea(myDistrict)

  const since = new Date(Date.now() - NEAR_YOU_WINDOW_DAYS * DAY_MS)
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "cancelled" }, userId: { not: userId }, user: { postcode: { not: null } } },
    select: { userId: true, user: { select: { postcode: true } }, items: { select: { productId: true, quantity: true } } },
  })

  // Closest level with enough shops: the same district (G41), else the whole area (G).
  const withDistrict = orders.map((o) => ({ ...o, district: postcodeDistrict(o.user.postcode) }))
  const levels = [
    { place: myDistrict, match: (d: string | null) => d === myDistrict },
    { place: (myArea && AREA_NAMES[myArea]) ?? myArea ?? myDistrict, match: (d: string | null) => postcodeArea(d) === myArea },
  ]
  let picked: { place: string; orders: typeof withDistrict } | null = null
  for (const level of levels) {
    const local = withDistrict.filter((o) => level.match(o.district))
    if (new Set(local.map((o) => o.userId)).size >= MIN_AREA_SHOPS) {
      picked = { place: level.place, orders: local }
      break
    }
  }
  if (!picked) return { status: "not_enough_shops", products: [] }

  const tally = new Map<string, { shops: Set<string>; cases: number }>()
  for (const order of picked.orders) {
    for (const item of order.items) {
      const t = tally.get(item.productId) ?? { shops: new Set<string>(), cases: 0 }
      t.shops.add(order.userId)
      t.cases += item.quantity
      tally.set(item.productId, t)
    }
  }

  const mine = await prisma.orderItem.findMany({
    where: { order: { userId, createdAt: { gte: new Date(Date.now() - OWN_RECENT_DAYS * DAY_MS) } } },
    select: { productId: true },
  })
  const alreadyStocked = new Set(mine.map((m) => m.productId))

  const candidates = [...tally.entries()]
    .filter(([id, t]) => t.shops.size >= MIN_PRODUCT_SHOPS && !alreadyStocked.has(id))
    .sort((a, b) => b[1].shops.size - a[1].shops.size || b[1].cases - a[1].cases)
    .slice(0, 16)

  const tier = await priceTierFor(userId)
  const products = await liveProducts(candidates.map(([id]) => id), tier)

  return {
    status: "ok",
    place: picked.place,
    shopCount: new Set(picked.orders.map((o) => o.userId)).size,
    products: candidates
      .filter(([id]) => products.has(id))
      .slice(0, 8)
      .map(([id, t]) => ({ product: products.get(id)!, shops: t.shops.size, cases: t.cases })),
  }
}
