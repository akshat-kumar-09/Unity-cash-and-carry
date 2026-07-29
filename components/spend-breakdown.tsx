/** Ranked horizontal bar list — single hue, magnitude by bar length, values on the
 *  right. Shared by the customer and admin bookkeeping views (by category, by brand,
 *  by retailer). */
export function SpendBreakdown({ title, items }: { title: string; items: { label: string; total: number }[] }) {
  if (items.length === 0) return null
  const max = Math.max(1, ...items.map((i) => i.total))
  return (
    <div>
      <p className="mb-2 text-[9.5px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className="w-[88px] shrink-0 truncate text-[11px] font-semibold text-slate-600">{item.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold text-slate-700">£{item.total.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
