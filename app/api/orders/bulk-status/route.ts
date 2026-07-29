import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { bulkOrderStatusSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bulkOrderStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const { orderIds, status } = parsed.data
    const result = await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status },
    })

    return NextResponse.json({ ok: true, updated: result.count, status })
  } catch (error) {
    console.error("Error bulk-updating order status:", error)
    return NextResponse.json({ error: "Failed to update orders" }, { status: 500 })
  }
}
