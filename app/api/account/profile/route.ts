import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        companyName: true,
        postcode: true,
        vatNumber: true,
        companyNumber: true,
        retailerLicenseRef: true,
        complianceStatus: true,
        approvedAt: true,
        welcomeGameCompletedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching account profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const { companyName, vatNumber, companyNumber, retailerLicenseRef, postcode } = body

    // Editing any compliance-relevant field resets status to "pending" — same rule the
    // admin-facing form already relies on (an admin must re-verify changed details).
    const data: any = { complianceStatus: "pending" }
    if (companyName !== undefined) data.companyName = companyName
    if (vatNumber !== undefined) data.vatNumber = vatNumber
    if (companyNumber !== undefined) data.companyNumber = companyNumber
    if (retailerLicenseRef !== undefined) data.retailerLicenseRef = retailerLicenseRef
    if (postcode !== undefined) data.postcode = postcode

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        companyName: true,
        postcode: true,
        vatNumber: true,
        companyNumber: true,
        retailerLicenseRef: true,
        complianceStatus: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating account profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
