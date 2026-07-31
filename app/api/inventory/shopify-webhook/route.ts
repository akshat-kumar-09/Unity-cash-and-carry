import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookHmac } from "@/lib/shopify"

// Fires whenever staff change a stock quantity in Shopify admin for a product we created
// and linked (shopifyInventoryItemId). This is the "editable from Shopify" half of the
// sync — deliberately one-way (Shopify -> app), nothing here pushes app-side stock back.
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
    const payload = JSON.parse(rawBody) as { inventory_item_id?: number; available?: number }
    if (payload.inventory_item_id === undefined || payload.available === undefined) {
      return NextResponse.json({ error: "Missing inventory_item_id/available" }, { status: 400 })
    }

    const inventoryItemId = `gid://shopify/InventoryItem/${payload.inventory_item_id}`
    const product = await prisma.product.findUnique({ where: { shopifyInventoryItemId: inventoryItemId } })
    if (!product) {
      // Not one of our linked products (or an old/unlinked Shopify product) — ack and ignore.
      return NextResponse.json({ ok: true })
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: Math.max(0, payload.available) },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error handling Shopify inventory webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
