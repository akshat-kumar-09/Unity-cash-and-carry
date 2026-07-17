import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createPaymentOrder, getCheckoutUrl } from "@/lib/viva"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const isAdmin = (session.user as any)?.role === "admin"
    if (!isAdmin && order.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 })
    }
    if (order.total <= 0) {
      return NextResponse.json({ error: "Order has nothing left to pay" }, { status: 400 })
    }

    const orderCode = await createPaymentOrder({
      amount: Math.round(order.total * 100),
      customerEmail: order.customerEmail ?? "",
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? undefined,
      customerTrns: `Unity Cash & Carry order ${order.orderNumber}`,
      merchantTrns: order.orderNumber,
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { vivaOrderCode: orderCode, paymentMethod: "card" },
    })

    return NextResponse.json({ checkoutUrl: getCheckoutUrl(orderCode) })
  } catch (error) {
    console.error("Error creating Viva payment order:", error)
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 })
  }
}
