import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updateOrderStatusSchema } from "@/lib/validations"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

async function sendStatusEmail(
  order: { orderNumber: string; status: string; user: { name: string | null; email: string } }
) {
  if (!resend) return
  const copy = STATUS_COPY[order.status]
  if (!copy) return

  try {
    await resend.emails.send({
      from: "Unity Wholesale <compliance@unitywholesale.co.uk>",
      to: [order.user.email],
      subject: `${copy.subject} — Order ${order.orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UNITY WHOLESALE</h1>
          </div>
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">${copy.heading}</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Hi ${order.user.name || "there"},<br/>
            ${copy.body}
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Order Reference</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155; font-weight: 700;">${order.orderNumber}</p>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
            This is an automated message from Unity Wholesale.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error("Failed to send order status email via Resend:", err)
  }
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

    const order = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
    })

    // Best-effort — a failed notification email shouldn't fail the status update itself.
    void sendStatusEmail(order)

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}
