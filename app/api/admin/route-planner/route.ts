import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const role = (session.user as any)?.role
    if (role !== "admin" && role !== "rep") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { origin, destination } = body

    if (!origin || !destination) {
      return NextResponse.json({ error: "origin and destination are required" }, { status: 400 })
    }

    return NextResponse.json({
      shops: [],
      origin,
      destination,
      message: "Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable route planning",
    })
  } catch (error) {
    console.error("Error in route planner:", error)
    return NextResponse.json({ error: "Failed to plan route" }, { status: 500 })
  }
}
