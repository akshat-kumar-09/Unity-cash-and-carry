"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, TrendingUp, X, ArrowUpRight } from "lucide-react"
import { SpendChart } from "@/components/spend-chart"
import { SpendBreakdown } from "@/components/spend-breakdown"

type Stat = { label: string; value: string }
type Breakdown = { title: string; items: { label: string; total: number }[] }

type BookkeepingSummaryProps = {
  modalTitle: string
  loading: boolean
  stats: Stat[]
  monthly: { month: string; total: number }[]
  breakdowns: Breakdown[]
}

/** Compact bookkeeping card: a tight stat row + the single biggest mover from each
 *  breakdown, one line each — not a full bar-chart dump. Tap "Full analysis" for the
 *  complete chart + ranked breakdowns in a modal. Shared by trader and admin orders
 *  pages so both read as one consistent, precise summary rather than a sprawling
 *  widget with a lot of empty vertical space. */
export function BookkeepingSummary({ modalTitle, loading, stats, monthly, breakdowns }: BookkeepingSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
      </div>
    )
  }

  const topMovers = breakdowns
    .map((b) => (b.items.length > 0 ? { title: b.title, ...b.items[0] } : null))
    .filter((x): x is { title: string; label: string; total: number } => x !== null)

  return (
    <>
      <div className="space-y-3.5">
        <div className={`grid gap-2 text-center`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "border-l border-slate-100" : ""}>
              <p className="text-[15px] font-black leading-none text-slate-900 tabular-nums">{s.value}</p>
              <p className="mt-1 text-[8.5px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {topMovers.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
            {topMovers.map((m) => (
              <div key={m.title} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                  <TrendingUp className="h-3 w-3 shrink-0 text-blue-400" />
                  Top {m.title}
                </span>
                <span className="min-w-0 truncate text-[11.5px] font-bold text-slate-800">{m.label}</span>
                <span className="shrink-0 font-mono text-[11.5px] font-black text-blue-700">£{m.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-50/60 transition-colors"
        >
          Full Analysis <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">{modalTitle}</h3>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
              {stats.map((s, i) => (
                <div key={s.label} className={i > 0 ? "border-l border-slate-100" : ""}>
                  <p className="text-[16px] font-black leading-none text-slate-900 tabular-nums">{s.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <SpendChart data={monthly} />

            <div className="mt-5 space-y-4">
              {breakdowns.map((b) => (
                <div key={b.title} className="border-t border-slate-100 pt-4">
                  <SpendBreakdown title={b.title} items={b.items} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
