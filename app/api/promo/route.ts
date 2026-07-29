import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createPromoCodeSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = (session.user as { role?: string })?.role === "admin"

    const promoCodes = await prisma.promoCode.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(promoCodes)
  } catch (error) {
    console.error("Error fetching promo codes:", error)
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
    const parsed = createPromoCodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const promoCode = await prisma.promoCode.create({ data: parsed.data })
    return NextResponse.json(promoCode, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A promo code with that code already exists" }, { status: 409 })
    }
    console.error("Error creating promo code:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
