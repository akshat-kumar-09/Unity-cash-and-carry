import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Resend } from "resend"
import crypto from "crypto"
import { decryptSecret } from "@/lib/crypto"

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
        priceTier: true,
        walletBalance: true,
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
    const { userId, complianceStatus, complianceNotes, priceTier } = body

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

    if (priceTier !== undefined && !["A", "B", "C"].includes(priceTier)) {
      return NextResponse.json({ error: "priceTier must be one of: A, B, C" }, { status: 400 })
    }

    const data: any = { complianceStatus }
    if (complianceNotes !== undefined) data.complianceNotes = complianceNotes
    if (priceTier !== undefined) data.priceTier = priceTier

    // Fetched BEFORE the update is applied — if a caller ever passes new complianceNotes
    // alongside approval, the temp-password lookup below must still see the *original*
    // notes (where the temp password actually lives), not whatever just overwrote them.
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { approvedAt: true, complianceNotes: true } })

    // Trade Pass "Partner since" date — stamped once, on the first-ever approval, so a
    // later block/re-approve cycle doesn't reset it.
    if (complianceStatus === "approved" && !existing?.approvedAt) {
      data.approvedAt = new Date()
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        complianceStatus: true,
        complianceNotes: true,
        priceTier: true,
      },
    })

    if (complianceStatus === "approved") {
      if (resend) {
        try {
          // Extract temporary password from the PRE-update compliance notes — encrypted-
          // at-rest going forward (see register route), but old rows may still have the
          // plaintext form.
          const match = existing?.complianceNotes?.match(/Generated Temp Password(?: \(encrypted\))?:\s*([^\s\n]+)/)
          const isEncrypted = match ? /\(encrypted\)/.test(match[0]) : false
          const tempPassword = match ? (isEncrypted ? decryptSecret(match[1]) : match[1]) : null

          if (tempPassword) {
            const portalUrl = process.env.APP_URL || "https://app.unitywholesale.co.uk"
            let targetLink = `${portalUrl}/login`

            // Check if inviteOnlyGate is active
            const setting = await prisma.systemSetting.findUnique({
              where: { key: "inviteOnlyGate" }
            })
            const isGateActive = setting ? setting.value === "true" : false

            if (isGateActive) {
              // Reuse a still-valid, unused token if one already exists for this email —
              // otherwise this silently invalidates whichever link was generated earlier
              // (e.g. via the admin panel's "Copy invite link"), even if it was never used.
              const existingInvite = await prisma.inviteToken.findUnique({
                where: { email: user.email.toLowerCase() },
              })
              let token: string
              if (existingInvite && !existingInvite.used && existingInvite.expiresAt > new Date()) {
                token = existingInvite.token
              } else {
                token = crypto.randomBytes(16).toString("hex")
                const expiresAt = new Date()
                expiresAt.setHours(expiresAt.getHours() + 48) // 48 hours

                await prisma.inviteToken.upsert({
                  where: { email: user.email.toLowerCase() },
                  update: { token, expiresAt, used: false, createdAt: new Date() },
                  create: { token, email: user.email.toLowerCase(), expiresAt, used: false }
                })
              }

              targetLink = `${portalUrl}/invite?token=${token}`
            }
            
            await resend.emails.send({
              from: "Unity Cash & Carry <compliance@unitywholesale.co.uk>",
              to: [user.email],
              subject: "Welcome to Unity Cash & Carry — your account is approved",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UNITY CASH &amp; CARRY</h1>
                    <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Glasgow, UK — Wholesale Trade</p>
                  </div>

                  <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Welcome — great to have you with us!</h2>

                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    Hi ${user.name || "there"},<br/><br/>
                    Your trade account is approved and ready to go. Below is your one-time sign-in link — it only
                    opens once, so tap it directly on the device you plan to use rather than forwarding it on.
                  </p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your sign-in details</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>One-time link:</strong> <a href="${targetLink}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${targetLink}</a></p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Login email:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${user.email}</code></p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Temporary password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
                  </div>

                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    Once you're in, you can browse our full wholesale range, place orders, and track everything
                    from your phone. You can change your password any time from Account &gt; Settings. Any
                    questions at all, just get in touch — we're glad to have you on board.
                  </p>

                  <p style="color: #b45309; font-size: 12px; font-weight: 600; margin-bottom: 24px;">
                    For your security, please change your temporary password the first time you sign in.
                  </p>

                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />

                  <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                    This is an automated message from Unity Cash &amp; Carry. If you didn't apply for a trade account
                    with us, please ignore this email or contact us at compliance@unitywholesale.co.uk.
                  </p>
                </div>
              `,
            })
            console.log(`Compliance approval email sent successfully to ${user.email}`)

            // Redact the (now-delivered) password from storage — no reason for it to
            // keep sitting in the DB, encrypted or not, once the user has it. Operates on
            // the pre-update notes (where the match actually came from), not whatever the
            // caller may have just set complianceNotes to in this same request.
            if (match) {
              const redactedNotes = existing!.complianceNotes!.replace(
                match[0],
                "Generated Temp Password: [REDACTED — emailed to user]"
              )
              const updated = await prisma.user.update({
                where: { id: user.id },
                data: { complianceNotes: redactedNotes },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  complianceStatus: true,
                  complianceNotes: true,
                  priceTier: true,
                },
              })
              return NextResponse.json(updated)
            }
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
