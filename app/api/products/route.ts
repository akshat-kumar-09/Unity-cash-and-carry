import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productSchema } from "@/lib/validations"
import { auth } from "@/auth"
import { CATEGORY_SORT_ORDER } from "@/lib/product-categories"

async function resolveSku(provided: string | undefined): Promise<string> {
  let sku =
    typeof provided === "string" && provided.trim().length > 0
      ? provided.trim().toUpperCase()
      : `UCC-${randomBytes(4).toString("hex").toUpperCase()}`
  for (let attempt = 0; attempt < 8; attempt++) {
    const clash = await prisma.product.findUnique({ where: { sku } })
    if (!clash) return sku
    sku = `UCC-${randomBytes(4).toString("hex").toUpperCase()}`
  }
  throw new Error("Could not allocate unique SKU")
}

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const brand = searchParams.get("brand")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)))

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (category && category !== "all") {
      where.category = category
    }

    if (brand && brand !== "All") {
      if (brand === "Accessories") {
        where.brand = { in: ["Rizla", "RAW", "Swan", "Clipper"] }
      } else {
        where.brand = brand
      }
    }

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { brand: { contains: search.trim(), mode: "insensitive" } },
        { sku: { contains: search.trim(), mode: "insensitive" } },
      ]
    }

    const showAllCategories = !category || category === "all"
    const orderByVapesFirst = showAllCategories

    let products: Awaited<ReturnType<typeof prisma.product.findMany>>

    let total: number

    if (orderByVapesFirst) {
      // All page: order by category (vapes first), then brand, name
      const categoryOrder = CATEGORY_SORT_ORDER
      const [allForSort, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          select: { id: true, category: true, brand: true, name: true },
          orderBy: [{ brand: "asc" }, { name: "asc" }],
        }),
        prisma.product.count({ where }),
      ])
      total = totalCount
      const sorted = [...allForSort].sort((a, b) => {
        const orderA = categoryOrder[a.category] ?? 99
        const orderB = categoryOrder[b.category] ?? 99
        if (orderA !== orderB) return orderA - orderB
        if (a.brand !== b.brand) return a.brand.localeCompare(b.brand)
        return a.name.localeCompare(b.name)
      })
      const ids = sorted.slice((page - 1) * limit, page * limit).map((p) => p.id)
      const fullProducts = ids.length > 0 ? await prisma.product.findMany({ where: { id: { in: ids } } }) : []
      const byId = new Map(fullProducts.map((p) => [p.id, p]))
      products = ids.map((id) => byId.get(id)).filter(Boolean) as Awaited<ReturnType<typeof prisma.product.findMany>>
    } else {
      const [result, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: [
            { brand: "asc" },
            { name: "asc" },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ])
      products = result
      total = totalCount
    }

    const totalPages = Math.ceil(total / limit)
    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid product data", details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { sku: rawSku, ...rest } = parsed.data
    const sku = await resolveSku(rawSku)

    const product = await prisma.product.create({
      data: { ...rest, sku },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}
