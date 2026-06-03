import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrderSchema } from "@/lib/validations"
import { auth } from "@/auth"
import { getEffectiveMaxQtyPerOrder } from "@/lib/products"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = (session.user as any)?.role === "admin"
    const where: any = isAdmin ? {} : { userId: (session.user as any).id }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.errors },
        { status: 400 }
      )
    }

    // Fetch products to calculate totals
    const productIds = parsed.data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products are invalid or inactive" },
        { status: 400 }
      )
    }

    for (const item of parsed.data.items) {
      const product = products.find((p) => p.id === item.productId)!
      const lineMax = getEffectiveMaxQtyPerOrder(
        product as { maxQtyPerOrder?: number | null }
      )
      if (item.quantity > lineMax) {
        return NextResponse.json(
          { error: `Order limit for ${product.name}: ${lineMax} case(s)` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = parsed.data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      const totalPrice = product.casePrice * item.quantity
      subtotal += totalPrice
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.casePrice,
        totalPrice,
      }
    })

    // Fetch user for wallet balance
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Apply promo code discount
    let discountAmount = 0
    if (parsed.data.promoCode) {
      const appliedPromo = await prisma.promoCode.findUnique({
        where: { code: parsed.data.promoCode.toUpperCase().trim(), isActive: true },
      })
      if (!appliedPromo) {
        return NextResponse.json(
          { error: "Invalid or inactive promo code" },
          { status: 400 }
        )
      }
      if (subtotal < appliedPromo.minOrderValue) {
        return NextResponse.json(
          { error: `Minimum order value for ${appliedPromo.code} is £${appliedPromo.minOrderValue.toFixed(2)}` },
          { status: 400 }
        )
      }
      if (appliedPromo.discountType === "percentage") {
        discountAmount = subtotal * (appliedPromo.value / 100)
      } else {
        discountAmount = Math.min(appliedPromo.value, subtotal)
      }
      discountAmount = Math.round(discountAmount * 100) / 100
    }

    const vat = Math.round((subtotal - discountAmount) * 0.2 * 100) / 100
    let total = Math.max(0, Math.round((subtotal - discountAmount + vat) * 100) / 100)

    // Deduct wallet credits
    let walletCreditsUsed = 0
    if (parsed.data.useWalletCredits && user.walletBalance > 0) {
      walletCreditsUsed = Math.min(user.walletBalance, total)
      walletCreditsUsed = Math.round(walletCreditsUsed * 100) / 100
      total = Math.round((total - walletCreditsUsed) * 100) / 100
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create order within transaction
    const order = await prisma.$transaction(async (tx) => {
      if (walletCreditsUsed > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: walletCreditsUsed } },
        })

        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            amount: -walletCreditsUsed,
            type: "order_deduction",
            description: `Deducted for order ${orderNumber}`,
          },
        })
      }

      return tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          subtotal,
          vat,
          total,
          customerName: user.name ?? undefined,
          customerEmail: user.email,
          customerPhone: parsed.data.customerPhone,
          shippingAddress: parsed.data.shippingAddress,
          notes: parsed.data.notes,
          promoCode: parsed.data.promoCode?.toUpperCase().trim() ?? null,
          discountAmount,
          walletCreditsUsed,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
