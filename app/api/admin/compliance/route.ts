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

    const traders = await prisma.user.findMany({
      where: { role: { in: ["trader", "customer"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        vatNumber: true,
        companyNumber: true,
        retailerLicenseRef: true,
        complianceStatus: true,
        complianceNotes: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(traders)
  } catch (error) {
    console.error("Error fetching compliance list:", error)
    return NextResponse.json({ error: "Failed to fetch compliance list" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, complianceStatus, complianceNotes } = body

    if (!userId || !complianceStatus) {
      return NextResponse.json({ error: "userId and complianceStatus are required" }, { status: 400 })
    }

    const validStatuses = ["pending", "approved", "blocked"]
    if (!validStatuses.includes(complianceStatus)) {
      return NextResponse.json(
        { error: `complianceStatus must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const data: any = { complianceStatus }
    if (complianceNotes !== undefined) data.complianceNotes = complianceNotes

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        complianceStatus: true,
        complianceNotes: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating compliance status:", error)
    return NextResponse.json({ error: "Failed to update compliance status" }, { status: 500 })
  }
}
