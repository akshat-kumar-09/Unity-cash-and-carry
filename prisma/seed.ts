import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const VAPE_FLAVOURS = [
  'Blue Razz', 'Blueberry Sour', 'Strawberry Raspberry', 'Watermelon', 'Grape', 'Kiwi Passion',
  'Pink Lemonade', 'Triple Mango', 'Strawberry Ice Cream', 'Cola', 'Cherry', 'Cherry Cola',
  'Mango', 'Fresh Mint', 'Huba Huba', 'Watermelon Bubblegum', 'Peach Ice', 'Lemon Lime',
  'Blackcurrant', 'Orange', 'Apple', 'Berry', 'Bubblegum', 'Cotton Candy', 'Energy',
  'Ice Grape', 'Lychee', 'Passion Fruit', 'Pineapple', 'Raspberry', 'Strawberry',
  'Tropical', 'Vanilla', 'Banana', 'Coconut', 'Melon', 'Menthol', 'Spearmint',
]

const VAPE_LINES: { brand: string; line: string; skuPrefix: string; packLabel: string; units: number; unitPrice: number; badge?: string }[] = [
  { brand: 'Elf Bar', line: '600', skuPrefix: 'EB6', packLabel: 'Box of 10', units: 10, unitPrice: 3.25, badge: 'Popular' },
  { brand: 'Elf Bar', line: '800', skuPrefix: 'EB8', packLabel: 'Box of 10', units: 10, unitPrice: 3.45 },
  { brand: 'Elf Bar', line: '1500', skuPrefix: 'EB15', packLabel: 'Box of 10', units: 10, unitPrice: 4.25 },
  { brand: 'SKE', line: 'Crystal', skuPrefix: 'SKC', packLabel: 'Box of 10', units: 10, unitPrice: 3.5, badge: 'Popular' },
  { brand: 'SKE', line: 'Crystal Plus', skuPrefix: 'SKCP', packLabel: 'Box of 10', units: 10, unitPrice: 3.75 },
  { brand: 'SKE', line: 'Tropic', skuPrefix: 'SKT', packLabel: 'Box of 10', units: 10, unitPrice: 3.6 },
  { brand: 'IVG', line: '2400', skuPrefix: 'IVG24', packLabel: 'Outer of 5', units: 5, unitPrice: 7.0, badge: 'New' },
  { brand: 'IVG', line: '1200', skuPrefix: 'IVG12', packLabel: 'Box of 10', units: 10, unitPrice: 3.9 },
  { brand: 'IVG', line: 'Bar', skuPrefix: 'IVGB', packLabel: 'Box of 10', units: 10, unitPrice: 3.4 },
  { brand: 'Higo', line: 'Crystal 4000', skuPrefix: 'HG4K', packLabel: 'Box of 10', units: 10, unitPrice: 3.8, badge: 'Popular' },
  { brand: 'Higo', line: 'V2', skuPrefix: 'HGV2', packLabel: 'Box of 10', units: 10, unitPrice: 3.5 },
  { brand: 'Lost Mary', line: 'Nera 30K', skuPrefix: 'LMN30', packLabel: 'Box of 10', units: 10, unitPrice: 4.2, badge: 'New' },
  { brand: 'Lost Mary', line: '600', skuPrefix: 'LM600', packLabel: 'Box of 10', units: 10, unitPrice: 3.2 },
  { brand: 'Lost Mary', line: 'BM600', skuPrefix: 'LMBM6', packLabel: 'Box of 10', units: 10, unitPrice: 3.25 },
  { brand: 'Hayati', line: 'Pro', skuPrefix: 'HYP', packLabel: 'Box of 10', units: 10, unitPrice: 3.95 },
  { brand: 'Hayati', line: 'Pro Max', skuPrefix: 'HYPM', packLabel: 'Box of 10', units: 10, unitPrice: 4.15 },
  { brand: 'Pyne Pods', line: 'Pod', skuPrefix: 'PP', packLabel: 'Pack of 10', units: 10, unitPrice: 3.0 },
  { brand: 'Pyne Pods', line: 'Pod Plus', skuPrefix: 'PPP', packLabel: 'Pack of 10', units: 10, unitPrice: 3.25 },
  { brand: 'Dojo', line: '600', skuPrefix: 'DJ6', packLabel: 'Box of 10', units: 10, unitPrice: 3.2 },
  { brand: 'Dojo', line: '800', skuPrefix: 'DJ8', packLabel: 'Box of 10', units: 10, unitPrice: 3.4 },
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 6)
}

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@unitycashandcarry.com' },
    update: {},
    create: {
      email: 'admin@unitycashandcarry.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
      tradeCode: 'BESTINGLASGOW',
    },
  })
  console.log('Created admin user')

  const traderPassword = await bcrypt.hash('trader123', 10)
  await prisma.user.upsert({
    where: { email: 'trader@example.com' },
    update: {},
    create: {
      email: 'trader@example.com',
      name: 'Demo Trader',
      password: traderPassword,
      role: 'trader',
      tradeCode: 'TRUSTANDUNITY',
    },
  })
  console.log('Created trader user')

  const products: { name: string; brand: string; category: string; sku: string; packLabel: string; unitsPerPack: number; unitPrice: number; casePrice: number; badge?: string }[] = []
  const usedSkus = new Set<string>()

  function addVape(brand: string, line: string, flavour: string, skuPrefix: string, packLabel: string, units: number, unitPrice: number, badge?: string) {
    const slug = slugify(flavour)
    let sku = `${skuPrefix}-${slug}`.toUpperCase()
    let n = 0
    while (usedSkus.has(sku)) {
      n++
      sku = `${skuPrefix}-${slug}${n}`.toUpperCase()
    }
    usedSkus.add(sku)
    products.push({
      name: `${line} ${flavour}`,
      brand,
      category: 'vapes',
      sku,
      packLabel,
      unitsPerPack: units,
      unitPrice,
      casePrice: Math.round(unitPrice * units * 100) / 100,
      badge,
    })
  }

  // Vapes: use each flavour across lines to get ~380 vape SKUs
  for (const v of VAPE_LINES) {
    const flavours = VAPE_FLAVOURS.slice(0, 22 + (v.skuPrefix.length % 5))
    flavours.forEach((flavour, i) => {
      addVape(v.brand, v.line, flavour, v.skuPrefix, v.packLabel, v.units, v.unitPrice, i === 0 ? v.badge : undefined)
    })
  }

  // Papers: Rizla & RAW variants
  const papers = [
    { name: 'Blue Regular', brand: 'Rizla', sku: 'RZ-BLU-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.38, badge: 'Best Seller' },
    { name: 'Silver King Size', brand: 'Rizla', sku: 'RZ-SLV-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.45 },
    { name: 'Green King Size', brand: 'Rizla', sku: 'RZ-GRN-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.42 },
    { name: 'Red King Size', brand: 'Rizla', sku: 'RZ-RED-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.44 },
    { name: 'Blue Slim', brand: 'Rizla', sku: 'RZ-BLUSL-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.46 },
    { name: 'Silver Slim', brand: 'Rizla', sku: 'RZ-SLVSL-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.48 },
    { name: 'Classic King Size', brand: 'RAW', sku: 'RAW-CLS-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.52 },
    { name: 'Organic Hemp KS', brand: 'RAW', sku: 'RAW-ORG-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.56 },
    { name: 'Black KS', brand: 'RAW', sku: 'RAW-BLK-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.58 },
    { name: 'Premium Rolling', brand: 'RAW', sku: 'RAW-PRM-50', packLabel: 'Box of 50', units: 50, unitPrice: 0.54 },
  ]
  for (let i = 0; i < 4; i++) {
    papers.forEach((p, j) => {
      const sku = i === 0 ? p.sku : `${p.sku}-${i}`
      if (usedSkus.has(sku)) return
      usedSkus.add(sku)
      products.push({
        name: p.name,
        brand: p.brand,
        category: 'papers',
        sku,
        packLabel: p.packLabel,
        unitsPerPack: p.units,
        unitPrice: p.unitPrice,
        casePrice: Math.round(p.unitPrice * p.units * 100) / 100,
        badge: i === 0 ? p.badge : undefined,
      })
    })
  }

  // Lighters: Clipper variants
  const lighterNames = ['Classic', 'Metal', 'Windproof', 'Mini', 'Jumbo', 'Soft', 'Eco', 'Jet']
  for (let i = 0; i < 40; i++) {
    const name = lighterNames[i % lighterNames.length]
    const sku = `CLP-${name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`
    if (usedSkus.has(sku)) continue
    usedSkus.add(sku)
    const units = i % 3 === 0 ? 48 : i % 3 === 1 ? 24 : 12
    const unitPrice = 0.65 + (i % 5) * 0.05
    products.push({
      name: `${name} Lighters`,
      brand: 'Clipper',
      category: 'lighters_fire',
      sku,
      packLabel: units === 48 ? 'Tray of 48' : units === 24 ? 'Pack of 24' : 'Pack of 12',
      unitsPerPack: units,
      unitPrice,
      casePrice: Math.round(unitPrice * units * 100) / 100,
      badge: i === 0 ? undefined : undefined,
    })
  }

  // Filters: Swan, generic
  const filterNames = ['Extra Slim', 'Slim', 'Regular', 'King Size', 'Activated Carbon', 'Tips']
  for (let i = 0; i < 35; i++) {
    const name = filterNames[i % filterNames.length]
    const sku = `SWN-${name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`
    if (usedSkus.has(sku)) continue
    usedSkus.add(sku)
    const unitPrice = 3.5 + (i % 10) * 0.5
    products.push({
      name: `${name} Filters`,
      brand: 'Swan',
      category: 'filters',
      sku,
      packLabel: 'Bag',
      unitsPerPack: 1,
      unitPrice,
      casePrice: unitPrice,
    })
  }

  // Accessories: pouches, cases, etc.
  const accessories = [
    { name: 'Storage Pouch', brand: 'Rizla', sku: 'ACC-POUCH-01', unitPrice: 2.5 },
    { name: 'Metal Case', brand: 'RAW', sku: 'ACC-CASE-01', unitPrice: 4.99 },
    { name: 'Rolling Tray', brand: 'RAW', sku: 'ACC-TRAY-01', unitPrice: 8.5 },
    { name: 'Grinder Card', brand: 'RAW', sku: 'ACC-GRIND-01', unitPrice: 3.0 },
    { name: 'Tip Pack', brand: 'Swan', sku: 'ACC-TIP-01', unitPrice: 1.2 },
  ]
  for (let i = 0; i < 30; i++) {
    const acc = accessories[i % accessories.length]
    const sku = `${acc.sku}-${String(i + 1).padStart(2, '0')}`
    if (usedSkus.has(sku)) continue
    usedSkus.add(sku)
    products.push({
      name: acc.name,
      brand: acc.brand,
      category: 'other',
      sku,
      packLabel: 'Each',
      unitsPerPack: 1,
      unitPrice: acc.unitPrice,
      casePrice: acc.unitPrice,
    })
  }

  // Trim or pad to exactly 500
  while (products.length < 500) {
    const v = VAPE_LINES[products.length % VAPE_LINES.length]
    const f = VAPE_FLAVOURS[(products.length + 7) % VAPE_FLAVOURS.length]
    const slug = slugify(f) + products.length
    const sku = `${v.skuPrefix}-${slug}`.toUpperCase().slice(0, 12)
    if (usedSkus.has(sku)) continue
    usedSkus.add(sku)
    products.push({
      name: `${v.line} ${f}`,
      brand: v.brand,
      category: 'vapes',
      sku,
      packLabel: v.packLabel,
      unitsPerPack: v.units,
      unitPrice: v.unitPrice,
      casePrice: Math.round(v.unitPrice * v.units * 100) / 100,
    })
  }

  const toSeed = products.slice(0, 500)
  for (const product of toSeed) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    })
  }

  console.log(`Seeded ${toSeed.length} products`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
