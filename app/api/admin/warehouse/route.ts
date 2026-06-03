import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const VPD_RATE = 0.22

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period")

    const where: any = {}
    if (period) where.hmrcPeriod = period

    const extractions = await prisma.warehouseExtraction.findMany({
      where,
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { extractedAt: "desc" },
    })

    const summary = {
      totalDuty: Math.round(extractions.reduce((sum, e) => sum + e.totalDuty, 0) * 100) / 100,
      totalVolumeMl: Math.round(extractions.reduce((sum, e) => sum + e.totalVolumeMl, 0) * 100) / 100,
      totalUnits: extractions.reduce((sum, e) => sum + e.quantityUnits, 0),
      count: extractions.length,
    }

    return NextResponse.json({ extractions, summary })
  } catch (error) {
    console.error("Error fetching warehouse extractions:", error)
    return NextResponse.json({ error: "Failed to fetch extractions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { productId, quantityUnits, notes } = body

    if (!productId || !quantityUnits || quantityUnits < 1) {
      return NextResponse.json({ error: "productId and quantityUnits (>= 1) are required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const liquidVolumeMl = product.liquidVolumeMl
    const totalVolumeMl = Math.round(quantityUnits * liquidVolumeMl * 100) / 100
    const dutyPerUnit = Math.round(liquidVolumeMl * VPD_RATE * 100) / 100
    const totalDuty = Math.round(quantityUnits * dutyPerUnit * 100) / 100

    const now = new Date()
    const hmrcPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const extraction = await prisma.warehouseExtraction.create({
      data: {
        productId,
        quantityUnits,
        liquidVolumeMl,
        totalVolumeMl,
        dutyPerUnit,
        totalDuty,
        extractedBy: (session.user as any).id,
        hmrcPeriod,
        notes: notes ?? null,
      },
      include: { product: { select: { name: true, sku: true } } },
    })

    return NextResponse.json(extraction, { status: 201 })
  } catch (error) {
    console.error("Error creating warehouse extraction:", error)
    return NextResponse.json({ error: "Failed to create extraction" }, { status: 500 })
  }
}
