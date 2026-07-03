/**
 * Bring the app's product catalogue in line with the real product list shown
 * on the public Shopify site (shopify-theme/assets/brand-products.js) — real
 * names + real images, without disturbing pricing an admin has already set.
 *
 * Safe to re-run any time products/categories are added to the site (or added
 * directly below for brands not on the site, e.g. more Higo lines): matches
 * existing DB rows by a deterministic SKU (brand + product name) and only
 * updates name/imageUrl on a match. New products are created and priced by
 * averaging existing sibling products in the same brand+category already in
 * the DB (their Tier C wholesale price is assumed correct); only when no
 * sibling exists does it fall back to an RRP-based estimate, which is always
 * called out in the summary so it can be corrected via the admin dashboard.
 *
 * Usage:
 *   pnpm tsx scripts/import-website-products.ts            # run
 *   pnpm tsx scripts/import-website-products.ts --dry-run  # preview only
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { PRODUCT_CATEGORY_SLUGS } from '../lib/product-categories'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * These brands' existing DB rows are an invented flavour × product-line matrix from an
 * earlier seed script, not real stock. Since their SKU scheme doesn't overlap with the
 * SKUs this import generates, we can't "merge" them — instead we retire (soft-delete via
 * isActive: false) the old rows for these brands and create the real site catalogue in
 * their place. Order history referencing old rows is preserved (no hard delete).
 */
const RETIRE_BRANDS = ['Elf Bar', 'Lost Mary', 'SKE', 'IVG', 'Higo', 'Hayati', 'Dojo']

const SEED_PRODUCT_DESCRIPTION =
  'Trade wholesale listing (synced from site catalogue). Nicotine product where applicable — not for sale to persons under 18. See retail packaging for ingredients, nicotine strength, warnings and disposal.'

type SourceItem = { name: string; rrp: string; cat: string; img: string }
type SourceCatalogue = Record<string, SourceItem[]>

function loadSourceCatalogue(): SourceCatalogue {
  const filePath = path.join(__dirname, '..', '..', 'shopify-theme', 'assets', 'brand-products.js')
  const raw = fs.readFileSync(filePath, 'utf8')
  const sandbox: { window: { fullBrandProducts?: SourceCatalogue } } = { window: {} }
  vm.createContext(sandbox)
  vm.runInContext(raw, sandbox, { filename: filePath })
  const data = sandbox.window.fullBrandProducts
  if (!data) throw new Error('window.fullBrandProducts not found in brand-products.js')
  return data
}

function normalizeBrand(rawBrand: string): string {
  const map: Record<string, string> = {
    'ELF BAR': 'Elf Bar',
    'LOST MARY': 'Lost Mary',
    SKE: 'SKE',
    IVG: 'IVG',
    HIGO: 'Higo',
    PIXL: 'Pixl',
    HYOLA: 'Hyola',
    HAYATI: 'Hayati',
    DOJO: 'Dojo',
  }
  return map[rawBrand] ?? rawBrand
}

function looksLikeLiquid(name: string): boolean {
  return /nic salt|e-?liquid|shortfill|10ml|elfliq/i.test(name)
}

function classify(rawBrand: string, item: SourceItem): { category: string; brand: string } {
  const brand = normalizeBrand(rawBrand)

  if (rawBrand !== 'ACCESSORIES') {
    return { category: looksLikeLiquid(item.name) ? 'e_liquids' : 'vapes', brand }
  }

  // ACCESSORIES bucket mixes nicotine pouches, papers, and lighters — split by name.
  if (/nordic spirit|pablo|killa|velo/i.test(item.name)) {
    return { category: 'nicotine_pouches', brand: item.name.split(' - ')[0].split(' ')[0] }
  }
  if (/clipper/i.test(item.name)) {
    return { category: 'lighters_fire', brand: 'Clipper' }
  }
  const paperBrandMatch = item.name.match(/^(Raw|Rizla|Elements)\b/i)
  return { category: 'papers', brand: paperBrandMatch ? paperBrandMatch[1] : 'Other' }
}

