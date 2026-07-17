"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error)
  }, [error])

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-slate-100 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div>
        <h1 className="text-lg font-bold uppercase tracking-wider text-slate-800">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          An unexpected error occurred. You can try again, or head back to the shop.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/"
          }}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
        >
          Go to shop
        </button>
      </div>
    </div>
  )
}
