import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updateDepotPerkSchema } from "@/lib/validations"

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
    const parsed = updateDepotPerkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const perk = await prisma.depotPerk.update({ where: { id }, data: parsed.data })
    return NextResponse.json(perk)
  } catch (error) {
    console.error("Error updating depot perk:", error)
    return NextResponse.json({ error: "Failed to update depot perk" }, { status: 500 })
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
    await prisma.depotPerk.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error("Error deleting depot perk:", error)
    return NextResponse.json({ error: "Failed to delete depot perk" }, { status: 500 })
  }
}
