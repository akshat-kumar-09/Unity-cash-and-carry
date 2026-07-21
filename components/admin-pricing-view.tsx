"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Tag, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import {
  SHOP_CATEGORIES,
  VAPING_BRANDS,
  POUCH_BRANDS,
  PRODUCT_LINES_BY_BRAND,
  type ProductCategorySlug,
} from "@/lib/product-categories"

type PricingProduct = {
  id: string
  name: string
  brand: string
  category: string
  productLine: string | null
  packLabel: string
  casePrice: number
  casePriceA: number | null
  casePriceB: number | null
}

type LineGroup = {
  key: string
  label: string
  products: PricingProduct[]
}

const PRICEABLE_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.status === "active")
const UNGROUPED_KEY = "__all__"

function fmt(n: number): string {
  return n.toFixed(2)
}

/** One product line (e.g. "BB 4000 Kit") — a single Tier A/B/C price applied to every
 *  flavour underneath it in one go, since that's how wholesale pricing actually works
 *  here (one price point per line, not per flavour). */
function LineCard({ group, onSaved }: { group: LineGroup; onSaved: () => void }) {
  const rep = group.products[0]
  const [expanded, setExpanded] = useState(false)
  const [caseStr, setCaseStr] = useState(fmt(rep.casePrice))
  const [aStr, setAStr] = useState(fmt(rep.casePriceA ?? rep.casePrice))
  const [bStr, setBStr] = useState(fmt(rep.casePriceB ?? rep.casePrice))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const caseNum = parseFloat(caseStr)
    const aNum = parseFloat(aStr)
    const bNum = parseFloat(bStr)
    if ([caseNum, aNum, bNum].some((n) => Number.isNaN(n) || n < 0)) {
      toast.error("Prices must be valid positive numbers.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: group.products.map((p) => p.id),
          casePrice: Math.round(caseNum * 100) / 100,
          casePriceA: Math.round(aNum * 100) / 100,
          casePriceB: Math.round(bNum * 100) / 100,
        }),
      })
      if (!res.ok) throw new Error("Failed to save prices")
      toast.success(`${group.label} updated — ${group.products.length} flavour${group.products.length === 1 ? "" : "s"}.`)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save prices")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="unity-tap flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900 truncate">{group.label}</p>
          <p className="text-[10.5px] font-semibold text-slate-400">
            {group.products.length} flavour{group.products.length === 1 ? "" : "s"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      <div className="border-t border-slate-100 px-4 py-3.5 space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Tier C</label>
            <input
              type="text"
              inputMode="decimal"
              value={caseStr}
              onChange={(e) => setCaseStr(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Tier A</label>
            <input
              type="text"
              inputMode="decimal"
              value={aStr}
              onChange={(e) => setAStr(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Tier B</label>
            <input
              type="text"
              inputMode="decimal"
              value={bStr}
              onChange={(e) => setBStr(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center font-mono text-[13px]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : `Apply to all ${group.products.length}`}
        </button>

        {expanded && (
          <ul className="space-y-1 border-t border-slate-100 pt-2.5">
            {group.products.map((p) => (
              <li key={p.id} className="text-[11.5px] text-slate-500 truncate">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function AdminPricingView() {
  const [category, setCategory] = useState<ProductCategorySlug>(PRICEABLE_CATEGORIES[0]?.id ?? "vapes")
  const [brand, setBrand] = useState<string>("")
  const [dynamicBrands, setDynamicBrands] = useState<string[]>([])
  const [products, setProducts] = useState<PricingProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const staticBrandsForCategory = useMemo(() => {
    if (category === "vapes" || category === "e_liquids") return VAPING_BRANDS as readonly string[]
    if (category === "nicotine_pouches") return POUCH_BRANDS as readonly string[]
    return null
  }, [category])

  const brandOptions = staticBrandsForCategory ?? dynamicBrands

  useEffect(() => {
    setBrand("")
    setProducts([])
    if (staticBrandsForCategory) {
      setDynamicBrands([])
      return
    }
    let cancelled = false
    fetch(`/api/products?category=${category}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const set = new Set<string>()
        for (const p of Array.isArray(data?.products) ? data.products : []) {
          if (p?.brand) set.add(p.brand)
        }
        setDynamicBrands([...set].sort())
      })
      .catch(() => !cancelled && setDynamicBrands([]))
    return () => {
      cancelled = true
    }
  }, [category, staticBrandsForCategory])

  useEffect(() => {
    setProducts([])
    if (!brand) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ category, brand, limit: "100" })
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setProducts(Array.isArray(data?.products) ? data.products : [])
      })
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [category, brand, refreshKey])

  const groups = useMemo<LineGroup[]>(() => {
    const byLine = new Map<string, PricingProduct[]>()
    for (const p of products) {
      const key = p.productLine || UNGROUPED_KEY
      if (!byLine.has(key)) byLine.set(key, [])
      byLine.get(key)!.push(p)
    }
    const known = brand ? PRODUCT_LINES_BY_BRAND[brand] ?? [] : []
    const orderedKeys = [
      ...known.filter((l) => byLine.has(l)),
      ...[...byLine.keys()].filter((k) => k !== UNGROUPED_KEY && !known.includes(k)),
      ...(byLine.has(UNGROUPED_KEY) ? [UNGROUPED_KEY] : []),
    ]
    return orderedKeys.map((key) => ({
      key,
      label: key === UNGROUPED_KEY ? `All ${brand} products` : key,
      products: byLine.get(key)!,
    }))
  }, [products, brand])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[13px] font-bold text-slate-800">Line pricing</h2>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          Pick a category and brand — every product line inside it (BB 4000 Kit, 2400 Pods,
          etc.) shows up as its own card below. One Tier A/B/C price applies to every flavour
          in that line at once.
        </p>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategorySlug)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            {PRICEABLE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Brand
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Choose a brand…</option>
            {brandOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && brand && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700">No products found</p>
          <p className="text-[11px] text-slate-400 mt-1">Nothing live yet for {brand} in this section.</p>
        </div>
      )}

      {!loading &&
        groups.map((group) => (
          <LineCard key={group.key} group={group} onSaved={() => setRefreshKey((k) => k + 1)} />
        ))}

      {!loading && brand && groups.length > 0 && (
        <p className="flex items-center gap-1.5 justify-center text-[10.5px] font-semibold text-slate-400 pt-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {groups.length} line{groups.length === 1 ? "" : "s"} for {brand}
        </p>
      )}
    </div>
  )
}
