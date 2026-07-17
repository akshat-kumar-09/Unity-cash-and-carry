"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Loader2, Clock } from "lucide-react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderCode = searchParams.get("s")

  const [status, setStatus] = useState<"checking" | "paid" | "pending">("checking")
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    if (!orderCode) return

    let attempts = 0
    let cancelled = false

    async function poll() {
      attempts += 1
      try {
        const res = await fetch(`/api/payments/viva/status?s=${orderCode}`)
        if (res.ok) {
          const data = await res.json()
          if (cancelled) return
          setOrderNumber(data.orderNumber)
          if (data.paymentStatus === "paid") {
            setStatus("paid")
            return
          }
        }
      } catch {
        // ignore, will retry
      }
      if (!cancelled) {
        if (attempts >= 10) {
          setStatus("pending")
        } else {
          setTimeout(poll, 2000)
        }
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [orderCode])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center">
        {status === "checking" && (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
              Confirming Payment
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Hang tight, we&apos;re confirming your payment with Viva.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="w-16 h-16 bg-blue-600 flex items-center justify-center mb-4 rounded-full shadow-lg shadow-blue-600/30">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
              Payment Successful
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {orderNumber ? `Order ${orderNumber} is confirmed.` : "Your order is confirmed."}{" "}
              Estimated dispatch under 24 hours.
            </p>
          </>
        )}

        {status === "pending" && (
          <>
            <Clock className="w-12 h-12 text-amber-500 mb-4" />
            <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
              Still Confirming
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Your payment went through on Viva&apos;s side, but we&apos;re still waiting on
              confirmation. We&apos;ll email you once it&apos;s marked paid — no need to pay again.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 w-full py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
        >
          Back to Shop
        </button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  )
}
