import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updatePromoBannerSchema } from "@/lib/validations"

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
    const parsed = updatePromoBannerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const banner = await prisma.promoBanner.update({ where: { id }, data: parsed.data })
    return NextResponse.json(banner)
  } catch (error) {
    console.error("Error updating promo banner:", error)
    return NextResponse.json({ error: "Failed to update promo banner" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    await prisma.promoBanner.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error("Error deleting promo banner:", error)
    return NextResponse.json({ error: "Failed to delete promo banner" }, { status: 500 })
  }
}
