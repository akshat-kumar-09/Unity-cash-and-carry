import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { loginSchema } from "@/lib/validations"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited"
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const parsed = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        })

        if (!parsed.success) {
          return null
        }

        // Coarse per-IP cap guards against credential stuffing across many emails; the
        // tighter per-IP+email cap stops repeated guesses at one account specifically.
        const ip = getClientIp(request)
        const perIp = rateLimit(`login:ip:${ip}`, 30, 10 * 60 * 1000)
        const perAccount = rateLimit(`login:acct:${ip}:${parsed.data.email}`, 8, 10 * 60 * 1000)
        if (!perIp.allowed || !perAccount.allowed) {
          throw new RateLimitedSignin()
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "customer"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string; role?: string }).id = token.id as string
        ;(session.user as { id?: string; role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
