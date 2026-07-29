import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/auth"
import { getAuthorizeUrl } from "@/lib/shopify"

// Visiting this as a logged-in admin kicks off the one-time Shopify install/consent
// flow. Shopify redirects the browser to app/api/shopify/callback afterwards.
export async function GET(request: NextRequest) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === "admin"
  if (!session || !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`

  const response = NextResponse.redirect(getAuthorizeUrl(redirectUri, state))
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return response
}
