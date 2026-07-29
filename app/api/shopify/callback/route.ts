import { NextRequest, NextResponse } from "next/server"
import { verifyCallbackHmac, exchangeCodeForToken, saveAccessToken } from "@/lib/shopify"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get("state")
  const stateCookie = request.cookies.get("shopify_oauth_state")?.value
  const shop = searchParams.get("shop")
  const code = searchParams.get("code")

  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.json({ error: "Invalid or missing OAuth state" }, { status: 400 })
  }
  if (shop !== process.env.SHOPIFY_SHOP_DOMAIN) {
    return NextResponse.json({ error: "Unexpected shop domain" }, { status: 400 })
  }
  if (!verifyCallbackHmac(searchParams)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 400 })
  }
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
  }

  try {
    const { accessToken, scope } = await exchangeCodeForToken(code)
    await saveAccessToken(accessToken)

    const response = NextResponse.redirect(new URL(`/?shopify=connected&scope=${encodeURIComponent(scope)}`, request.url))
    response.cookies.delete("shopify_oauth_state")
    return response
  } catch (error) {
    console.error("Shopify OAuth callback failed:", error)
    return NextResponse.json({ error: "Failed to complete Shopify install" }, { status: 500 })
  }
}
