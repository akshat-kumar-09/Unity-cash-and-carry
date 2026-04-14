// lib/auth.ts
import { auth } from "@/auth"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireAdmin() {
  const session = await auth()
  // Checking the role from the session object
  if (!session || (session.user as any)?.role !== "admin") {
     throw new Error("Admin access required")
  }
  return session
}
