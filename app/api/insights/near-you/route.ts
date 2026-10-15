import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { computeNearYou } from "@/lib/insights"

/** What shops in the same postcode area are buying that this shop doesn't stock —
 *  aggregated and anonymised (see lib/insights.ts for the thresholds). */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(await computeNearYou((session.user as { id: string }).id))
  } catch (error) {
    console.error("Error computing near-you insights:", error)
    return NextResponse.json({ error: "Failed to load local trends" }, { status: 500 })
  }
}
