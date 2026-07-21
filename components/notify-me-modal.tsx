"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import type { Product } from "@/lib/products"

type NotifyMeModalProps = {
  product: Product
  isOpen: boolean
  onClose: () => void
}

/** Back-in-stock email capture. Self-contained (own email/submit state) so any
 *  out-of-stock row — grid card or flavour quick-add row — can trigger it identically. */
export function NotifyMeModal({ product, isOpen, onClose }: NotifyMeModalProps) {
  const { data: session } = useSession()
  const [emailInput, setEmailInput] = useState(session?.user?.email || "")
  const [submitting, setSubmitting] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) {
      toast.error("Please enter a valid email address")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/products/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          email: emailInput.trim(),
        }),
      })

      if (!res.ok) throw new Error("Failed to subscribe")

      toast.success(`Subscribed to back-in-stock alerts for ${product.name}!`)
      onClose()
    } catch {
      toast.error("Could not register notification request")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-150 text-left space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-800 text-[15px] leading-tight">Stock Notification</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>{product.name}</strong> is currently out of stock. We will notify you immediately at this email once new boxes arrive in Glasgow.
        </p>

        <form onSubmit={handleSubscribe} className="space-y-3">
          <input
            type="email"
            placeholder="your.email@business.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
          >
            {submitting ? "Registering..." : "Notify Me When In Stock"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
