import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { decryptSecret } from "@/lib/crypto"

// Decryption only ever happens server-side (the key is NEXTAUTH_SECRET, never shipped to
// the browser) — the admin panel calls this on-demand when it actually needs to show or
// send a temp password, rather than trying to parse/decrypt complianceNotes client-side.
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any)?.role
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { complianceNotes: true } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const match = user.complianceNotes?.match(/Generated Temp Password(?: \(encrypted\))?:\s*([^\s\n]+)/)
  if (!match) {
    return NextResponse.json({ tempPassword: null })
  }

  const isEncrypted = /\(encrypted\)/.test(match[0])
  try {
    const tempPassword = isEncrypted ? decryptSecret(match[1]) : match[1]
    return NextResponse.json({ tempPassword })
  } catch (error) {
    console.error("Error decrypting temp password:", error)
    return NextResponse.json({ tempPassword: null })
  }
}
