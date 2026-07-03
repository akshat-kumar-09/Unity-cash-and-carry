/**
 * Bulk-set Tier A/B wholesale pricing as a % discount off the standard (Tier C)
 * price, scoped to a category or brand — not a single global percentage.
 * Always computes off the current base unitPrice/casePrice (never off an
 * existing override), so re-running with a new percentage cleanly replaces
 * the old one instead of compounding discounts.
 *
 * Usage:
 *   pnpm tsx scripts/apply-tier-discount.ts --category=vapes --tierA=5 --tierB=2
 *   pnpm tsx scripts/apply-tier-discount.ts --brand="Elf Bar" --tierA=7
 *   pnpm tsx scripts/apply-tier-discount.ts --category=papers --tierA=10 --tierB=5 --dry-run
 *
 * At least one of --category / --brand, and at least one of --tierA / --tierB, required.
 */
import { PrismaClient } from '@prisma/client'
import { PRODUCT_CATEGORY_SLUGS } from '../lib/product-categories'

const prisma = new PrismaClient()

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

const DRY_RUN = process.argv.includes('--dry-run')
const category = getArg('category')
const brand = getArg('brand')
const tierAPercent = getArg('tierA') ? parseFloat(getArg('tierA')!) : undefined
const tierBPercent = getArg('tierB') ? parseFloat(getArg('tierB')!) : undefined

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

async function main() {
  if (!category && !brand) fail('Provide --category=<slug> and/or --brand="<name>" to scope this run.')
  if (category && !PRODUCT_CATEGORY_SLUGS.includes(category as (typeof PRODUCT_CATEGORY_SLUGS)[number])) {
    fail(`"${category}" is not a valid category. Valid: ${PRODUCT_CATEGORY_SLUGS.join(', ')}`)
  }
  if (tierAPercent === undefined && tierBPercent === undefined) {
    fail('Provide --tierA=<percent> and/or --tierB=<percent> (e.g. --tierA=5 for 5% off).')
  }
  for (const [label, pct] of [['tierA', tierAPercent], ['tierB', tierBPercent]] as const) {
    if (pct !== undefined && (Number.isNaN(pct) || pct < 0 || pct >= 100)) {
      fail(`--${label} must be a number between 0 and 99.99 (percent off).`)
    }
  }

  const where: Record<string, unknown> = { isActive: true }
  if (category) where.category = category
  if (brand) where.brand = brand

  const products = await prisma.product.findMany({
    where,
    select: { id: true, name: true, brand: true, category: true, unitPrice: true, casePrice: true },
  })

  if (products.length === 0) {
    console.log('\nNo active products match that scope. Nothing to do.')
    return
  }

  const round2 = (n: number) => Math.round(n * 100) / 100

  const rows = products.map((p) => {
    const unitPriceA = tierAPercent !== undefined ? round2(p.unitPrice * (1 - tierAPercent / 100)) : undefined
    const casePriceA = tierAPercent !== undefined ? round2(p.casePrice * (1 - tierAPercent / 100)) : undefined
    const unitPriceB = tierBPercent !== undefined ? round2(p.unitPrice * (1 - tierBPercent / 100)) : undefined
    const casePriceB = tierBPercent !== undefined ? round2(p.casePrice * (1 - tierBPercent / 100)) : undefined
    return { ...p, unitPriceA, casePriceA, unitPriceB, casePriceB }
  })

  console.log(`\nScope: ${category ? `category=${category}` : ''}${category && brand ? ' ' : ''}${brand ? `brand="${brand}"` : ''}`)
  console.log(`Matched ${products.length} active products.`)
  if (tierAPercent !== undefined) console.log(`  Tier A = ${tierAPercent}% off standard price`)
  if (tierBPercent !== undefined) console.log(`  Tier B = ${tierBPercent}% off standard price`)

  console.log('\nSample (first 10):')
  console.table(
    rows.slice(0, 10).map((r) => ({
      name: r.name,
      brand: r.brand,
      casePrice: r.casePrice,
      ...(r.casePriceA !== undefined ? { casePriceA: r.casePriceA } : {}),
      ...(r.casePriceB !== undefined ? { casePriceB: r.casePriceB } : {}),
    }))
  )
  if (rows.length > 10) console.log(`  …and ${rows.length - 10} more.`)

  if (DRY_RUN) {
    console.log('\n--dry-run: no database writes.')
    return
  }

  for (const r of rows) {
    const data: Record<string, number> = {}
    if (r.unitPriceA !== undefined) data.unitPriceA = r.unitPriceA
    if (r.casePriceA !== undefined) data.casePriceA = r.casePriceA
    if (r.unitPriceB !== undefined) data.unitPriceB = r.unitPriceB
    if (r.casePriceB !== undefined) data.casePriceB = r.casePriceB
    await prisma.product.update({ where: { id: r.id }, data })
  }

  console.log(`\nDone. Updated tier pricing on ${rows.length} products.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
