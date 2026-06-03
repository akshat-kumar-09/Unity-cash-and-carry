import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      balance: user.walletBalance,
      transactions,
    })
  } catch (error) {
    console.error("Error in wallet GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = (session.user as any)?.role === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { email, amount, type, description } = body

    if (!email || typeof amount !== "number" || !type || !description) {
      return NextResponse.json({ error: "Invalid body parameters" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          amount,
          type,
          description,
        },
      })

      // Update user balance
      return tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
        select: {
          id: true,
          email: true,
          walletBalance: true,
        },
      })
    })

    return NextResponse.json({
      message: "Wallet balance adjusted successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Error in wallet POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
