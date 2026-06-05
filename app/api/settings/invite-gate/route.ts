import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "inviteOnlyGate" }
    })
    
    return NextResponse.json({
      inviteOnlyGate: setting ? setting.value === "true" : false
    })
  } catch (error) {
    console.error("Error fetching public invite gate setting:", error)
    return NextResponse.json({ inviteOnlyGate: false })
  }
}
