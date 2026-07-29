/**
 * One-off connectivity check for the Shopify custom app credentials.
 * Fetches an access token via the client credentials grant, then makes a
 * trivial GraphQL Admin API call to confirm the token actually works.
 *
 * Usage: pnpm tsx scripts/test-shopify-connection.ts
 */

const shop = process.env.SHOPIFY_SHOP_DOMAIN!
const clientId = process.env.SHOPIFY_CLIENT_ID!
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!
const apiVersion = '2026-07'

async function main() {
  if (!shop || !clientId || !clientSecret) {
    throw new Error('Missing SHOPIFY_SHOP_DOMAIN / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in env')
  }

  console.log(`Requesting access token for ${shop}...`)
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const tokenBody = await tokenRes.text()
  if (!tokenRes.ok) {
    throw new Error(`Token request failed (${tokenRes.status}): ${tokenBody}`)
  }
  const { access_token, scope, expires_in } = JSON.parse(tokenBody)
  console.log(`Got access token. Scopes: ${scope}. Expires in ${expires_in}s.`)

  console.log('Calling GraphQL Admin API (shop name + product count)...')
  const gqlRes = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': access_token,
    },
    body: JSON.stringify({
      query: `{
        shop { name primaryDomain { url } }
        productsCount { count }
        ordersCount(query: "") { count }
      }`,
    }),
  })

  const gqlBody = await gqlRes.text()
  if (!gqlRes.ok) {
    throw new Error(`GraphQL request failed (${gqlRes.status}): ${gqlBody}`)
  }
  console.log('Response:', gqlBody)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
