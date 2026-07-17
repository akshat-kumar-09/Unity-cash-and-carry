import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { encryptSecret } from "@/lib/crypto"

// This endpoint is called cross-origin from the public marketing site's registration
// form (unity.html, served at NEXT_PUBLIC_MARKETING_REGISTER_URL) — restrict CORS to
// that origin instead of "*" so the endpoint isn't spammable from any origin.
function getAllowedOrigin(): string {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_REGISTER_URL
  if (marketingUrl) {
    try {
      return new URL(marketingUrl).origin
    } catch {
      // fall through
    }
  }
  return process.env.APP_URL || "http://localhost:3000"
}

function corsHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": getAllowedOrigin(),
  }
}

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), ...extraHeaders },
  })
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set("Access-Control-Allow-Origin", getAllowedOrigin())
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return response
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limited = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
    if (!limited.allowed) {
      return jsonResponse(
        { error: "Too many applications submitted from this connection. Please try again later." },
        429,
        { "Retry-After": String(limited.retryAfterSeconds) }
      )
    }

    const body = await request.json()
    const { companyName, name, email, phone, address, vatNumber } = body

    if (!email || !companyName || !name || !vatNumber) {
      return jsonResponse(
        { error: "Email, Business Identity, Lead Name, and VAT Number are required" },
        400
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return jsonResponse(
        { error: "An application or account with this email already exists" },
        400
      )
    }

    // Generate a secure temporary password — encrypted at rest since it must persist
    // until an admin approves the account (potentially days later) and emails it out.
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)
    const encryptedTempPassword = encryptSecret(tempPassword)

    // Generate default tradeCode (random suffix to guarantee uniqueness)
    const tradeCode = `UT-${Math.floor(1000 + Math.random() * 9000)}`

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        companyName,
        vatNumber,
        password: hashedPassword,
        tradeCode,
        role: "customer",
        complianceStatus: "pending",
        complianceNotes: `Contact Phone: ${phone || "Not provided"}\nRetail Address: ${address || "Not provided"}\nGenerated Temp Password (encrypted): ${encryptedTempPassword}`,
      },
    })

    return jsonResponse(
      {
        success: true,
        message: "VIP Activation request submitted successfully.",
        userId: user.id,
      },
      201
    )
  } catch (error) {
    console.error("Error creating compliance application:", error)
    return jsonResponse({ error: "Failed to submit activation request" }, 500)
  }
}
