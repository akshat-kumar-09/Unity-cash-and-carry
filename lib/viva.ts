// Viva Wallet Smart Checkout integration.
// Docs: https://developer.viva.com/smart-checkout/
//
// Two separate credential pairs are involved:
// - VIVA_CLIENT_ID / VIVA_CLIENT_SECRET (OAuth2, used to create payment orders)
// - VIVA_MERCHANT_ID / VIVA_API_KEY (Basic auth, used only to fetch the webhook verification key)
// All four come from the Viva dashboard under Settings > API Access, and exist separately
// for the demo (sandbox) and live accounts.

const VIVA_ENV = process.env.VIVA_ENV === "production" ? "production" : "demo"

const HOSTS =
  VIVA_ENV === "production"
    ? {
        accounts: "https://accounts.vivapayments.com",
        api: "https://api.vivapayments.com",
        checkout: "https://www.vivapayments.com",
      }
    : {
        accounts: "https://demo-accounts.vivapayments.com",
        api: "https://demo-api.vivapayments.com",
        checkout: "https://demo.vivapayments.com",
      }

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.token
  }

  const clientId = process.env.VIVA_CLIENT_ID
  const clientSecret = process.env.VIVA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("VIVA_CLIENT_ID / VIVA_CLIENT_SECRET are not configured")
  }

  const res = await fetch(`${HOSTS.accounts}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) {
    throw new Error(`Viva OAuth token request failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.token
}

export type CreateVivaPaymentOrderParams = {
  /** Amount in pence/cents (minor currency unit) */
  amount: number
  customerEmail: string
  customerName: string
  customerPhone?: string
  /** Shown to the customer on the Viva checkout page */
  customerTrns: string
  /** Your own reference, stored on Viva's side, not shown to the customer */
  merchantTrns: string
}

/**
 * Creates a Viva Smart Checkout payment order and returns its orderCode.
 * IMPORTANT: orderCode is a 16-digit number that exceeds JS's safe integer range —
 * it's extracted from the raw response text as a string before JSON.parse touches it,
 * to avoid silent precision loss.
 */
export async function createPaymentOrder(params: CreateVivaPaymentOrderParams): Promise<string> {
  const sourceCode = process.env.VIVA_SOURCE_CODE
  if (!sourceCode) {
    throw new Error("VIVA_SOURCE_CODE is not configured")
  }

  const token = await getAccessToken()

  const res = await fetch(`${HOSTS.api}/checkout/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      customerTrns: params.customerTrns,
      merchantTrns: params.merchantTrns,
      customer: {
        email: params.customerEmail,
        fullName: params.customerName,
        phone: params.customerPhone ?? "",
        countryCode: "GB",
        requestLang: "en-GB",
      },
      paymentTimeout: 1800,
      preauth: false,
      allowRecurring: false,
      maxInstallments: 0,
      paymentNotification: true,
      disableExactAmount: false,
      disableCash: true,
      disableWallet: true,
      sourceCode,
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Viva create payment order failed: ${res.status} ${text}`)
  }

  const match = text.match(/"orderCode"\s*:\s*(\d+)/)
  if (!match) {
    throw new Error(`Viva create payment order: no orderCode in response: ${text}`)
  }
  return match[1]
}

export function getCheckoutUrl(orderCode: string): string {
  return `${HOSTS.checkout}/web/checkout?ref=${orderCode}`
}

/** Fetches the verification key Viva expects back from GET on the webhook URL during setup. */
export async function getWebhookVerificationKey(): Promise<string> {
  const merchantId = process.env.VIVA_MERCHANT_ID
  const apiKey = process.env.VIVA_API_KEY
  if (!merchantId || !apiKey) {
    throw new Error("VIVA_MERCHANT_ID / VIVA_API_KEY are not configured")
  }

  const res = await fetch(`${HOSTS.checkout}/api/messages/config/token`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${merchantId}:${apiKey}`).toString("base64")}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Viva webhook key request failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { Key: string }
  return data.Key
}
