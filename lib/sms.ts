// Text messages via Twilio's Messages API (https://www.twilio.com/docs/messaging/api/message-resource).
// Configure with TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM — either a Twilio
// number in E.164 form or an alphanumeric sender ID such as "UnityCC" (UK networks accept
// those for one-way messages). Until all three are set, nothing is sent and callers get a
// reason they can show staff.

export type SmsResult = { ok: true; to: string } | { ok: false; reason: string }

/** UK mobile in E.164 (+447…), or null when the number isn't a UK mobile. Accepts the
 *  ways people type them: "07700 900123", "+44 7700 900123", "0044 7700-900123". */
export function toUkMobileE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/[\s\-().]/g, "")
  if (digits.startsWith("+44")) digits = "0" + digits.slice(3)
  else if (digits.startsWith("0044")) digits = "0" + digits.slice(4)
  else if (digits.startsWith("44") && digits.length === 12) digits = "0" + digits.slice(2)
  if (digits.startsWith("0") && digits[1] === "0") return null
  if (!/^07\d{9}$/.test(digits)) return null
  return "+44" + digits.slice(1)
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
}

export async function sendSms(rawTo: string | null | undefined, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) {
    return { ok: false, reason: "Texting isn't set up yet (Twilio keys missing)" }
  }

  const to = toUkMobileE164(rawTo)
  if (!to) {
    return { ok: false, reason: `${rawTo || "No phone number"} isn't a UK mobile number` }
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      return { ok: false, reason: data.message || `Text provider returned ${res.status}` }
    }
    return { ok: true, to }
  } catch (err) {
    console.error("SMS send failed:", err)
    return { ok: false, reason: "Couldn't reach the text provider" }
  }
}
