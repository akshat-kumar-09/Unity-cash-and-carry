// Shopify Admin API integration (standard OAuth authorization code grant).
// Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
//
// Shopify's authorization-code grant requires a one-time merchant consent redirect
// (app/api/shopify/install -> Shopify's consent screen -> app/api/shopify/callback) and
// returns a permanent access token that isn't re-derivable from the client secret alone.
// It's persisted in SystemSetting rather than env vars, since it's obtained through that
// flow rather than configured up front.
//
// A client_credentials token was tried first but Shopify returned it with zero granted
// scopes for this store — authorization code grant is the flow documented to work
// reliably for any store type.

import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN!
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!
const API_VERSION = "2026-07"
const ACCESS_TOKEN_KEY = "shopify_access_token"

export const SHOPIFY_SCOPES =
  "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_locations"

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

export type CreateShopifyProductParams = {
  title: string
  vendor: string
  sku: string
  price: number
  imageUrl?: string | null
  description?: string
}

/**
 * Creates a real Shopify product (status ACTIVE) with a single default variant carrying
 * our SKU/price. Deliberately doesn't set an initial inventory quantity — new variants
 * default to 0 stock at existing locations, which matches the "staff fills in real counts
 * in Shopify" rollout plan, and avoids needing the read_locations scope for this step.
 */
export async function createShopifyProduct(
  params: CreateShopifyProductParams
): Promise<{ productId: string; variantId: string; inventoryItemId: string }> {
  const productData = await shopifyGraphQL<{
    productCreate: {
      product: { id: string; variants: { nodes: { id: string }[] } } | null
      userErrors: { field: string[]; message: string }[]
    }
  }>(
    `mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id variants(first: 1) { nodes { id } } }
        userErrors { field message }
      }
    }`,
    {
      input: {
        title: params.title,
        vendor: params.vendor,
        status: "ACTIVE",
        descriptionHtml: params.description || undefined,
      },
    }
  )

  if (productData.productCreate.userErrors.length > 0) {
    throw new Error(`Shopify product create failed: ${JSON.stringify(productData.productCreate.userErrors)}`)
  }
  const productId = productData.productCreate.product?.id
  const defaultVariantId = productData.productCreate.product?.variants.nodes[0]?.id
  if (!productId || !defaultVariantId) throw new Error("Shopify product create returned no product/variant")

  const variantData = await shopifyGraphQL<{
    productVariantsBulkUpdate: {
      productVariants: { id: string; inventoryItem: { id: string } }[]
      userErrors: { field: string[]; message: string }[]
    }
  }>(
    `mutation UpdateDefaultVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [{
        id: defaultVariantId,
        price: params.price.toFixed(2),
        inventoryItem: { sku: params.sku, tracked: true },
      }],
    }
  )

  if (variantData.productVariantsBulkUpdate.userErrors.length > 0) {
    throw new Error(
      `Shopify variant update failed: ${JSON.stringify(variantData.productVariantsBulkUpdate.userErrors)}`
    )
  }
  const variant = variantData.productVariantsBulkUpdate.productVariants[0]
  if (!variant) throw new Error("Shopify variant update returned no variant")

  // Best-effort: media import is async on Shopify's side and can fail per-URL (blocked
  // host, bad format) without that being this function's problem to solve — log and move
  // on rather than failing the whole product over an image.
  if (params.imageUrl) {
    try {
      const mediaData = await shopifyGraphQL<{
        productCreateMedia: { userErrors: { field: string[]; message: string }[] }
      }>(
        `mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            userErrors { field message }
          }
        }`,
        { productId, media: [{ originalSource: params.imageUrl, mediaContentType: "IMAGE" }] }
      )
      if (mediaData.productCreateMedia.userErrors.length > 0) {
        console.warn(`Shopify media attach warning for ${productId}:`, mediaData.productCreateMedia.userErrors)
      }
    } catch (e) {
      console.warn(`Shopify media attach failed for ${productId}:`, e)
    }
  }

  return { productId, variantId: variant.id, inventoryItemId: variant.inventoryItem.id }
}

/** Verifies the X-Shopify-Hmac-Sha256 header Shopify signs onto every webhook delivery. */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false
  const digest = crypto.createHmac("sha256", CLIENT_SECRET).update(rawBody, "utf8").digest("base64")
  const digestBuf = Buffer.from(digest)
  const hmacBuf = Buffer.from(hmacHeader)
  return digestBuf.length === hmacBuf.length && crypto.timingSafeEqual(digestBuf, hmacBuf)
}

/** One-time setup: registers a webhook subscription for the given topic. */
export async function registerWebhook(topic: string, callbackUrl: string): Promise<void> {
  const data = await shopifyGraphQL<{
    webhookSubscriptionCreate: {
      webhookSubscription: { id: string } | null
      userErrors: { field: string[]; message: string }[]
    }
  }>(
    `mutation RegisterWebhook($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
      webhookSubscriptionCreate(
        topic: $topic
        webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
      ) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }`,
    { topic, callbackUrl }
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
