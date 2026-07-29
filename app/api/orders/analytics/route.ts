import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { SHOP_CATEGORIES } from "@/lib/product-categories"

const MONTHS_BACK = 6
const TOP_BRANDS = 5

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c.id, c.label]))

/** Personal spend analytics — strictly scoped to the requesting user's own orders.
 *  This is financial data; never aggregate or expose another customer's numbers here. */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const since = new Date()
    since.setMonth(since.getMonth() - (MONTHS_BACK - 1))
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
      where: { userId, status: { not: "cancelled" } },
      select: {
        total: true,
        createdAt: true,
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
    const spendByMonth = new Map(monthLabels.map((m) => [m.key, 0]))

    const spendByBrand = new Map<string, number>()
    const spendByCategory = new Map<string, number>()
    let lifetimeTotal = 0
    let ordersInWindow = 0

    for (const order of orders) {
      lifetimeTotal += order.total
      if (order.createdAt >= since) {
        const key = monthKey(order.createdAt)
        if (spendByMonth.has(key)) {
          spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + order.total)
          ordersInWindow++
        }
      }
      for (const item of order.items) {
        spendByBrand.set(item.product.brand, (spendByBrand.get(item.product.brand) ?? 0) + item.totalPrice)
        const categoryLabel = CATEGORY_LABELS[item.product.category] ?? item.product.category
        spendByCategory.set(categoryLabel, (spendByCategory.get(categoryLabel) ?? 0) + item.totalPrice)
      }
    }

    const windowTotal = [...spendByMonth.values()].reduce((a, b) => a + b, 0)
    const round2 = (n: number) => Math.round(n * 100) / 100
    const toSortedList = (m: Map<string, number>, cap?: number) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, cap)
        .map(([label, total]) => ({ label, total: round2(total) }))

    return NextResponse.json({
      monthly: monthLabels.map((m) => ({ month: m.label, total: round2(spendByMonth.get(m.key) ?? 0) })),
      lifetimeTotal: round2(lifetimeTotal),
      averageOrderValue: orders.length > 0 ? round2(lifetimeTotal / orders.length) : 0,
      ordersLast6Months: ordersInWindow,
      windowTotal: round2(windowTotal),
      spendByCategory: toSortedList(spendByCategory),
      spendByBrand: toSortedList(spendByBrand, TOP_BRANDS),
    })
  } catch (error) {
    console.error("Error computing order analytics:", error)
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 })
  }
}
