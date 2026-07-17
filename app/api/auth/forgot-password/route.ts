import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { requestPasswordResetSchema } from "@/lib/validations"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Always returns the same generic response whether or not the email matches an account —
// this endpoint must not let a caller enumerate which emails have accounts.
const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, we've sent a password reset link.",
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limited = rateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000)
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const parsed = requestPasswordResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()
    // Also throttle per-email so one address can't be used to trigger a flood of emails
    // even from rotating IPs.
    const perEmail = rateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000)
    if (!perEmail.allowed) {
      return NextResponse.json(GENERIC_RESPONSE)
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (user && resend) {
      const token = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      })

      const portalUrl = process.env.APP_URL || "https://app.unitywholesale.co.uk"
      const resetLink = `${portalUrl}/reset-password?token=${token}`

      try {
        await resend.emails.send({
          from: "Unity Wholesale <compliance@unitywholesale.co.uk>",
          to: [user.email],
          subject: "Reset your Unity Wholesale password",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UNITY WHOLESALE</h1>
              </div>
              <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Reset your password</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                Hi ${user.name || "there"},<br/>
                We received a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour.
              </p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; display: inline-block;">Reset Password</a>
              </p>
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
            </div>
          `,
        })
      } catch (err) {
        console.error("Failed to send password reset email via Resend:", err)
      }
    } else if (user && !resend) {
      console.warn("Resend API key is not configured. Skipping password reset email.")
    }

    return NextResponse.json(GENERIC_RESPONSE)
  } catch (error) {
    console.error("Error in forgot-password:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
