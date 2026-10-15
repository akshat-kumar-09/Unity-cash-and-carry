"use client"

import { useState } from "react"
import { Copy, Check, Landmark } from "lucide-react"
import { UNITY_BUSINESS } from "@/lib/unity-business"

function CopyRow({ label, value, copyValue = value }: { label: string; value: string; copyValue?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure origin) — the value is on screen to copy by hand.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="truncate font-mono text-[14px] font-bold text-slate-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 active:scale-[0.97]"
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}

/** Everything a retailer needs to pay an order by bank transfer, each value one tap to copy. */
export function PaymentInstructions({ amount, reference }: { amount: number; reference: string }) {
  const { bank } = UNITY_BUSINESS

  return (
    <div className="text-left">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
        <Landmark className="h-3.5 w-3.5" /> Pay by bank transfer
      </p>
      <div className="mt-1 divide-y divide-slate-100">
        <CopyRow label="Amount" value={`£${amount.toFixed(2)}`} copyValue={amount.toFixed(2)} />
        <CopyRow label="Account name" value={bank.accountName} />
        <CopyRow label="Sort code" value={bank.sortCode} />
        <CopyRow label="Account number" value={bank.accountNumber} />
        <CopyRow label="Payment reference" value={reference} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Use the payment reference exactly as shown so we can match your transfer to this order.
      </p>
    </div>
  )
}
