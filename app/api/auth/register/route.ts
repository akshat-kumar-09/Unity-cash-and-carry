import { NextResponse } from "next/server"

/** Public self-registration is disabled — accounts are created after approval on the marketing site. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Public registration is disabled. Apply on our website; we will send credentials after approval.",
    },
    { status: 403 }
  )
}
