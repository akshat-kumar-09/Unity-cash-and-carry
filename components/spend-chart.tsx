"use client"

import { useState } from "react"

type SpendMonth = { month: string; total: number }

/** Single-hue monthly spend bar chart. One series, so no legend — the card title
 *  already names what's plotted. Latest month gets a direct end-label (the value
 *  the reader actually wants); every other bar reveals its value on hover/focus. */
export function SpendChart({ data }: { data: SpendMonth[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.total))
  const lastIndex = data.length - 1

  return (
    <div>
      <div className="flex h-28 items-end gap-2.5">
        {data.map((d, i) => {
          const heightPct = Math.max(4, (d.total / max) * 100)
          const emphasized = hovered === i || i === lastIndex
          return (
            <div
              key={d.month}
              tabIndex={0}
              role="img"
              aria-label={`${d.month}: £${d.total.toFixed(2)}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="group relative flex flex-1 flex-col items-center justify-end outline-none"
            >
              {i === lastIndex ? (
                <span className="mb-1 text-[10px] font-black tabular-nums text-blue-700">
                  £{d.total.toFixed(0)}
                </span>
              ) : (
                hovered === i && (
                  <span className="absolute -top-6 z-10 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-lg">
                    £{d.total.toFixed(2)}
                  </span>
                )
              )}
              <div
                className={`w-full max-w-[22px] rounded-t-[4px] transition-colors ${
                  emphasized ? "bg-blue-600" : "bg-blue-300"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 h-px bg-slate-150" />
      <div className="mt-1.5 flex gap-2.5">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  )
}
