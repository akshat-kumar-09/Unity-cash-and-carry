import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updatePromoCodeSchema } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = updatePromoCodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const promoCode = await prisma.promoCode.update({ where: { id }, data: parsed.data })
    return NextResponse.json(promoCode)
  } catch (error) {
    console.error("Error updating promo code:", error)
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 })
  }
}

/** Soft delete — deactivate rather than remove, consistent with the rest of the app. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const promoCode = await prisma.promoCode.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, id: promoCode.id })
  } catch (error) {
    console.error("Error deleting promo code:", error)
    return NextResponse.json({ error: "Failed to delete promo code" }, { status: 500 })
  }
}
