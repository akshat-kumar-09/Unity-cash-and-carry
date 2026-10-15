import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { sendSms } from "@/lib/sms"
import { sendOrderEmail } from "@/lib/order-emails"
import { generateCollectionCode } from "@/lib/payment"
import { UNITY_BUSINESS } from "@/lib/unity-business"

/** Admin: a click & collect order has been picked — tell the retailer by text (and email)
 *  that it's ready. Calling it again re-sends the text, e.g. after fixing a phone number. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const { id } = await params
    const order = await prisma.order.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    if (order.fulfillmentMethod !== "click_and_collect") {
      return NextResponse.json({ error: "Only click & collect orders can be marked ready to collect" }, { status: 400 })
    }
    if (order.status === "cancelled" || order.collectedAt) {
      return NextResponse.json({ error: "This order is already collected or cancelled" }, { status: 400 })
    }

    const collectionCode = order.collectionCode ?? generateCollectionCode()
    const owes = order.paymentStatus !== "paid" && order.total > 0
    const amountLine = owes ? `Pay £${order.total.toFixed(2)} cash or card at the counter.` : "Already paid."
    const [street] = UNITY_BUSINESS.addressLines
    const postcode = UNITY_BUSINESS.addressLines.at(-1)?.split(",").at(-1)?.trim() ?? ""

    const sms = await sendSms(
      order.customerPhone,
      `Unity Cash & Carry: your order is ready to collect at ${street}, ${postcode}. ${amountLine} Code ${collectionCode}`
    )

    const updated = await prisma.order.update({
      where: { id },
      data: {
        collectionCode,
        readyAt: order.readyAt ?? new Date(),
        readyNotice: sms.ok ? `Texted ${sms.to}` : `Text not sent: ${sms.reason}`,
        // Ready to collect is at least confirmed.
        ...(order.status === "pending" && { status: "confirmed" }),
      },
    })

    void sendOrderEmail({
      to: order.user.email,
      name: order.user.name,
      orderNumber: order.orderNumber,
      subject: "Your order is ready to collect",
      heading: "Ready to Collect",
      body: `Your order is ready to collect from ${UNITY_BUSINESS.addressLines.join(", ")}. ${amountLine} Show the collection pass in the Orders tab of the app, or quote the code below at the counter.`,
      details: [{ label: "Collection Code", value: collectionCode }],
    })

    return NextResponse.json({ order: updated, sms })
  } catch (error) {
    console.error("Error marking order ready to collect:", error)
    return NextResponse.json({ error: "Failed to mark order ready" }, { status: 500 })
  }
}
