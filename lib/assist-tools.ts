// What Unity Assist can look up and do for the signed-in shop. Everything is scoped to
// that shop: its own orders, its own tier prices. It can only *propose* a basket — the
// retailer adds it to their order themselves and checks out as normal.

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { computeNearYou, computeRestock, priceTierFor } from "@/lib/insights"
import { getEffectiveMaxQtyPerOrder } from "@/lib/products"
import { resolveProductPrice } from "@/lib/pricing"

/** Compact product line for the model to reason over (ids, names, this shop's price). */
function brief(p: { id: string; name: string; brand: string; productLine: string | null; packLabel: string; casePrice: number; stock: number }) {
  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    line: p.productLine,
    pack: p.packLabel,
    casePriceExVat: p.casePrice,
    inStock: p.stock > 0,
  }
}

async function searchCatalogue(userId: string, query: string, limit: number) {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1)
    .slice(0, 6)
  if (words.length === 0) return { products: [] }

  const candidates = await prisma.product.findMany({
    where: {
      isActive: true,
      isCatalogueVisible: true,
      isGiftItem: false,
      OR: words.flatMap((w) => [
        { name: { contains: w, mode: "insensitive" as const } },
        { brand: { contains: w, mode: "insensitive" as const } },
        { productLine: { contains: w, mode: "insensitive" as const } },
      ]),
    },
    take: 200,
  })

  // Rank by how many of the words each product matches, so "elf bar blue razz" puts
  // Elf Bar Blue Razz above every other Elf Bar.
  const score = (p: (typeof candidates)[number]) => {
    const hay = `${p.name} ${p.brand} ${p.productLine ?? ""}`.toLowerCase()
    return words.filter((w) => hay.includes(w)).length
  }
  const tier = await priceTierFor(userId)
  return {
    products: candidates
      .map((p) => ({ p, s: score(p) }))
      .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
      .slice(0, limit)
      .map(({ p }) => brief({ ...p, ...resolveProductPrice(p, tier) })),
  }
}

async function recentOrders(userId: string, count: number) {
  const orders = await prisma.order.findMany({
    where: { userId, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
    take: count,
    select: {
      orderNumber: true,
      createdAt: true,
      total: true,
      status: true,
      items: { select: { quantity: true, product: { select: { id: true, name: true, isActive: true } } } },
    },
  })
  return {
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      placed: o.createdAt.toISOString().slice(0, 10),
      totalIncVat: o.total,
      status: o.status,
      lines: o.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        cases: i.quantity,
        stillAvailable: i.product.isActive,
      })),
    })),
  }
}

export type ProposedBasket = {
  lines: { product: Record<string, unknown> & { id: string; name: string; brand: string; casePrice: number }; quantity: number }[]
  totalExVat: number
  note?: string
  unavailable: string[]
}

async function proposeBasket(userId: string, items: { productId: string; quantity: number }[], note?: string): Promise<ProposedBasket> {
  const ids = [...new Set(items.map((i) => i.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true, isGiftItem: false },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  const tier = await priceTierFor(userId)

  const lines: ProposedBasket["lines"] = []
  for (const item of items) {
    const p = byId.get(item.productId)
    if (!p) continue
    const quantity = Math.min(item.quantity, getEffectiveMaxQtyPerOrder(p))
    // Through JSON so dates become strings: the result goes back to the model, which only
    // accepts JSON values (a raw Date fails validation and kills the conversation).
    const product = JSON.parse(JSON.stringify({ ...p, ...resolveProductPrice(p, tier), description: "" }))
    lines.push({ product, quantity })
  }

  return {
    lines,
    totalExVat: Math.round(lines.reduce((sum, l) => sum + l.product.casePrice * l.quantity, 0) * 100) / 100,
    note,
    unavailable: ids.filter((id) => !byId.has(id)),
  }
}

export function assistTools(userId: string) {
  return {
    searchCatalogue: tool({
      description:
        "Search Unity's live trade catalogue by product name, flavour, brand or product line (e.g. 'elf bar blue razz', 'BM6000', 'nic salts'). Returns product ids and this shop's case price ex VAT. Always use this (or the order/insight tools) before naming products or prices — never invent them.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Words to match"),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: ({ query, limit }) => searchCatalogue(userId, query, limit ?? 10),
    }),
    myRecentOrders: tool({
      description: "This shop's most recent orders, newest first, with every line and quantity. Use for 'same as last time' or 'what did I order'.",
      inputSchema: z.object({ count: z.number().int().min(1).max(10).optional() }),
      execute: ({ count }) => recentOrders(userId, count ?? 3),
    }),
    myUsualRestock: tool({
      description: "Lines this shop reorders on a regular rhythm that are due now, with the quantity they usually take. Use for 'my usual' / 'what am I due'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { lines, total } = await computeRestock(userId)
        return {
          totalExVat: total,
          lines: lines.map((l) => ({ ...brief(l.product), usualCases: l.suggestedQty, everyDays: l.everyDays, dueInDays: l.dueInDays })),
        }
      },
    }),
    sellingNearMe: tool({
      description: "Anonymised local trends: products other shops in this shop's postcode area are buying that this shop doesn't stock. Never name or describe individual shops.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await computeNearYou(userId)
        if (result.status !== "ok") return { status: result.status, products: [] }
        return {
          status: "ok",
          area: result.place,
          shopsInArea: result.shopCount,
          products: result.products.map((n) => ({ ...brief(n.product), shopsBuying: n.shops })),
        }
      },
    }),
    proposeBasket: tool({
      description:
        "Show the retailer a basket card they can add to their order with one tap. Use whenever they ask you to build, fill, top up or repeat an order — with product ids from the other tools only. This does NOT place an order or take payment; they review it and check out themselves.",
      inputSchema: z.object({
        items: z
          .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(500).describe("Cases") }))
          .min(1)
          .max(40),
        note: z.string().max(200).optional().describe("One short line explaining the basket"),
      }),
      execute: ({ items, note }) => proposeBasket(userId, items, note),
      // The app gets full product records (to add to the cart); the model only needs a summary.
      toModelOutput: ({ output }) => ({
        type: "json" as const,
        value: {
          shownToRetailer: true,
          lines: output.lines.map((l) => ({ name: l.product.name, cases: l.quantity, casePriceExVat: l.product.casePrice })),
          totalExVat: output.totalExVat,
          unavailable: output.unavailable,
        },
      }),
    }),
  }
}
