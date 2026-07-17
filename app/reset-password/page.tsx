"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Lock, CheckCircle, AlertTriangle } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.")
      }
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
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
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-5 rounded-2xl border-2 border-white/40 bg-white/15 p-4 shadow-2xl backdrop-blur-sm">
            <UnityLogo size={64} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Choose a new password
          </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-2xl p-6">
          {!token ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">Missing reset link</p>
              <p className="text-sm text-slate-500">
                This page needs a valid reset link. Request a new one below.
              </p>
              <Link
                href="/forgot-password"
                className="mt-3 text-sm font-bold uppercase tracking-wider text-blue-700 hover:text-blue-800"
              >
                Request a reset link
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">Password updated</p>
              <p className="text-sm text-slate-500">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="newPassword" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    autoComplete="new-password"
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
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}
