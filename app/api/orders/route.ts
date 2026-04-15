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

    const vat = subtotal * 0.2
    const total = subtotal + vat

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: (session.user as any).id,
        subtotal,
        vat,
        total,
        customerName: (session.user as any).name ?? undefined,
        customerEmail: (session.user as any).email ?? undefined,
        customerPhone: parsed.data.customerPhone,
        shippingAddress: parsed.data.shippingAddress,
        notes: parsed.data.notes,
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

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
