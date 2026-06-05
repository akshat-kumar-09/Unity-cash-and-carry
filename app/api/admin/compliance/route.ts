import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Resend } from "resend"
import crypto from "crypto"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

    if (complianceStatus === "approved") {
      if (resend) {
        try {
          // Extract temporary password from compliance notes
          const match = user.complianceNotes?.match(/Generated Temp Password:\s*([^\s\n]+)/)
          const tempPassword = match ? match[1] : null

          if (tempPassword) {
            const portalUrl = process.env.APP_URL || "https://app.unitywholesale.co.uk"
            let targetLink = `${portalUrl}/login`

            // Check if inviteOnlyGate is active
            const setting = await prisma.systemSetting.findUnique({
              where: { key: "inviteOnlyGate" }
            })
            const isGateActive = setting ? setting.value === "true" : false

            if (isGateActive) {
              // Generate token
              const token = crypto.randomBytes(16).toString("hex")
              const expiresAt = new Date()
              expiresAt.setHours(expiresAt.getHours() + 48) // 48 hours

              await prisma.inviteToken.upsert({
                where: { email: user.email.toLowerCase() },
                update: { token, expiresAt, used: false, createdAt: new Date() },
                create: { token, email: user.email.toLowerCase(), expiresAt, used: false }
              })

              targetLink = `${portalUrl}/invite?token=${token}`
            }
            
            await resend.emails.send({
              from: "Unity Wholesale <compliance@unitywholesale.co.uk>",
              to: [user.email],
              subject: "Trade Account Approved – Welcome to Unity Wholesale",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UNITY WHOLESALE</h1>
                    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Trade B2B Wholesaler</p>
                  </div>
                  
                  <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Trade Account Approved!</h2>
                  
                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    Hi ${user.name || "there"},<br/>
                    We are pleased to inform you that your trade application has been reviewed and approved by our compliance team.
                  </p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Portal Link:</strong> <a href="${targetLink}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${targetLink}</a></p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Username:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${user.email}</code></p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
                  </div>
                  
                  <p style="color: #ef4444; font-size: 12px; font-weight: 600; margin-bottom: 24px;">
                    ⚠️ Security notice: Please log in and change your temporary password immediately upon your first sign-in.
                  </p>
                  
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
                  
                  <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                    This is an automated security message. If you did not apply for an account with Unity Wholesale, please ignore this email or contact us at compliance@unitywholesale.co.uk.
                  </p>
                </div>
              `,
            })
            console.log(`Compliance approval email sent successfully to ${user.email}`)
          }
        } catch (err) {
          console.error("Failed to send approval email via Resend:", err)
        }
      } else {
        console.warn("Resend API key is not configured. Skipping automated welcome email.")
      }
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating compliance status:", error)
    return NextResponse.json({ error: "Failed to update compliance status" }, { status: 500 })
  }
}
