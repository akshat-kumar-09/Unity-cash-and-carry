import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookHmac } from "@/lib/shopify"

// Fires when staff edit a product in Shopify admin — currently only syncs price back
// (unitPrice), since that's the field asked for. Other product fields (name, images,
// description) are left alone; the app's catalogue data stays authoritative for those.
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
    const payload = JSON.parse(rawBody) as { variants?: { id: number; price: string }[] }
    const variant = payload.variants?.[0]
    if (!variant) {
      return NextResponse.json({ ok: true })
    }

    const shopifyVariantId = `gid://shopify/ProductVariant/${variant.id}`
    const product = await prisma.product.findUnique({ where: { shopifyVariantId } })
    if (!product) {
      // Not one of our linked products — ack and ignore.
      return NextResponse.json({ ok: true })
    }

    const newPrice = Number(variant.price)
    if (Number.isFinite(newPrice) && newPrice !== product.unitPrice) {
      await prisma.product.update({ where: { id: product.id }, data: { unitPrice: newPrice } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error handling Shopify product-update webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
