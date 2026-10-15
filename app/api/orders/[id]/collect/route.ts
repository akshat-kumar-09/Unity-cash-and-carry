import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { collectOrderSchema } from "@/lib/validations"

/** Admin at the counter: the retailer has collected their click & collect order, paying
 *  any balance by cash or card there and then. Marks it paid (if it wasn't) and done. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const parsed = collectOrderSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: "Payment must be cash or card" }, { status: 400 })
    }

    const { id } = await params
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    if (order.fulfillmentMethod !== "click_and_collect") {
      return NextResponse.json({ error: "Only click & collect orders are handed over at the counter" }, { status: 400 })
    }
    if (order.status === "cancelled") {
      return NextResponse.json({ error: "This order was cancelled" }, { status: 400 })
    }
    if (order.collectedAt) {
      return NextResponse.json({ error: "Already collected", order }, { status: 409 })
    }

    const owes = order.paymentStatus !== "paid" && order.total > 0
    const { paymentMethod } = parsed.data
    if (owes && !paymentMethod) {
      return NextResponse.json({ error: `£${order.total.toFixed(2)} is due — choose cash or card` }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.order.update({
      where: { id },
      data: {
        collectedAt: now,
        readyAt: order.readyAt ?? now,
        status: "delivered",
        ...(owes && { paymentStatus: "paid", paymentMethod, paidAt: now }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error recording collection:", error)
    return NextResponse.json({ error: "Failed to record collection" }, { status: 500 })
  }
}
