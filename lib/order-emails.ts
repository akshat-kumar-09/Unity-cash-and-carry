import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type OrderEmail = {
  to: string
  name: string | null
  orderNumber: string
  subject: string
  heading: string
  body: string
  /** Extra label/value rows shown in the reference box under the order number. */
  details?: { label: string; value: string }[]
}

/** Best-effort — a failed notification email must never fail the request that triggered it. */
export async function sendOrderEmail(email: OrderEmail) {
  if (!resend) return

  const rows = [{ label: "Order Reference", value: email.orderNumber }, ...(email.details ?? [])]

  try {
    await resend.emails.send({
      from: "Unity Wholesale <compliance@unitywholesale.co.uk>",
      to: [email.to],
      subject: `${email.subject} — Order ${email.orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UNITY WHOLESALE</h1>
          </div>
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">${email.heading}</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Hi ${email.name || "there"},<br/>
            ${email.body}
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            ${rows
              .map(
                (row, i) => `
            <p style="margin: ${i === 0 ? "0" : "12px 0 0"}; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${row.label}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155; font-weight: 700;">${row.value}</p>`
              )
              .join("")}
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
            This is an automated message from Unity Wholesale.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error("Failed to send order email via Resend:", err)
  }
}
