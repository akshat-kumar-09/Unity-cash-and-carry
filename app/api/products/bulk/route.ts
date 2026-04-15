import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { bulkUpdateProductsSchema } from "@/lib/validations"
import { auth } from "@/auth"

const MAX_IDS = 300

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bulkUpdateProductsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { productIds: rawIds, ...patchIn } = parsed.data
    const ids = [...new Set(rawIds)]
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `At most ${MAX_IDS} products per request` }, { status: 400 })
    }

    const count = await prisma.product.count({
      where: { id: { in: ids }, isActive: true },
    })
    if (count !== ids.length) {
      return NextResponse.json(
        { error: "Some products were not found or are inactive" },
        { status: 400 }
      )
    }

    const data: {
      casePrice?: number
      unitPrice?: number
      unitsPerPack?: number
      packLabel?: string
      maxQtyPerOrder?: number
    } = {}
    if (patchIn.casePrice !== undefined) data.casePrice = patchIn.casePrice
    if (patchIn.unitPrice !== undefined) data.unitPrice = patchIn.unitPrice
    if (patchIn.unitsPerPack !== undefined) data.unitsPerPack = patchIn.unitsPerPack
    if (patchIn.packLabel !== undefined) data.packLabel = patchIn.packLabel.trim()
    if (patchIn.maxQtyPerOrder !== undefined) data.maxQtyPerOrder = patchIn.maxQtyPerOrder

    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, isActive: true },
      data,
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error("POST /api/products/bulk:", error)
    return NextResponse.json({ error: "Bulk update failed" }, { status: 500 })
  }
}
