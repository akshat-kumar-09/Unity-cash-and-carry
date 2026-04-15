import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateProductSchema } from "@/lib/validations"
import { auth } from "@/auth"

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
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, imageUrl, unitPrice, casePrice } = parsed.data
    const data: {
      name?: string
      imageUrl?: string | null
      unitPrice?: number
      casePrice?: number
    } = {}
    if (name !== undefined) data.name = name
    if (imageUrl !== undefined) {
      data.imageUrl = imageUrl === "" || imageUrl === null ? null : imageUrl.trim()
    }
    if (unitPrice !== undefined) data.unitPrice = unitPrice
    if (casePrice !== undefined) data.casePrice = casePrice

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("PATCH product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

/** Soft-delete: hide product from catalog (preserves order history). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ ok: true, id: product.id })
  } catch (error) {
    console.error("DELETE product:", error)
    return NextResponse.json({ error: "Failed to remove product" }, { status: 500 })
  }
}
