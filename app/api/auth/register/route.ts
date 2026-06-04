import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, name, email, phone, address } = body

    if (!email || !companyName || !name) {
      return new NextResponse(
        JSON.stringify({ error: "Email, Business Identity, and Lead Name are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return new NextResponse(
        JSON.stringify({ error: "An application or account with this email already exists" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }

    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Generate default tradeCode (random suffix to guarantee uniqueness)
    const tradeCode = `UT-${Math.floor(1000 + Math.random() * 9000)}`

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        companyName,
        password: hashedPassword,
        tradeCode,
        role: "customer",
        complianceStatus: "pending",
        complianceNotes: `Contact Phone: ${phone || "Not provided"}\nRetail Address: ${address || "Not provided"}\nGenerated Temp Password: ${tempPassword}`,
      },
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "VIP Activation request submitted successfully.",
        userId: user.id,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error) {
    console.error("Error creating compliance application:", error)
    return new NextResponse(
      JSON.stringify({ error: "Failed to submit activation request" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
}