/** Last-resort pricing when no sibling product exists for a brand+category yet. */
function estimateDefaults(category: string): { unitsPerPack: number; packLabel: string; wholesaleMultiplier: number } {
  switch (category) {
    case 'vapes':
      return { unitsPerPack: 10, packLabel: 'Box of 10', wholesaleMultiplier: 0.62 }
    case 'e_liquids':
      return { unitsPerPack: 10, packLabel: 'Box of 10', wholesaleMultiplier: 0.6 }
    case 'nicotine_pouches':
      return { unitsPerPack: 20, packLabel: 'Box of 20', wholesaleMultiplier: 0.65 }
    case 'papers':
      return { unitsPerPack: 50, packLabel: 'Box of 50', wholesaleMultiplier: 0.55 }
    case 'lighters_fire':
      return { unitsPerPack: 48, packLabel: 'Display of 48', wholesaleMultiplier: 0.5 }
    default:
      return { unitsPerPack: 10, packLabel: 'Box of 10', wholesaleMultiplier: 0.6 }
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function parseRrp(rrp: string): number {
  const n = parseFloat(rrp.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 4.99
}

type SiblingStats = { unitPrice: number; casePrice: number; unitsPerPack: number; packLabel: string }

async function main() {
  const catalogue = loadSourceCatalogue()

  // Pre-compute Tier C pricing stats per brand+category from what's already in the DB
  // (the existing 512-product seed already has sensible per-line wholesale pricing).
  const existingProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { sku: true, brand: true, category: true, unitPrice: true, casePrice: true, unitsPerPack: true, packLabel: true },
  })
  const existingSkus = new Set(existingProducts.map((p) => p.sku))

  const siblingGroups = new Map<string, SiblingStats[]>()
  for (const p of existingProducts) {
    const key = `${p.brand}::${p.category}`
    const arr = siblingGroups.get(key) ?? []
    arr.push({ unitPrice: p.unitPrice, casePrice: p.casePrice, unitsPerPack: p.unitsPerPack, packLabel: p.packLabel })
    siblingGroups.set(key, arr)
  }

  function siblingPricing(brand: string, category: string): SiblingStats | null {
    const arr = siblingGroups.get(`${brand}::${category}`)
    if (!arr || arr.length === 0) return null
    const avg = (nums: number[]) => Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
    const mostCommon = <T,>(items: T[]): T => {
      const counts = new Map<T, number>()
      for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1)
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    }
    return {
      unitPrice: avg(arr.map((a) => a.unitPrice)),
      casePrice: avg(arr.map((a) => a.casePrice)),
      unitsPerPack: mostCommon(arr.map((a) => a.unitsPerPack)),
      packLabel: mostCommon(arr.map((a) => a.packLabel)),
    }
  }

  type PlannedRow = {
    action: 'create' | 'update'
    sku: string
    name: string
    brand: string
    category: string
    imageUrl: string
    productLine: string | null
    priceSource?: 'sibling-average' | 'estimated-from-rrp'
    unitPrice?: number
    casePrice?: number
    unitsPerPack?: number
    packLabel?: string
  }
  const planned: PlannedRow[] = []
  const usedSkusThisRun = new Set<string>()
  let skippedInvalidCategory = 0

  for (const [rawBrand, items] of Object.entries(catalogue)) {
    for (const item of items) {
      const { category, brand } = classify(rawBrand, item)
      if (!PRODUCT_CATEGORY_SLUGS.includes(category as (typeof PRODUCT_CATEGORY_SLUGS)[number])) {
        skippedInvalidCategory++
        continue
      }

      const brandPrefix = brand.slice(0, 3).toUpperCase() || 'GEN'
      let sku = `${brandPrefix}-${slugify(item.name)}`.toUpperCase().slice(0, 64)
      let n = 0
      while (usedSkusThisRun.has(sku)) {
        n++
        sku = `${brandPrefix}-${slugify(item.name)}-${n}`.toUpperCase().slice(0, 64)
      }
      usedSkusThisRun.add(sku)
      const productLine = rawBrand !== 'ACCESSORIES' ? item.cat : null

      if (existingSkus.has(sku)) {
        planned.push({ action: 'update', sku, name: item.name, brand, category, imageUrl: item.img, productLine })
        continue
      }

      const sibling = siblingPricing(brand, category)
      if (sibling) {
        planned.push({
          action: 'create',
          sku,
          name: item.name,
          brand,
          category,
          imageUrl: item.img,
          productLine,
          priceSource: 'sibling-average',
          unitPrice: sibling.unitPrice,
          casePrice: sibling.casePrice,
          unitsPerPack: sibling.unitsPerPack,
          packLabel: sibling.packLabel,
        })
      } else {
        const { unitsPerPack, packLabel, wholesaleMultiplier } = estimateDefaults(category)
        const rrp = parseRrp(item.rrp)
        const unitPrice = Math.round(rrp * wholesaleMultiplier * 100) / 100
        const casePrice = Math.round(unitPrice * unitsPerPack * 100) / 100
        planned.push({
          action: 'create',
          sku,
          name: item.name,
          brand,
          category,
          imageUrl: item.img,
          productLine,
          priceSource: 'estimated-from-rrp',
          unitPrice,
          casePrice,
          unitsPerPack,
          packLabel,
        })
      }
    }
  }

  const creates = planned.filter((p) => p.action === 'create')
  const updates = planned.filter((p) => p.action === 'update')
  const estimated = creates.filter((p) => p.priceSource === 'estimated-from-rrp')

  // Only retire OLD rows not matched by this run — never retire a product this run just created/refreshed,
  // even if it shares a brand name with RETIRE_BRANDS (real imported products keep the same brand names).
  const toRetireSkus = existingProducts
    .filter((p) => RETIRE_BRANDS.includes(p.brand) && !usedSkusThisRun.has(p.sku))
    .map((p) => p.sku)

  console.log(`Parsed ${planned.length} products from brand-products.js (${skippedInvalidCategory} skipped — no matching category).`)
  console.log(`  → ${creates.length} new products to create (${estimated.length} with ESTIMATED pricing — no sibling data)`)
  console.log(`  → ${updates.length} existing products to refresh (name/image only, pricing untouched)`)
  console.log(`  → ${toRetireSkus.length} old generated products to retire (isActive: false) for brands: ${RETIRE_BRANDS.join(', ')}`)

  if (estimated.length > 0) {
    console.log('\n⚠ ESTIMATED pricing (no existing product in this brand+category to copy pricing from):')
    console.table(
      estimated.slice(0, 30).map((p) => ({ sku: p.sku, name: p.name, brand: p.brand, category: p.category, unitPrice: p.unitPrice, casePrice: p.casePrice }))
    )
    if (estimated.length > 30) console.log(`  …and ${estimated.length - 30} more.`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no database writes.')
    return
  }

  let createdCount = 0
  let updatedCount = 0
  for (const p of planned) {
    if (p.action === 'update') {
      await prisma.product.update({
        where: { sku: p.sku },
        data: { name: p.name, imageUrl: p.imageUrl, productLine: p.productLine },
      })
      updatedCount++
    } else {
      const isVapeLike = p.category === 'vapes' || p.category === 'e_liquids'
      await prisma.product.create({
        data: {
          name: p.name,
          description: SEED_PRODUCT_DESCRIPTION,
          brand: p.brand,
          category: p.category,
          productLine: p.productLine,
          sku: p.sku,
          packLabel: p.packLabel!,
          unitsPerPack: p.unitsPerPack!,
          unitPrice: p.unitPrice!,
          casePrice: p.casePrice!,
          imageUrl: p.imageUrl,
          isSubjectToVapeDuty: isVapeLike,
          liquidVolumeMl: isVapeLike ? 2.0 : 0,
          nicotineStrengthMg: isVapeLike ? 20.0 : 0,
        },
      })
      createdCount++
    }
  }

  let retiredCount = 0
  if (toRetireSkus.length > 0) {
    const result = await prisma.product.updateMany({
      where: { sku: { in: toRetireSkus }, isActive: true },
      data: { isActive: false },
    })
    retiredCount = result.count
  }

  console.log(`\nDone. Created ${createdCount}, updated ${updatedCount}, retired ${retiredCount} old generated products.`)
  console.log('\n⚠ "nicotine_pouches" is currently a "coming_soon" category in lib/product-categories.ts — any')
  console.log('  Nordic Spirit/Pablo/Killa/Velo items created will NOT show up while browsing until that category')
  console.log('  is switched to "active".')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
