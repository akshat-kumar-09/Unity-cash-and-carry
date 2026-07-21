"use client"

import { useId } from "react"
import { SolvedDeviceImage } from "@/components/welcome-build/device-parts"

type Props = {
  companyName: string | null
  name: string | null
  vatNumber: string | null
  approvedAt: string | null
  /** Omit for the static settled card (Account screen). Pass false then true from the
   *  welcome-build reveal to hide the stamp until it lands, then play the landing
   *  animation once. */
  animateStamp?: boolean
}

function partnerSince(approvedAt: string | null): string | null {
  if (!approvedAt) return null
  return new Date(approvedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

/** The retailer's identity, built once by hand in the welcome game — same device, same
 *  left-to-right assembly, now living permanently on their Account screen. This is the
 *  exact same card shown the moment they finish the welcome build. */
export function TradeIdCard({ companyName, name, vatNumber, approvedAt, animateStamp }: Props) {
  const uid = useId()
  const filterId = `${uid}-ink-roughen`
  const since = partnerSince(approvedAt)
  const stampMode = animateStamp === undefined ? "static" : animateStamp ? "animate" : "hidden"

  return (
    <div className="rounded-3xl p-[1.5px] bg-gradient-to-br from-cyan-300/50 via-blue-400/15 to-amber-200/35 shadow-xl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1929] via-[#132743] to-[#0c1929] p-5 text-left">
        <div className="premium-card-grain pointer-events-none absolute inset-0" aria-hidden />

        <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
          </filter>
        </svg>

        <p className="relative text-[9px] font-black uppercase tracking-[0.25em] text-white/50">Unity Trade Pass</p>
        <p className="relative mt-1.5 text-lg font-black text-white leading-tight truncate">
          {companyName || "Your business"}
        </p>
        {name && <p className="relative text-[12px] font-semibold text-white/60 truncate">{name}</p>}

        {/* Device band — clean, no text printed on it. */}
        <div className="relative mt-4 h-20 flex items-center justify-center">
          <SolvedDeviceImage litUp />
        </div>

        <div className="relative mt-4 flex items-center justify-between gap-3">
          {vatNumber ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 border border-white/20 rounded-full px-2 py-0.5">
              VAT {vatNumber}
            </span>
          ) : (
            <span />
          )}

          {since && (
            <div className="relative flex items-center justify-center" style={{ width: 96, height: 46 }}>
              {stampMode === "animate" && (
                <div
                  className="absolute inset-0 rounded-full ink-spread-pulse"
                  style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0) 70%)" }}
                  aria-hidden
                />
              )}
              <div
                className={`relative inline-flex flex-col items-center justify-center rounded-full border-2 border-cyan-300/80 px-3 py-1.5 ${
                  stampMode === "hidden"
                    ? "opacity-0"
                    : stampMode === "animate"
                    ? "ink-stamp-land"
                    : "opacity-100 rotate-[-6deg]"
                }`}
                style={{
                  background: "radial-gradient(circle, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0.04) 100%)",
                  filter: `url(#${filterId})`,
                }}
              >
                <div className="absolute inset-[2px] rounded-full border border-cyan-300/40" aria-hidden />
                <span className="text-[7px] font-black uppercase tracking-[0.15em] text-cyan-200/90 leading-none">
                  Partner since
                </span>
                <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-100 leading-none whitespace-nowrap">
                  {since}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
