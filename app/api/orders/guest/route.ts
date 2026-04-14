import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createGuestOrderSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

const VALID_TRADE_CODES = ["TRUSTANDUNITY", "BESTINGLASGOW"]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createGuestOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { tradeCode, customerEmail, customerName, customerPhone, shippingAddress, notes, items } = parsed.data

    if (!VALID_TRADE_CODES.includes(tradeCode.toUpperCase())) {
      return NextResponse.json({ error: "Invalid trade code" }, { status: 403 })
    }

    const productIds = items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products are invalid or inactive" },
        { status: 400 }
      )
    }

    let subtotal = 0
    const orderItems = items.map((item) => {
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

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: customerEmail.toLowerCase() },
    })

    if (!user) {
      const hashedPassword = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      user = await prisma.user.create({
        data: {
          email: customerEmail.toLowerCase(),
          name: customerName,
          password: hashedPassword,
          role: "customer",
        },
      })
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        subtotal,
        vat,
        total,
        customerName,
        customerEmail: customerEmail.toLowerCase(),
        customerPhone,
        shippingAddress,
        notes,
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
    console.error("Error creating guest order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
