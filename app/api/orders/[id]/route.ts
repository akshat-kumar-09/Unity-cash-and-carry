import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updateOrderStatusSchema } from "@/lib/validations"
import { sendOrderEmail } from "@/lib/order-emails"

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  confirmed: {
    subject: "Your order has been confirmed",
    heading: "Order Confirmed",
    body: "We've confirmed your order and it's being prepared for dispatch.",
  },
  dispatched: {
    subject: "Your order is on its way",
    heading: "Order Dispatched",
    body: "Your order has left our Glasgow warehouse and is on its way to you.",
  },
  delivered: {
    subject: "Your order has been delivered",
    heading: "Order Delivered",
    body: "Your order has been marked as delivered. Thanks for ordering with Unity Wholesale.",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    heading: "Order Cancelled",
    body: "Your order has been cancelled. If this wasn't expected, please get in touch.",
  },
}

function sendStatusEmail(
  order: { orderNumber: string; status: string; user: { name: string | null; email: string } }
) {
  const copy = STATUS_COPY[order.status]
  if (!copy) return
  return sendOrderEmail({ to: order.user.email, name: order.user.name, orderNumber: order.orderNumber, ...copy })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status" }, { status: 400 })
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { status: true, paymentStatus: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Only act on what actually changes — re-sending "mark as paid" for an order that's
    // already paid shouldn't move its paid date or email the retailer a second time.
    const { status, paymentStatus } = parsed.data
    const statusChanged = status !== undefined && status !== existing.status
    const paymentChanged = paymentStatus !== undefined && paymentStatus !== existing.paymentStatus

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(statusChanged && { status }),
        ...(paymentChanged && { paymentStatus, paidAt: paymentStatus === "paid" ? new Date() : null }),
      },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
    })

    // Best-effort — a failed notification email shouldn't fail the update itself.
    if (statusChanged) void sendStatusEmail(order)
    if (paymentChanged && order.paymentStatus === "paid") {
      void sendOrderEmail({
        to: order.user.email,
        name: order.user.name,
        orderNumber: order.orderNumber,
        subject: "Payment received",
        heading: "Payment Received",
        body: `We've received your payment of £${order.total.toFixed(2)}. Thank you.`,
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}
