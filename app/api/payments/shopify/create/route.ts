import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createDraftOrderInvoice } from "@/lib/shopify"

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

    // A single line item for the exact amount owed (order.total already accounts for VAT,
    // discounts, and wallet credits) rather than itemizing — mirrors how the direct Viva
    // integration charged a single `amount`, and avoids reconciling those adjustments into
    // per-line Shopify pricing.
    const { draftOrderId, invoiceUrl } = await createDraftOrderInvoice({
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail ?? "",
      customerName: order.customerName ?? "",
      lineItems: [
        {
          title: `Unity Cash & Carry order ${order.orderNumber}`,
          quantity: 1,
          unitPrice: order.total,
        },
      ],
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { shopifyDraftOrderId: draftOrderId, paymentMethod: "card" },
    })

    return NextResponse.json({ checkoutUrl: invoiceUrl })
  } catch (error) {
    console.error("Error creating Shopify draft order:", error)
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 })
  }
}
