import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const WELCOME_PACK_SKU = "WELCOME-PACK-01"

/** Placeholder contents until real Welcome Pack copy is supplied — kept as a stable,
 *  named list (not just a lump price) so the gift popup can show an itemized reveal.
 *  Values are notional trade value, not what's charged (the line itself is £0). */
export const WELCOME_PACK_CONTENTS = [
  { name: "Unity Trade Catalogue (printed)", value: 0 },
  { name: "5x Assorted E-Liquid Samples (10ml)", value: 15 },
  { name: "2x Best-Seller Disposable Vapes", value: 20 },
  { name: "Unity POS Starter Kit (counter display + window sticker)", value: 15 },
] as const

const WELCOME_PACK_VALUE = WELCOME_PACK_CONTENTS.reduce((sum, item) => sum + item.value, 0)

type CartLine = { productId: string; quantity: number }

function isCartLineArray(value: unknown): value is CartLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (i) => i && typeof i.productId === "string" && typeof i.quantity === "number" && i.quantity > 0
    )
  )
}

/** Finds (or lazily creates) the singleton gift product added to a retailer's cart when
 *  they finish the welcome build. isCatalogueVisible=false keeps it out of shop browse/
 *  search; isActive stays true so it survives cart reload and checkout like a real line. */
async function getOrCreateWelcomePack() {
  const existing = await prisma.product.findUnique({ where: { sku: WELCOME_PACK_SKU } })
  if (existing) return existing

  return prisma.product.create({
    data: {
      name: "Welcome Pack",
      description:
        WELCOME_PACK_CONTENTS.map((c) => c.name).join(" • ") +
        ` Worth £${WELCOME_PACK_VALUE.toFixed(2)}, on us.`,
      brand: "Unity",
      category: "other",
      sku: WELCOME_PACK_SKU,
      packLabel: "1 pack",
      unitsPerPack: 1,
      unitPrice: 0,
      casePrice: 0,
      isActive: true,
      isCatalogueVisible: false,
      isGiftItem: true,
      stock: 999999,
      liquidVolumeMl: 0,
      isSubjectToVapeDuty: false,
      nicotineStrengthMg: 0,
    },
  })
}

export async function POST() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { welcomeGameCompletedAt: true, cartData: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Idempotent — the client calls this once on completion (finish, skip, or back-out
    // all converge on the same call), but a duplicate call must never double-gift.
    if (user.welcomeGameCompletedAt) {
      return NextResponse.json({ alreadyCompleted: true, giftAdded: false })
    }

    const pack = await getOrCreateWelcomePack()

    const lines = isCartLineArray(user.cartData) ? user.cartData : []
    const alreadyInCart = lines.some((l) => l.productId === pack.id)
    const updatedLines = alreadyInCart ? lines : [...lines, { productId: pack.id, quantity: 1 }]

    await prisma.user.update({
      where: { id: userId },
      data: {
        welcomeGameCompletedAt: new Date(),
        cartData: updatedLines,
      },
    })

    return NextResponse.json({
      alreadyCompleted: false,
      giftAdded: !alreadyInCart,
      giftProductName: pack.name,
      giftContents: WELCOME_PACK_CONTENTS,
      giftValue: WELCOME_PACK_VALUE,
    })
  } catch (error) {
    console.error("Error completing welcome build:", error)
    return NextResponse.json({ error: "Failed to complete welcome build" }, { status: 500 })
  }
}
