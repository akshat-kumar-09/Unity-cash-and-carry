import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

type CartLine = { productId: string; quantity: number }

function isCartLineArray(value: unknown): value is CartLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (i) => i && typeof i.productId === "string" && typeof i.quantity === "number" && i.quantity > 0
    )
  )
}

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { cartData: true },
    })

    const lines = isCartLineArray(user?.cartData) ? user!.cartData : []
    if (lines.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const products = await prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, isActive: true },
    })
    const items = lines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId)
        return product ? { product, quantity: line.quantity } : null
      })
      .filter(Boolean)

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Error loading cart:", error)
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const lines: CartLine[] = Array.isArray(body?.items)
      ? body.items
          .filter((i: any) => i?.product?.id && typeof i.quantity === "number" && i.quantity > 0)
          .map((i: any) => ({ productId: i.product.id, quantity: i.quantity }))
      : []

    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { cartData: lines },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving cart:", error)
    return NextResponse.json({ error: "Failed to save cart" }, { status: 500 })
  }
}
