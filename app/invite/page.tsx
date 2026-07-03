import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AlertOctagon, ArrowLeft, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { UnityLogo } from "@/components/unity-logo"
import { consumeInviteToken } from "./actions"

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function InvitePage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    redirect("/invite-only")
  }

  let isValid = false
  let errorMsg = "This invitation link is invalid or has expired."

  try {
    // Read-only validation — consuming the token (marking it used, setting the
    // cookie) happens in the consumeInviteToken Server Action below, triggered
    // by an explicit click. Doing it here on page load would let link-preview
    // bots/scanners silently burn a real retailer's one-time token.
    const invite = await prisma.inviteToken.findUnique({
      where: { token }
    })

    if (invite) {
      if (invite.used) {
        errorMsg = "This invitation link has already been used to register a device."
      } else if (invite.expiresAt < new Date()) {
        errorMsg = "This invitation link has expired (invite links are valid for 48 hours)."
      } else {
        isValid = true
      }
    }
  } catch (err) {
    console.error("Error validating invite token:", err)
    errorMsg = "A database error occurred. Please try again later."
  }

  if (isValid) {
    return (
      <div className="min-h-screen min-h-[100dvh] auth-page-bg flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-[80px]" />
          <div className="absolute bottom-1/3 -right-24 w-96 h-96 rounded-full bg-blue-400/25 blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10 text-center">
          <div className="inline-flex justify-center mb-6 rounded-2xl border-2 border-white/40 bg-white/15 p-4 shadow-2xl backdrop-blur-sm">
            <UnityLogo size={72} />
          </div>

          <div className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-3xl p-8 text-left space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">You&apos;re invited</h3>
              <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
                This link is valid. Continue to sign in with the credentials you were sent — this link can only be used once.
              </p>
            </div>

            <form action={consumeInviteToken.bind(null, token)}>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Continue to login
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // If invalid, render error card
  return (
    <div className="min-h-screen min-h-[100dvh] auth-page-bg flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-[80px]" />
        <div className="absolute bottom-1/3 -right-24 w-96 h-96 rounded-full bg-blue-400/25 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="inline-flex justify-center mb-6 rounded-2xl border-2 border-white/40 bg-white/15 p-4 shadow-2xl backdrop-blur-sm">
          <UnityLogo size={72} />
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-3xl p-8 text-left space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-2">
            <AlertOctagon className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Expired or Invalid Link</h3>
            <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
              {errorMsg}
            </p>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed mt-2">
              For security and compliance reasons, invitation tokens are single-use and expire 48 hours after being sent.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <Link
              href="/invite-only"
              className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Portal Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
