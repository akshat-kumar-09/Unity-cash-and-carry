import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { resolveProductPrice, isPriceTier, type PriceTier } from "@/lib/pricing"

const TRENDING_WINDOW_DAYS = 30
const MAX_RESULTS = 10

/** "What's Selling" shelf — merges two signals:
 *   1. Admin-promoted: any product with a `badge` set (e.g. "Popular", "New") — this is
 *      the existing admin-editable field from add/edit-product-modal, reused as-is so
 *      admin already has direct control over what gets featured here.
 *   2. Organic: real top-sellers by summed order quantity over the last 30 days, across
 *      all trade customers — an actual "what's moving" signal, not fabricated.
 *  Promoted products are listed first; organic fills the remaining slots. */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const promoted = await prisma.product.findMany({
      where: { badge: { not: null }, isActive: true, isCatalogueVisible: true },
      orderBy: [{ trendingOrder: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: MAX_RESULTS,
    })

    const remaining = MAX_RESULTS - promoted.length
    let organicProducts: Awaited<ReturnType<typeof prisma.product.findMany>> = []

    if (remaining > 0) {
      const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      const promotedIds = new Set(promoted.map((p) => p.id))

      const grouped = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { createdAt: { gte: since } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: remaining + promoted.length, // pad in case some overlap with promoted
      })

      const organicIds = grouped.map((g) => g.productId).filter((id) => !promotedIds.has(id)).slice(0, remaining)

      if (organicIds.length > 0) {
        const found = await prisma.product.findMany({
          where: { id: { in: organicIds }, isActive: true, isCatalogueVisible: true },
        })
        const byId = new Map(found.map((p) => [p.id, p]))
        organicProducts = organicIds.map((id) => byId.get(id)).filter(Boolean) as typeof found
      }
    }

    const sessionUser = session.user as { id?: string; role?: string }
    let tier: PriceTier = "A"
    if (sessionUser.role !== "admin" && sessionUser.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { priceTier: true } })
      if (isPriceTier(dbUser?.priceTier)) tier = dbUser!.priceTier as PriceTier
    }

    const withPricing = (list: typeof promoted, reason: "featured" | "trending") =>
      list.map((p) => ({ ...p, ...resolveProductPrice(p, tier), reason }))

    return NextResponse.json({
      products: [...withPricing(promoted, "featured"), ...withPricing(organicProducts, "trending")],
    })
  } catch (error) {
    console.error("Error fetching trending products:", error)
    return NextResponse.json({ error: "Failed to fetch trending products" }, { status: 500 })
  }
}
