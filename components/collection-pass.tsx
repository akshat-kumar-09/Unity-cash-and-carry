"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { CheckCircle2, Clock, Store } from "lucide-react"
import { UNITY_BUSINESS } from "@/lib/unity-business"

type CollectionPassProps = {
  code: string
  /** Amount still to pay at the counter (0 when already paid). */
  amountDue: number
  readyAt?: string | null
  collectedAt?: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** What the retailer shows at the depot counter. The QR opens the handover screen on a
 *  staff phone (any camera app reads it); the code is the fallback to read out. */
export function CollectionPass({ code, amountDue, readyAt, collectedAt }: CollectionPassProps) {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(`${window.location.origin}/collect/${code}`, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null))
    return () => {
      cancelled = true
    }
  }, [code])

  const state = collectedAt ? "collected" : readyAt ? "ready" : "preparing"

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
          state === "ready"
            ? "bg-emerald-600 text-white"
            : state === "collected"
              ? "bg-slate-100 text-slate-500"
              : "bg-blue-50 text-blue-700"
        }`}
      >
        {state === "collected" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : state === "ready" ? <Store className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        {state === "collected" && `Collected ${formatTime(collectedAt!)}`}
        {state === "ready" && "Ready to collect"}
        {state === "preparing" && "Preparing — we'll text when ready"}
      </div>

      {state !== "collected" && (
        <div className="flex items-center gap-4 p-4">
          <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white p-1">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`Collection pass QR code for ${code}`} className="h-full w-full" />
            ) : (
              <div className="h-full w-full rounded-lg bg-slate-100" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Collection code</p>
            <p className="font-mono text-[26px] font-black leading-tight tracking-[0.12em] text-slate-900">{code}</p>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug text-slate-700">
              {amountDue > 0 ? `Pay £${amountDue.toFixed(2)} by cash or card at the counter` : "Paid — just show this at the counter"}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {UNITY_BUSINESS.addressLines[0]}, {UNITY_BUSINESS.addressLines.at(-1)?.split(",").at(-1)?.trim()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
