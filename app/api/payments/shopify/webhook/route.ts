import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookHmac } from "@/lib/shopify"

// Fires when a draft order's invoice gets paid (or any other order is paid, but we only
// care about ones carrying our tag). Tags survive a draft order -> completed order
// conversion, so `unity-order:<orderNumber>` on the draft order comes back here on the
// paid Order payload — that's how we match it back without a stored Shopify order id.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmac = request.headers.get("x-shopify-hmac-sha256")

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 })
  }

  const shopDomain = request.headers.get("x-shopify-shop-domain")
  if (shopDomain !== process.env.SHOPIFY_SHOP_DOMAIN) {
    return NextResponse.json({ error: "Unexpected shop domain" }, { status: 400 })
  }

  try {
    const payload = JSON.parse(rawBody) as { tags?: string }
    const tags = (payload.tags ?? "").split(",").map((t) => t.trim())
    const orderTag = tags.find((t) => t.startsWith("unity-order:"))
    if (!orderTag) {
      // Not one of our orders (or an order placed directly on the storefront) — ack and ignore.
      return NextResponse.json({ ok: true })
    }

    const orderNumber = orderTag.slice("unity-order:".length)
    const order = await prisma.order.findUnique({ where: { orderNumber } })
    if (!order) {
      console.error(`Shopify webhook: no order found for orderNumber ${orderNumber}`)
      return NextResponse.json({ ok: true })
    }

    // Idempotent: webhooks can be retried/redelivered by Shopify.
    if (order.paymentStatus !== "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "paid", paidAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error handling Shopify orders/paid webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
