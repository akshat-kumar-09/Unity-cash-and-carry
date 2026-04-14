"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"
import { AppScreenHeader } from "@/components/app-screen-header"

export function AccountView() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center unity-app-screen pb-28">
        <div className="text-[13px] font-medium text-slate-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28 md:max-w-4xl md:mx-auto md:w-full md:border-x md:border-slate-200/80 md:shadow-xl">
      <AppScreenHeader title="Account" subtitle="Profile and sign-in" />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center py-4">
          <div className="rounded-2xl border-2 border-blue-100 bg-white p-3 shadow-md ring-4 ring-blue-50/50">
            <UnityLogo size={72} />
          </div>
          <h2 className="mt-4 text-[18px] font-bold text-slate-900">
            {session?.user?.name ?? "Account"}
          </h2>
          <p className="unity-meta mt-1">{session?.user?.email ?? "—"}</p>
        </div>

        <div className="unity-card px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Signed in as
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold text-slate-900">
            {session?.user?.email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="unity-tap mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <p className="mt-8 text-center text-[10px] text-slate-400">
          Unity Cash &amp; Carry · Trade-only · Glasgow
        </p>
      </main>
    </div>
  )
}
