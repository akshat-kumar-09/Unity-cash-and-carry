import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createPromoBannerSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAdmin = (session.user as { role?: string })?.role === "admin"

    const banners = await prisma.promoBanner.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
    return NextResponse.json({ banners })
  } catch (error) {
    console.error("Error fetching promo banners:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createPromoBannerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const banner = await prisma.promoBanner.create({ data: parsed.data })
    return NextResponse.json(banner, { status: 201 })
  } catch (error) {
    console.error("Error creating promo banner:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
