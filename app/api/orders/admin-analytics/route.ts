import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { SHOP_CATEGORIES } from "@/lib/product-categories"

const MONTHS_BACK = 6
const TOP_N = 5

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c.id, c.label]))

/** Admin-wide bookkeeping — aggregates every order from every retailer. Admin-only;
 *  this is the business's own revenue data, distinct from the per-customer spend view. */
export async function GET() {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const since = new Date()
    since.setMonth(since.getMonth() - (MONTHS_BACK - 1))
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        total: true,
        createdAt: true,
        userId: true,
        customerName: true,
        user: { select: { name: true, email: true, companyName: true } },
        items: { select: { totalPrice: true, product: { select: { brand: true, category: true } } } },
      },
    })

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const monthLabels: { key: string; label: string }[] = []
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      monthLabels.push({ key: monthKey(d), label: d.toLocaleDateString("en-GB", { month: "short" }) })
    }
    const revenueByMonth = new Map(monthLabels.map((m) => [m.key, 0]))

    const revenueByCategory = new Map<string, number>()
    const revenueByBrand = new Map<string, number>()
    const revenueByRetailer = new Map<string, { label: string; total: number }>()
    let lifetimeRevenue = 0

    for (const order of orders) {
      lifetimeRevenue += order.total
      if (order.createdAt >= since) {
        const key = monthKey(order.createdAt)
        if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + order.total)
      }

      const retailerKey = order.userId
      const retailerLabel = order.user?.companyName || order.user?.name || order.customerName || order.user?.email || "Unknown"
      const existing = revenueByRetailer.get(retailerKey)
      revenueByRetailer.set(retailerKey, { label: retailerLabel, total: (existing?.total ?? 0) + order.total })

      for (const item of order.items) {
        revenueByBrand.set(item.product.brand, (revenueByBrand.get(item.product.brand) ?? 0) + item.totalPrice)
        const categoryLabel = CATEGORY_LABELS[item.product.category] ?? item.product.category
        revenueByCategory.set(categoryLabel, (revenueByCategory.get(categoryLabel) ?? 0) + item.totalPrice)
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    const windowTotal = [...revenueByMonth.values()].reduce((a, b) => a + b, 0)
    const toSortedList = (m: Map<string, number>, cap?: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, cap).map(([label, total]) => ({ label, total: round2(total) }))

    return NextResponse.json({
      monthly: monthLabels.map((m) => ({ month: m.label, total: round2(revenueByMonth.get(m.key) ?? 0) })),
      lifetimeRevenue: round2(lifetimeRevenue),
      averageOrderValue: orders.length > 0 ? round2(lifetimeRevenue / orders.length) : 0,
      totalOrders: orders.length,
      windowTotal: round2(windowTotal),
      revenueByCategory: toSortedList(revenueByCategory),
      revenueByBrand: toSortedList(revenueByBrand, TOP_N),
      topRetailers: [...revenueByRetailer.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_N)
        .map((r) => ({ label: r.label, total: round2(r.total) })),
    })
  } catch (error) {
    console.error("Error computing admin order analytics:", error)
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 })
  }
}
