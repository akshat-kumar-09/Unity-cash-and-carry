import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** UK-style visible product text for seeded rows (≥20 chars). */
const SEED_PRODUCT_DESCRIPTION =
  'Trade wholesale listing (seed). Nicotine product where applicable — not for sale to persons under 18. See retail packaging for ingredients, nicotine strength, warnings and disposal.'

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

// Real Lost Mary BM6000 range with client-supplied "perfect" images.
// Images hosted on the Unity Shopify store CDN (upload the matching files in
// shopify-uploads/lost-mary-bm6000/ to Shopify Files; filenames match).
const LOST_MARY_BM6000: { flavour: string; imageUrl: string }[] = [
  { flavour: 'Banana Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-banana-ice.png' },
  { flavour: 'Berry Apple Peach', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-berry-apple-peach.png' },
  { flavour: 'Blackcurrant Apple', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blackcurrant-apple.png' },
  { flavour: 'Blackcurrant Lemonade', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blackcurrant-lemonade.png' },
  { flavour: 'Blue Razz Cherry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blue-razz-cherry.png' },
  { flavour: 'Blue Razz Lemonade', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blue-razz-lemonade.png' },
  { flavour: 'Blueberry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blueberry.png' },
  { flavour: 'Blueberry Cherry Cranberry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blueberry-cherry-cranberry.png' },
  { flavour: 'Blueberry Sour Raspberry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-blueberry-sour-raspberry.png' },
  { flavour: 'Cherry Berry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-cherry-berry.png' },
  { flavour: 'Cherry Cola', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-cherry-cola.png' },
  { flavour: 'Cherry Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-cherry-ice.png' },
  { flavour: 'Cherry Peach Lemonade', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-cherry-peach-lemonade.png' },
  { flavour: 'Cola', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-cola.png' },
  { flavour: 'Double Apple', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-double-apple.png' },
  { flavour: 'Fizzy Cherry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-fizzy-cherry.png' },
  { flavour: 'Fresh Mint', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-fresh-mint.png' },
  { flavour: 'Fruit Medley', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-fruit-medley.png' },
  { flavour: 'Fruit Punch', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-fruit-punch.png' },
  { flavour: 'Grape', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-grape.png' },
  { flavour: 'Juicy Peach', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-juicy-peach.png' },
  { flavour: 'Kiwi Passion Fruit Guava', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-kiwi-passion-fruit-guava.png' },
  { flavour: 'Latte', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-latte.png' },
  { flavour: 'Lemon Lime', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-lemon-lime.png' },
  { flavour: 'Mad Blue', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-mad-blue.png' },
  { flavour: 'Menthol', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-menthol.png' },
  { flavour: 'Miami Mint', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-miami-mint.png' },
  { flavour: 'Mr Blue', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-mr-blue.png' },
  { flavour: 'Orange Bruu', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-orange-bruu.png' },
  { flavour: 'Pineapple Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-pineapple-ice.png' },
  { flavour: 'Pineapple Passion Fruit', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-pineapple-passion-fruit.png' },
  { flavour: 'Pink Lemonade', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-pink-lemonade.png' },
  { flavour: 'Raspberry Peach', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-raspberry-peach.png' },
  { flavour: 'Red Apple Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-red-apple-ice.png' },
  { flavour: 'Strawberry Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-strawberry-ice.png' },
  { flavour: 'Strawberry Kiwi', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-strawberry-kiwi.jpg' },
  { flavour: 'Strawberry Lime', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-strawberry-lime.jpg' },
  { flavour: 'Strawberry Raspberry Cherry Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-strawberry-raspberry-cherry-ice.jpg' },
  { flavour: 'Strawberry Watermelon', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-strawberry-watermelon.jpg' },
  { flavour: 'Triple Berry', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-triple-berry.jpg' },
  { flavour: 'Triple Mango', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-triple-mango.jpg' },
  { flavour: 'Watermelon Ice', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-watermelon-ice.jpg' },
  { flavour: 'Watermelon Kiwi', imageUrl: 'https://cdn.shopify.com/s/files/1/0806/4594/7715/files/lost-mary-bm6000-watermelon-kiwi.jpg' },
]

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@unitycashandcarry.com' },
    update: {
      walletBalance: 250.00,
    },
    create: {
      email: 'admin@unitycashandcarry.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
      tradeCode: 'BESTINGLASGOW',
      walletBalance: 250.00,
    },
  })
  console.log('Created admin user')

  const existingTxAdmin = await prisma.walletTransaction.findFirst({
    where: { userId: admin.id, type: 'deposit' }
  })
  if (!existingTxAdmin) {
    await prisma.walletTransaction.create({
      data: {
        userId: admin.id,
        amount: 250.00,
        type: 'deposit',
        description: 'Initial admin account balance credit'
      }
    })
  }

  const traderPassword = await bcrypt.hash('trader123', 10)
  const trader = await prisma.user.upsert({
    where: { email: 'trader@example.com' },
    update: {
      walletBalance: 45.00,
    },
    create: {
      email: 'trader@example.com',
      name: 'Demo Trader',
      password: traderPassword,
      role: 'trader',
      tradeCode: 'TRUSTANDUNITY',
      walletBalance: 45.00,
    },
  })
  console.log('Created trader user')

  const existingTxTrader = await prisma.walletTransaction.findFirst({
    where: { userId: trader.id, type: 'promo_reward' }
  })
  if (!existingTxTrader) {
    await prisma.walletTransaction.create({
      data: {
        userId: trader.id,
        amount: 45.00,
        type: 'promo_reward',
        description: 'First sign-up trade voucher reward'
      }
    })
  }

  const products: {
    name: string
    brand: string
    category: string
    sku: string
    packLabel: string
    unitsPerPack: number
    unitPrice: number
    casePrice: number
    badge?: string
    imageUrl?: string
    isSubjectToVapeDuty: boolean
    liquidVolumeMl: number
    nicotineStrengthMg: number
  }[] = []
  const usedSkus = new Set<string>()

  function addVape(brand: string, line: string, flavour: string, skuPrefix: string, packLabel: string, units: number, unitPrice: number, badge?: string, imageUrl?: string) {
    const slug = slugify(flavour)
    let sku = `${skuPrefix}-${slug}`.toUpperCase()
    let n = 0
    while (usedSkus.has(sku)) {
      n++
      sku = `${skuPrefix}-${slug}${n}`.toUpperCase()
    }
    usedSkus.add(sku)

    let liquidVolumeMl = 2.0
    if (line.includes("2400")) liquidVolumeMl = 8.0
    else if (line.includes("4000") || line.includes("Max")) liquidVolumeMl = 10.0
    else if (line.includes("30K")) liquidVolumeMl = 30.0

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
      imageUrl,
      isSubjectToVapeDuty: true,
      liquidVolumeMl,
      nicotineStrengthMg: 20.0,
    })
  }

  // Vapes: use each flavour across lines to get ~380 vape SKUs
  for (const v of VAPE_LINES) {
    const flavours = VAPE_FLAVOURS.slice(0, 22 + (v.skuPrefix.length % 5))
    flavours.forEach((flavour, i) => {
      addVape(v.brand, v.line, flavour, v.skuPrefix, v.packLabel, v.units, v.unitPrice, i === 0 ? v.badge : undefined)
    })
  }

  // Lost Mary BM6000 — real client range with client-supplied "perfect" images.
  LOST_MARY_BM6000.forEach((p, i) => {
    addVape('Lost Mary', 'BM6000', p.flavour, 'LMBM60', 'Box of 10', 10, 4.5, i === 0 ? 'New' : undefined, p.imageUrl)
  })

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
        isSubjectToVapeDuty: false,
        liquidVolumeMl: 0.0,
        nicotineStrengthMg: 0.0,
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
      isSubjectToVapeDuty: false,
      liquidVolumeMl: 0.0,
      nicotineStrengthMg: 0.0,
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
      isSubjectToVapeDuty: false,
      liquidVolumeMl: 0.0,
      nicotineStrengthMg: 0.0,
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
      isSubjectToVapeDuty: false,
      liquidVolumeMl: 0.0,
      nicotineStrengthMg: 0.0,
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

    let liquidVolumeMl = 2.0
    if (v.line.includes("2400")) liquidVolumeMl = 8.0
    else if (v.line.includes("4000") || v.line.includes("Max")) liquidVolumeMl = 10.0
    else if (v.line.includes("30K")) liquidVolumeMl = 30.0

    products.push({
      name: `${v.line} ${f}`,
      brand: v.brand,
      category: 'vapes',
      sku,
      packLabel: v.packLabel,
      unitsPerPack: v.units,
      unitPrice: v.unitPrice,
      casePrice: Math.round(v.unitPrice * v.units * 100) / 100,
      isSubjectToVapeDuty: true,
      liquidVolumeMl,
      nicotineStrengthMg: 20.0,
    })
  }

  const toSeed = products.slice(0, 500).map((p, i) => ({
    ...p,
    description: SEED_PRODUCT_DESCRIPTION,
    maxQtyPerOrder: 100,
    stock: i % 15 === 0 ? 0 : 80 + (i % 50),
  }))
  for (const product of toSeed) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    })
  }

  console.log(`Seeded ${toSeed.length} products`)

  const promoCodes = [
    { code: 'WELCOME20', description: '£20 trade credit discount on first wholesale order', discountType: 'fixed_amount', value: 20.00, minOrderValue: 100.00 },
    { code: 'GLASGOW10', description: '10% discount on orders over £50', discountType: 'percentage', value: 10.00, minOrderValue: 50.00 },
    { code: 'VAPE5', description: '5% off all vape brand cases', discountType: 'percentage', value: 5.00, minOrderValue: 0.00 },
  ]
  for (const promo of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo,
    })
  }
  console.log('Seeded promo codes')
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
