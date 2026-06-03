import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (type === "duty_account") {
      return handleDutyAccount(searchParams)
    } else if (type === "dispatch_log") {
      return handleDispatchLog(searchParams)
    } else if (type === "dashboard_stats") {
      return handleDashboardStats()
    }

    return NextResponse.json({ error: "Invalid report type. Use: duty_account, dispatch_log, dashboard_stats" }, { status: 400 })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

async function handleDutyAccount(params: URLSearchParams) {
  const period = params.get("period")
  if (!period) {
    return NextResponse.json({ error: "period is required (e.g. 2026-10)" }, { status: 400 })
  }

  const extractions = await prisma.warehouseExtraction.findMany({
    where: { hmrcPeriod: period },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { extractedAt: "asc" },
  })

  const summary = {
    period,
    totalDuty: Math.round(extractions.reduce((s, e) => s + e.totalDuty, 0) * 100) / 100,
    totalVolumeMl: Math.round(extractions.reduce((s, e) => s + e.totalVolumeMl, 0) * 100) / 100,
    totalUnits: extractions.reduce((s, e) => s + e.quantityUnits, 0),
    count: extractions.length,
  }

  return NextResponse.json({ summary, extractions })
}

async function handleDispatchLog(params: URLSearchParams) {
  const from = params.get("from")
  const to = params.get("to")
  if (!from || !to) {
    return NextResponse.json({ error: "from and to dates are required (YYYY-MM-DD)" }, { status: 400 })
  }

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: new Date(from),
        lte: new Date(`${to}T23:59:59.999Z`),
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          vatNumber: true,
          companyName: true,
          companyNumber: true,
        },
      },
      items: {
        include: { product: { select: { name: true, sku: true, liquidVolumeMl: true, isSubjectToVapeDuty: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({
    from,
    to,
    count: orders.length,
    totalRevenue: Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100,
    totalDuty: Math.round(orders.reduce((s, o) => s + o.vapeDutyAmount, 0) * 100) / 100,
    orders,
  })
}

async function handleDashboardStats() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const hmrcPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [
    ordersToday,
    ordersThisMonth,
    revenueResult,
    dutyResult,
    activeTraders,
    pendingCompliance,
    extractionsThisMonth,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { vapeDutyAmount: true } }),
    prisma.user.count({ where: { role: { in: ["trader", "customer"] }, complianceStatus: "approved" } }),
    prisma.user.count({ where: { role: { in: ["trader", "customer"] }, complianceStatus: "pending" } }),
    prisma.warehouseExtraction.count({ where: { hmrcPeriod } }),
  ])

  return NextResponse.json({
    ordersToday,
    ordersThisMonth,
    revenueThisMonth: Math.round((revenueResult._sum.total ?? 0) * 100) / 100,
    dutyThisMonth: Math.round((dutyResult._sum.vapeDutyAmount ?? 0) * 100) / 100,
    activeTraders,
    pendingCompliance,
    extractionsThisMonth,
  })
}
