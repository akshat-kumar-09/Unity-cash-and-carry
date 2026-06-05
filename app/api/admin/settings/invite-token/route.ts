import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import crypto from "crypto"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const tokens = await prisma.inviteToken.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    })

    return NextResponse.json(tokens)
  } catch (error) {
    console.error("Error fetching invite tokens:", error)
    return NextResponse.json({ error: "Failed to fetch invite tokens" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Generate a secure random token
    const token = crypto.randomBytes(16).toString("hex")
    
    // Expires in 48 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    // Upsert so if a token exists for this email, it gets replaced/renewed
    const invite = await prisma.inviteToken.upsert({
      where: { email: email.toLowerCase() },
      update: {
        token,
        expiresAt,
        used: false,
        createdAt: new Date()
      },
      create: {
        token,
        email: email.toLowerCase(),
        expiresAt,
        used: false
      }
    })

    return NextResponse.json(invite)
  } catch (error) {
    console.error("Error creating invite token:", error)
    return NextResponse.json({ error: "Failed to create invite token" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 })
    }

    await prisma.inviteToken.delete({
      where: { token }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invite token:", error)
    return NextResponse.json({ error: "Failed to delete invite token" }, { status: 500 })
  }
}
