import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrderSchema } from "@/lib/validations"
import { auth } from "@/auth"
import { getEffectiveMaxQtyPerOrder } from "@/lib/products"
import { resolveProductPrice, isPriceTier, type PriceTier } from "@/lib/pricing"
import { UNITY_BUSINESS, VPD_EFFECTIVE_DATE } from "@/lib/unity-business"
import { defaultPaymentMethod, generateCollectionCode, generatePaymentReference } from "@/lib/payment"
import { sendOrderEmail } from "@/lib/order-emails"

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

    // Fetch user for wallet balance + price tier
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== 'admin' && user.complianceStatus !== 'approved') {
      return NextResponse.json({ error: 'Your account is pending compliance verification. Contact Unity to get approved.' }, { status: 403 })
    }

    // Idempotency guard: a double-tap/double-submit on checkout fires two near-simultaneous
    // POSTs with identical items before the button's own disabled-state can catch up. If this
    // exact cart was already submitted by this user in the last 20s, return that order instead
    // of creating a real duplicate (duplicate = double-shipped stock for a single payment).
    const signature = (items: { productId: string; quantity: number }[]) =>
      items.map((i) => `${i.productId}:${i.quantity}`).sort().join(",")
    const requestSignature = signature(parsed.data.items)

    const recentOrder = await prisma.order.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 20_000) } },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    })
    if (recentOrder && signature(recentOrder.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))) === requestSignature) {
      const fullOrder = await prisma.order.findUnique({
        where: { id: recentOrder.id },
        include: { items: { include: { product: true } } },
      })
      return NextResponse.json(fullOrder, { status: 201 })
    }

    const tier: PriceTier = user.role === "admin" ? "A" : isPriceTier(user.priceTier) ? user.priceTier : "A"

    // Calculate totals (tier-resolved wholesale price — server-computed, never trusts client input)
    let subtotal = 0
    const orderItems = parsed.data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      const { casePrice } = resolveProductPrice(product, tier)
      const totalPrice = casePrice * item.quantity
      subtotal += totalPrice
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: casePrice,
        totalPrice,
      }
    })

    // Vaping Products Duty (VPD) — HMRC-confirmed rate is £2.20/10ml, but the duty itself
    // isn't law until 1 October 2026. Don't charge it on orders placed before that date.
    let vapeDutyAmount = 0
    if (new Date() >= VPD_EFFECTIVE_DATE) {
      for (const item of parsed.data.items) {
        const product = products.find((p) => p.id === item.productId)!
        if (product.isSubjectToVapeDuty) {
          vapeDutyAmount += item.quantity * product.unitsPerPack * product.liquidVolumeMl * 0.22
        }
      }
      vapeDutyAmount = Math.round(vapeDutyAmount * 100) / 100
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

    const taxableAmount = subtotal - discountAmount + vapeDutyAmount
    const vat = Math.round(taxableAmount * 0.2 * 100) / 100
    const vatOnDuty = Math.round(vapeDutyAmount * 0.2 * 100) / 100
    let total = Math.max(0, Math.round((subtotal - discountAmount + vapeDutyAmount + vat) * 100) / 100)

    const isCollect = parsed.data.fulfillmentMethod === "click_and_collect"
    const paymentMethod = parsed.data.paymentMethod ?? defaultPaymentMethod(parsed.data.fulfillmentMethod)

    // Deduct wallet credits. The balance is a float column that picks up binary residue
    // from repeated decrements (3.7199999…), so work from the balance in whole pennies.
    const walletBalance = Math.round(user.walletBalance * 100) / 100
    let walletCreditsUsed = 0
    if (parsed.data.useWalletCredits && walletBalance > 0) {
      walletCreditsUsed = Math.min(walletBalance, total)
      walletCreditsUsed = Math.round(walletCreditsUsed * 100) / 100
      total = Math.round((total - walletCreditsUsed) * 100) / 100
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create order within transaction
    const order = await prisma.$transaction(async (tx) => {
      if (walletCreditsUsed > 0) {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: walletCreditsUsed } },
          select: { walletBalance: true },
        })
        // Snap float residue back to whole pennies so the wallet never shows "£-0.00".
        const pennies = Math.round(updated.walletBalance * 100) / 100
        if (pennies !== updated.walletBalance) {
          await tx.user.update({ where: { id: user.id }, data: { walletBalance: pennies } })
        }

        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            amount: -walletCreditsUsed,
            type: "order_deduction",
            description: `Deducted for order ${orderNumber}`,
          },
        })
      }

      if (parsed.data.saveDetails !== undefined) {
        const save = parsed.data.saveDetails
        await tx.user.update({
          where: { id: user.id },
          data: {
            savedPhone: save ? parsed.data.customerPhone.trim() : null,
            // Collect orders have no address — keep any saved delivery address for next time.
            ...(save
              ? isCollect
                ? {}
                : { savedAddress: parsed.data.shippingAddress?.trim() ?? null }
              : { savedAddress: null }),
            savedFulfillment: save ? parsed.data.fulfillmentMethod : null,
            savedPaymentMethod: save ? paymentMethod : null,
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
          vapeDutyAmount,
          vatOnDuty,
          customerName: user.name ?? undefined,
          customerEmail: user.email,
          customerPhone: parsed.data.customerPhone,
          fulfillmentMethod: parsed.data.fulfillmentMethod,
          shippingAddress: parsed.data.fulfillmentMethod === "click_and_collect" ? null : parsed.data.shippingAddress,
          notes: parsed.data.notes,
          promoCode: parsed.data.promoCode?.toUpperCase().trim() ?? null,
          discountAmount,
          walletCreditsUsed,
          paymentStatus: total <= 0 ? "paid" : "unpaid",
          paymentMethod: total <= 0 ? "wallet" : paymentMethod,
          paymentReference: total > 0 && paymentMethod === "bank_transfer" ? generatePaymentReference() : null,
          collectionCode: isCollect ? generateCollectionCode() : null,
          paidAt: total <= 0 ? new Date() : null,
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

    // Bank transfers need the account details and reference somewhere the retailer can
    // forward or come back to — the app shows them too, but an email outlives the screen.
    if (order.paymentReference) {
      void sendOrderEmail({
        to: user.email,
        name: user.name,
        orderNumber: order.orderNumber,
        subject: "Payment details for your order",
        heading: "Order Received",
        body: "Thanks for your order. Please pay by bank transfer using the details below, quoting the payment reference exactly so we can match it. We'll confirm your order as soon as your payment arrives.",
        details: [
          { label: "Amount Due", value: `£${order.total.toFixed(2)}` },
          { label: "Account Name", value: UNITY_BUSINESS.bank.accountName },
          { label: "Sort Code", value: UNITY_BUSINESS.bank.sortCode },
          { label: "Account Number", value: UNITY_BUSINESS.bank.accountNumber },
          { label: "Payment Reference", value: order.paymentReference },
        ],
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
