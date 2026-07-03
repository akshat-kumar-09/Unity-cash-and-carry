"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/** Cookies/redirects are only legal from a Server Action or Route Handler — never a Server Component render. */
export async function consumeInviteToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({ where: { token } })

  if (!invite || invite.used || invite.expiresAt < new Date()) {
    redirect("/invite-only")
  }

  await prisma.inviteToken.update({
    where: { token },
    data: { used: true },
  })

  const cookieStore = await cookies()
  cookieStore.set("unity_invite_bypass", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: true,
    httpOnly: false, // Allow client-side verification
    sameSite: "lax",
  })

  redirect("/login")
}
