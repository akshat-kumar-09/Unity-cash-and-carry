"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.")
      }
      setSubmitted(true)
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
            Reset your password
          </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-2xl p-6">
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">Check your email</p>
              <p className="text-sm text-slate-500">
                If an account exists for <span className="font-medium">{email}</span>, we've
                sent a link to reset your password. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="mt-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-700 hover:text-blue-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Enter the email address on your trade account and we'll send you a link to
                reset your password.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-200">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
