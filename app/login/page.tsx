"use client"

import { Suspense, useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Mail, Lock, ExternalLink } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"

const MARKETING_REGISTER_URL =
  typeof process.env.NEXT_PUBLIC_MARKETING_REGISTER_URL === "string"
    ? process.env.NEXT_PUBLIC_MARKETING_REGISTER_URL.trim()
    : ""

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [status, router, callbackUrl])

  if (status === "loading") {
    return (
      <div className="min-h-screen min-h-[100dvh] auth-page-bg flex items-center justify-center">
        <div className="animate-pulse text-white/80 font-mono text-sm uppercase tracking-wider">
          Loading...
        </div>
      </div>
    )
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (result?.error) {
        setError("Invalid email or password. Please try again.")
        setLoading(false)
        return
      }
      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] auth-page-bg flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-cyan-400/25 blur-[80px] animate-float" />
        <div
          className="absolute bottom-1/3 -right-24 w-96 h-96 rounded-full bg-blue-400/30 blur-[100px] animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div
          className="text-center mb-8 opacity-0 animate-scale-in [animation-fill-mode:forwards]"
          style={{ animationDelay: "80ms" }}
        >
          <div className="inline-flex justify-center mb-5 rounded-2xl border-2 border-white/40 bg-white/15 p-4 shadow-2xl backdrop-blur-sm">
            <UnityLogo size={72} />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg [text-shadow:0_2px_20px_rgba(0,0,0,0.3)]">
            UNITY
          </h1>
          <h2 className="text-2xl font-bold text-white/95 tracking-wide mt-1 drop-shadow-md">
            CASH & CARRY
          </h2>
          <p className="text-white/90 mt-3 text-sm font-mono uppercase tracking-[0.2em]">
            Trade-only wholesale • Glasgow
          </p>
          <div className="mt-5 h-px w-20 mx-auto bg-white/60" aria-hidden />
        </div>

        <div
          className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-2xl p-6 opacity-0 animate-scale-in [animation-fill-mode:forwards]"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Sign In
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Sign in with the credentials we sent after your application was approved.
          </p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-3">
              Don&apos;t have access yet? Apply on our website first — we&apos;ll email your login details when approved.
            </p>
            {MARKETING_REGISTER_URL ? (
              <a
                href={MARKETING_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50/80 py-3 text-sm font-bold uppercase tracking-wider text-blue-800 transition hover:bg-blue-100"
              >
                Apply for access
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Set <code className="font-mono text-[11px]">NEXT_PUBLIC_MARKETING_REGISTER_URL</code> in Vercel to link to your application form.
              </p>
            )}
          </div>
        </div>

        <p
          className="text-center text-white/50 text-xs mt-6 opacity-0 animate-scale-in [animation-fill-mode:forwards]"
          style={{ animationDelay: "400ms" }}
        >
          All prices excl. VAT • Glasgow
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen min-h-[100dvh] auth-page-bg flex items-center justify-center">
          <div className="animate-pulse text-white/80 font-mono text-sm uppercase tracking-wider">
            Loading...
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
