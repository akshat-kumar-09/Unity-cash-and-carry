// Shopify Admin API integration (standard OAuth authorization code grant).
// Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
//
// Unlike Viva's client-credentials flow (lib/viva.ts), Shopify's authorization-code grant
// requires a one-time merchant consent redirect (app/api/shopify/install -> Shopify's
// consent screen -> app/api/shopify/callback) and returns a permanent access token that
// isn't re-derivable from the client secret alone. It's persisted in SystemSetting rather
// than env vars, since it's obtained through that flow rather than configured up front.
//
// A client_credentials token was tried first (matching Viva's pattern) but Shopify
// returned it with zero granted scopes for this store — authorization code grant is the
// flow documented to work reliably for any store type.

import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN!
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!
const API_VERSION = "2026-07"
const ACCESS_TOKEN_KEY = "shopify_access_token"

export const SHOPIFY_SCOPES =
  "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory"

export function getAuthorizeUrl(redirectUri: string, state: string): string {
  const url = new URL(`https://${SHOP}/admin/oauth/authorize`)
  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("scope", SHOPIFY_SCOPES)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

/** Verifies the HMAC Shopify signs onto every OAuth callback/redirect query string. */
export function verifyCallbackHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get("hmac")
  if (!hmac) return false

  const params = new URLSearchParams(searchParams)
  params.delete("hmac")
  params.delete("signature")
  const message = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")

  const digest = crypto.createHmac("sha256", CLIENT_SECRET).update(message).digest("hex")
  const digestBuf = Buffer.from(digest)
  const hmacBuf = Buffer.from(hmac)
  return digestBuf.length === hmacBuf.length && crypto.timingSafeEqual(digestBuf, hmacBuf)
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status} ${text}`)
  }

  const data = JSON.parse(text) as { access_token: string; scope: string }
  return { accessToken: data.access_token, scope: data.scope }
}

export async function saveAccessToken(accessToken: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: ACCESS_TOKEN_KEY },
    create: { key: ACCESS_TOKEN_KEY, value: accessToken },
    update: { value: accessToken },
  })
}

export async function isShopifyConnected(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: ACCESS_TOKEN_KEY } })
  return Boolean(row)
}

async function getAccessToken(): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key: ACCESS_TOKEN_KEY } })
  if (!row) {
    throw new Error("Shopify is not connected yet — visit /api/shopify/install as an admin to authorize")
  }
  return row.value
}

export type CreateDraftOrderParams = {
  /** Used as a tag on the draft order so the resulting paid Order can be matched back — Shopify carries tags over when a draft order is completed. */
  orderNumber: string
  customerEmail: string
  customerName: string
  lineItems: { title: string; quantity: number; unitPrice: number }[]
}

/**
 * Creates a Shopify draft order priced from our own line items (not linked to real
 * Shopify product/variant IDs — that mapping doesn't exist yet) and returns its
 * invoiceUrl, which shows Shopify's checkout with Viva as a payment option.
 */
export async function createDraftOrderInvoice(
  params: CreateDraftOrderParams
): Promise<{ draftOrderId: string; invoiceUrl: string }> {
  const data = await shopifyGraphQL<{
    draftOrderCreate: {
      draftOrder: { id: string; invoiceUrl: string } | null
      userErrors: { field: string[]; message: string }[]
    }
  }>(
    `mutation CreateDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id invoiceUrl }
        userErrors { field message }
      }
    }`,
    {
      input: {
        email: params.customerEmail || undefined,
        tags: [`unity-order:${params.orderNumber}`],
        note: `Unity Cash & Carry order ${params.orderNumber}`,
        lineItems: params.lineItems.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          originalUnitPrice: item.unitPrice.toFixed(2),
        })),
      },
    }
  )

  const result = data.draftOrderCreate
  if (result.userErrors.length > 0) {
    throw new Error(`Shopify draft order create failed: ${JSON.stringify(result.userErrors)}`)
  }
  if (!result.draftOrder) {
    throw new Error("Shopify draft order create returned no draftOrder")
  }
  return { draftOrderId: result.draftOrder.id, invoiceUrl: result.draftOrder.invoiceUrl }
}

/** Verifies the X-Shopify-Hmac-Sha256 header Shopify signs onto every webhook delivery. */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false
  const digest = crypto.createHmac("sha256", CLIENT_SECRET).update(rawBody, "utf8").digest("base64")
  const digestBuf = Buffer.from(digest)
  const hmacBuf = Buffer.from(hmacHeader)
  return digestBuf.length === hmacBuf.length && crypto.timingSafeEqual(digestBuf, hmacBuf)
}

/** One-time setup: registers the orders/paid webhook so paid draft orders mark our Order paid. */
export async function registerOrdersPaidWebhook(callbackUrl: string): Promise<void> {
  const data = await shopifyGraphQL<{
    webhookSubscriptionCreate: {
      webhookSubscription: { id: string } | null
      userErrors: { field: string[]; message: string }[]
    }
  }>(
    `mutation RegisterWebhook($callbackUrl: URL!) {
      webhookSubscriptionCreate(
        topic: ORDERS_PAID
        webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
      ) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }`,
    { callbackUrl }
  )
  const result = data.webhookSubscriptionCreate
  if (result.userErrors.length > 0) {
    throw new Error(`Shopify webhook registration failed: ${JSON.stringify(result.userErrors)}`)
  }
}

export async function shopifyGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()
  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL error: ${res.status} ${JSON.stringify(json.errors ?? json)}`)
  }
  return json.data as T
}
