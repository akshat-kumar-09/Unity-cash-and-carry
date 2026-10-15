import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/** The checkout details this retailer asked us to remember, to prefill the next checkout. */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { savedPhone: true, savedAddress: true, savedFulfillment: true, savedPaymentMethod: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      phone: user.savedPhone,
      address: user.savedAddress,
      fulfillmentMethod: user.savedFulfillment,
      paymentMethod: user.savedPaymentMethod,
    })
  } catch (error) {
    console.error("Error loading checkout details:", error)
    return NextResponse.json({ error: "Failed to load checkout details" }, { status: 500 })
  }
}

/** Forget the remembered checkout details (Account → Saved checkout details → Forget). */
export async function DELETE() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { savedPhone: null, savedAddress: null, savedFulfillment: null, savedPaymentMethod: null },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error forgetting checkout details:", error)
    return NextResponse.json({ error: "Failed to forget checkout details" }, { status: 500 })
  }
}
