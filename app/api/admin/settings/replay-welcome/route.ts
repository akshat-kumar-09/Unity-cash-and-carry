import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/** Resets a retailer's welcome-build completion so it plays again on their next login —
 *  for demos and support, not a normal user-facing action. Admin only. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "No account found with that email" }, { status: 404 })
    }

    await prisma.user.update({
      where: { email },
      data: { welcomeGameCompletedAt: null },
    })

    return NextResponse.json({ success: true, email })
  } catch (error) {
    console.error("Error replaying welcome build:", error)
    return NextResponse.json({ error: "Failed to reset welcome build" }, { status: 500 })
  }
}
