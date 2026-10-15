import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { computeRestock } from "@/lib/insights"

/** The lines this shop usually reorders that are due now, with the usual quantities. */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(await computeRestock((session.user as { id: string }).id))
  } catch (error) {
    console.error("Error computing restock suggestions:", error)
    return NextResponse.json({ error: "Failed to load restock suggestions" }, { status: 500 })
  }
}
