import { NextRequest, NextResponse } from "next/server"

// Server-side check for the admin/ops escape hatch into a gated portal — unlike a
// client-side string comparison, ADMIN_BYPASS_SECRET never ships to the browser bundle,
// so it can't be read out of devtools or the JS source.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const secret = process.env.ADMIN_BYPASS_SECRET

  if (!secret || !code || code !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("unity_invite_bypass", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: true,
    httpOnly: false, // read client-side to decide whether to redirect to /invite-only
    sameSite: "lax",
  })
  return res
}
