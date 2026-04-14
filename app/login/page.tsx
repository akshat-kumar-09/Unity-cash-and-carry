"use client"

import { Suspense, useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Mail, Lock, User } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"

type Mode = "signin" | "register"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [status, session, router, callbackUrl])

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
    setSuccess("")
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.")
        setLoading(false)
        return
      }
      setSuccess("Account created. Sign in below.")
      setMode("signin")
      setPassword("")
    } catch (err) {
      console.error("Register error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = mode === "signin" ? handleSignIn : handleRegister

  return (
    <div className="min-h-screen min-h-[100dvh] auth-page-bg flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-cyan-400/25 blur-[80px] animate-float" />
        <div className="absolute bottom-1/3 -right-24 w-96 h-96 rounded-full bg-blue-400/30 blur-[100px] animate-float" style={{ animationDelay: "1.5s" }} />
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
              {mode === "signin" ? "Sign In" : "Create account"}
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {mode === "signin"
              ? "Sign in with your trade account to view wholesale prices and place orders."
              : "Set your credentials. You’ll only see this after the owner has approved you and shared the app link."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name or business"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
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
                  placeholder={mode === "register" ? "Min 6 characters" : "••••••••"}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-700 text-sm font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25"
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create account"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-4">
            {mode === "signin" ? (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-6 opacity-0 animate-scale-in [animation-fill-mode:forwards]" style={{ animationDelay: "400ms" }}>
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
