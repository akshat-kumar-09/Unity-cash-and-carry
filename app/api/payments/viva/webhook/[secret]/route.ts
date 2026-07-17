import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWebhookVerificationKey } from "@/lib/viva"

// The [secret] path segment isn't a Viva concept — Viva webhook POSTs aren't signed,
// so this is a locally-chosen unguessable segment (VIVA_WEBHOOK_SECRET) that keeps the
// endpoint from being a publicly-known URL anyone could POST fake "payment succeeded"
// events to. Configure the full URL (including the secret) as the webhook URL in Viva's
// dashboard.

function checkSecret(secret: string) {
  return Boolean(process.env.VIVA_WEBHOOK_SECRET) && secret === process.env.VIVA_WEBHOOK_SECRET
}

// Viva calls this once with GET when you register/verify the webhook URL in the dashboard.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params
  if (!checkSecret(secret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const key = await getWebhookVerificationKey()
    return NextResponse.json({ Key: key })
  } catch (error) {
    console.error("Error fetching Viva webhook verification key:", error)
    return NextResponse.json({ error: "Failed to fetch verification key" }, { status: 500 })
  }
}

// EventTypeId 1796 = Transaction Payment Created (successful payment).
// https://developer.viva.com/webhooks-for-payments/transaction-payment-created/
const EVENT_TRANSACTION_PAYMENT_CREATED = 1796

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params
  if (!checkSecret(secret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json()

    if (body.EventTypeId !== EVENT_TRANSACTION_PAYMENT_CREATED) {
      // Not a payment-success event (could be a different subscribed event) — ack and ignore.
      return NextResponse.json({ ok: true })
    }

    const orderCode = String(body.EventData?.OrderCode ?? "")
    if (!orderCode) {
      return NextResponse.json({ error: "Missing OrderCode" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { vivaOrderCode: orderCode } })
    if (!order) {
      console.error(`Viva webhook: no order found for vivaOrderCode ${orderCode}`)
      return NextResponse.json({ ok: true })
    }

    // Idempotent: webhooks can be retried/redelivered by Viva.
    if (order.paymentStatus !== "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "paid", paidAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error handling Viva webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
