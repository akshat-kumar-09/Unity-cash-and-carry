import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookHmac } from "@/lib/shopify"

// Shopify calls this for every paid order in the store. Only ones carrying our
// `unity-order:<orderNumber>` tag matter: those are invoices issued back when the app
// offered card payment through Shopify's checkout. The app no longer issues them (payment
// is by bank transfer or cash on collection), so this now only settles any still open.
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
