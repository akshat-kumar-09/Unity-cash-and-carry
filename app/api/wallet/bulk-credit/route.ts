import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { bulkWalletCreditSchema } from "@/lib/validations"

/** Credits (or debits) every real trade account in one action — distinct from the
 *  existing single-customer-by-email adjustment. Targets role in (trader, customer),
 *  the same "real retailer account" filter used elsewhere in the admin API (compliance,
 *  reports) — excludes admin/rep accounts, which don't hold trade wallets. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = session && (session.user as { role?: string })?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bulkWalletCreditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }
    const { amount, description } = parsed.data

    const retailers = await prisma.user.findMany({
      where: { role: { in: ["trader", "customer"] } },
      select: { id: true },
    })

    if (retailers.length === 0) {
      return NextResponse.json({ error: "No trade accounts found" }, { status: 404 })
    }

    await prisma.$transaction([
      ...retailers.map((r) =>
        prisma.walletTransaction.create({
          data: { userId: r.id, amount, type: "admin_adjustment", description: `[Bulk] ${description}` },
        })
      ),
      prisma.user.updateMany({
        where: { id: { in: retailers.map((r) => r.id) } },
        data: { walletBalance: { increment: amount } },
      }),
    ])

    return NextResponse.json({ ok: true, accountsCredited: retailers.length, amount })
  } catch (error) {
    console.error("Error bulk-crediting wallets:", error)
    return NextResponse.json({ error: "Failed to credit accounts" }, { status: 500 })
  }
}
