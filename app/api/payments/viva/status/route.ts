import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Polled by the success page while waiting for the webhook to land — the redirect back
// from Viva happens in the customer's browser and isn't itself proof of payment, so the
// UI treats it as "processing" until the server-to-server webhook actually marks it paid.
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orderCode = request.nextUrl.searchParams.get("s")
  if (!orderCode) {
    return NextResponse.json({ error: "Missing order code" }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { vivaOrderCode: orderCode } })
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const isAdmin = (session.user as any)?.role === "admin"
  if (!isAdmin && order.userId !== (session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
  })
}
