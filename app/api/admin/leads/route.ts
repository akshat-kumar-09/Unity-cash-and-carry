import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const city = searchParams.get("city")

    const where: any = {}
    if (status) where.status = status
    if (city) where.city = { contains: city, mode: "insensitive" }

    const leads = await prisma.retailerLead.findMany({
      where,
      include: {
        capturedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { visits: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { businessName, contactName, phone, email, address, postcode, city, notes } = body

    if (!businessName || !contactName || !phone || !address || !postcode || !city) {
      return NextResponse.json(
        { error: "businessName, contactName, phone, address, postcode, and city are required" },
        { status: 400 }
      )
    }

    const lead = await prisma.retailerLead.create({
      data: {
        businessName,
        contactName,
        phone,
        email: email ?? null,
        address,
        postcode,
        city,
        notes: notes ?? null,
        capturedById: (session.user as any).id,
      },
      include: {
        capturedBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, notes, followUpDate } = body

    if (!id) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 })
    }

    const data: any = {}
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes
    if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null

    const lead = await prisma.retailerLead.update({
      where: { id },
      data,
      include: {
        capturedBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Error updating lead:", error)
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
  }
}
