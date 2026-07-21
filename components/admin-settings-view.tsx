"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  Shield,
  ShieldAlert,
  Loader2,
  KeyRound,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Link2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { AppScreenHeader } from "@/components/app-screen-header"

type Token = {
  token: string
  email: string
  expiresAt: string
  used: boolean
  createdAt: string
}

export function AdminSettingsView() {
  const [gateActive, setGateActive] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [savingGate, setSavingGate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [replayEmail, setReplayEmail] = useState("")
  const [replaying, setReplaying] = useState(false)

  const fetchSettingsAndTokens = async () => {
    try {
      setLoading(true)
      // Fetch settings
      const settingsRes = await fetch("/api/admin/settings")
      if (!settingsRes.ok) throw new Error("Failed to load settings")
      const settingsData = await settingsRes.json()
      setGateActive(settingsData.inviteOnlyGate === "true")

      // Fetch tokens
      const tokensRes = await fetch("/api/admin/settings/invite-token")
      if (!tokensRes.ok) throw new Error("Failed to load invite tokens")
      const tokensData = await tokensRes.json()
      setTokens(Array.isArray(tokensData) ? tokensData : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettingsAndTokens()
  }, [])

  const handleToggleGate = async () => {
    setSavingGate(true)
    const newValue = !gateActive
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "inviteOnlyGate", value: newValue ? "true" : "false" }),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      setGateActive(newValue)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle invite gate")
    } finally {
      setSavingGate(false)
    }
  }

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return

    setGenerating(true)
    setError(null)
    setGeneratedLink("")
    try {
      const res = await fetch("/api/admin/settings/invite-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate token")
      }
      const data = (await res.json()) as Token
      const link = `${window.location.origin}/invite?token=${data.token}`
      setGeneratedLink(link)
      setEmailInput("")
      fetchSettingsAndTokens()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate invite token")
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteToken = async (tokenString: string) => {
    try {
      const res = await fetch(`/api/admin/settings/invite-token?token=${tokenString}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete token")
      fetchSettingsAndTokens()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete token")
    }
  }

  const handleReplayWelcome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replayEmail.trim()) return
    setReplaying(true)
    try {
      const res = await fetch("/api/admin/settings/replay-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: replayEmail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to reset welcome build")
      toast.success(`${data.email} will see the welcome build again on their next login.`)
      setReplayEmail("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset welcome build")
    } finally {
      setReplaying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const getTokenStatus = (t: Token) => {
    if (t.used) return { label: "Used", color: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 }
    const isExpired = new Date(t.expiresAt) < new Date()
    if (isExpired) return { label: "Expired", color: "bg-rose-50 text-rose-600 border-rose-200", icon: XCircle }
    return { label: "Active", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: Clock }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader title="Portal Settings" subtitle="Gating Policies & Invite Link Management" />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] font-medium text-amber-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Gate Configuration Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <Shield className="h-4.5 w-4.5 text-blue-600" />
                    Invite-Only Gateway
                  </h3>
                  <p className="text-slate-500 text-[11px] font-semibold leading-relaxed max-w-md">
                    When active, the B2B portal login screen is completely hidden. Users must click a unique, single-use invitation token link in their welcome email to access the app.
                  </p>
                </div>

                <button
                  onClick={handleToggleGate}
                  disabled={savingGate}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    gateActive ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      gateActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className={`p-3 rounded-xl border text-[11px] font-semibold transition-all ${
                gateActive 
                  ? "bg-blue-50/60 border-blue-100 text-blue-800" 
                  : "bg-slate-50 border-slate-100 text-slate-500"
              }`}>
                {gateActive 
                  ? "🔒 invite-only gateway is ACTIVE. Login screen is restricted."
                  : "🔓 invite-only gateway is INACTIVE. Anyone can view the login screen directly."
                }
              </div>
            </div>

            {/* Replay Welcome Build Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                  Replay Welcome Build
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Resets a retailer&apos;s onboarding so the welcome build (puzzle, Trade Pass, gift
                  reveal) plays again the next time they log in — handy for demos.
                </p>
              </div>

              <form onSubmit={handleReplayWelcome} className="flex gap-2">
                <input
                  type="email"
                  placeholder="retailer@business.com"
                  value={replayEmail}
                  onChange={(e) => setReplayEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm placeholder:text-slate-400"
                  required
                />
                <button
                  type="submit"
                  disabled={replaying}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all active:scale-[0.97] shadow-sm disabled:opacity-50 shrink-0 flex items-center gap-1"
                >
                  {replaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Replay
                </button>
              </form>
            </div>

            {/* Invite Token Generator Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-blue-600" />
                  Generate Invitation Link
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Generate a temporary single-use access link manually for an approved email.
                </p>
              </div>

              <form onSubmit={handleGenerateToken} className="flex gap-2">
                <input
                  type="email"
                  placeholder="retailer@business.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm placeholder:text-slate-400"
                  required
                />
                <button
                  type="submit"
                  disabled={generating}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all active:scale-[0.97] shadow-sm disabled:opacity-50 shrink-0 flex items-center gap-1"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Generate Link
                </button>
              </form>

              {generatedLink && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 space-y-2 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-wider">Access Link Generated Successfully:</p>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-emerald-100 px-3 py-2 rounded-lg flex-1 overflow-x-auto whitespace-nowrap">
                      {generatedLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-all active:scale-[0.97]"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {copySuccess && <p className="text-[10px] font-bold text-emerald-600">Copied to clipboard!</p>}
                </div>
              )}
            </div>

            {/* Invite Token Logs Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Link2 className="h-4.5 w-4.5 text-blue-600" />
                  Invitation Token Logs
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Recent tokens issued to traders. Each token grants access to one browser profile.
                </p>
              </div>

              {tokens.length === 0 ? (
                <p className="text-[11px] font-bold text-slate-400 py-4 text-center">No invitation tokens generated yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {tokens.map((t) => {
                    const status = getTokenStatus(t)
                    const StatusIcon = status.icon
                    const fullLink = `${window.location.origin}/invite?token=${t.token}`
                    return (
                      <div key={t.token} className="py-3 flex items-center justify-between gap-3 text-[11px]">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate block max-w-[150px] sm:max-w-[200px]">
                              {t.email}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${status.color}`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {status.label}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[9px] font-semibold">
                            Generated on: {formatDate(t.createdAt)} | Expires: {formatDate(t.expiresAt)}
                          </p>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          {!t.used && (
                            <button
                              onClick={() => copyToClipboard(fullLink)}
                              className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                              title="Copy Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteToken(t.token)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-100 hover:bg-rose-50 transition-colors"
                            title="Revoke / Delete Token"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
