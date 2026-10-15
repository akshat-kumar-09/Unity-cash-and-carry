import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/** Admin: look up a click & collect order by the code on the retailer's collection pass. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const { code } = await params
    const order = await prisma.order.findUnique({
      where: { collectionCode: code.trim().toUpperCase() },
      include: {
        items: { include: { product: { select: { name: true, brand: true } } } },
        user: { select: { name: true, email: true, companyName: true } },
      },
    })
    if (!order) {
      return NextResponse.json({ error: "No order with that collection code" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error looking up collection code:", error)
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 })
  }
}
