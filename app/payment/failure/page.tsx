"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

function PaymentFailureContent() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-500 flex items-center justify-center mb-4 rounded-full shadow-lg shadow-red-500/30">
          <XCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
          Payment Failed
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Your card wasn&apos;t charged. Your order is still saved — you can try paying again
          from your orders page.
        </p>
        <div className="mt-6 flex flex-col w-full gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
          >
            Back to Shop
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <PaymentFailureContent />
    </Suspense>
  )
}
