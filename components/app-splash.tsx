import { UnityLogo } from "@/components/unity-logo"

/** Shown for the moment between opening the app and the session/profile arriving —
 *  the brand, not a "Loading..." line. */
export function AppSplash() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-white">
      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_8px_40px_-12px_rgba(37,99,235,0.35)]">
        <UnityLogo size={72} />
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full w-1/3 rounded-full bg-blue-600 motion-safe:animate-[splash-slide_1.1s_ease-in-out_infinite]" />
      </div>
      <span className="sr-only">Loading Unity</span>
    </div>
  )
}
