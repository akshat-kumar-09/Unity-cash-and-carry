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
    const { productId, email } = body

    if (!productId || !email) {
      return NextResponse.json({ error: "Product ID and Email are required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const userId = (session.user as any).id

    // Upsert subscription to prevent duplicates
    const subscription = await prisma.stockSubscription.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: {
        email,
      },
      create: {
        userId,
        productId,
        email,
      },
    })

    return NextResponse.json({
      message: "Successfully subscribed to back-in-stock alerts",
      subscription,
    })
  } catch (error) {
    console.error("Error in stock subscription:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
