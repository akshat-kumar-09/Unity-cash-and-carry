import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code, subtotal } = body

    if (!code || typeof subtotal !== "number") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    })

    if (!promoCode || !promoCode.isActive) {
      return NextResponse.json({ error: "Invalid or inactive promo code" }, { status: 404 })
    }

    if (subtotal < promoCode.minOrderValue) {
      return NextResponse.json({
        error: `Minimum order value for ${promoCode.code} is £${promoCode.minOrderValue.toFixed(2)}`
      }, { status: 400 })
    }

    let discountAmount = 0
    if (promoCode.discountType === "percentage") {
      discountAmount = subtotal * (promoCode.value / 100)
    } else {
      discountAmount = Math.min(promoCode.value, subtotal)
    }
    // Round to 2 decimals
    discountAmount = Math.round(discountAmount * 100) / 100

    return NextResponse.json({
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType,
      value: promoCode.value,
      minOrderValue: promoCode.minOrderValue,
      discountAmount,
    })
  } catch (error) {
    console.error("Error in promo validate:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
