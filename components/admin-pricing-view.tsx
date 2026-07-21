"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Tag, CheckCircle2 } from "lucide-react"
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

type RowState = {
  casePriceStr: string
  casePriceAStr: string
  casePriceBStr: string
  originalCaseStr: string
  originalAStr: string
  originalBStr: string
  saving: boolean
}

/** Only categories that actually carry sellable stock make sense to price here. */
const PRICEABLE_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.status === "active")

function fmt(n: number): string {
  return n.toFixed(2)
}

export function AdminPricingView() {
  const [category, setCategory] = useState<ProductCategorySlug>(PRICEABLE_CATEGORIES[0]?.id ?? "vapes")
  const [brand, setBrand] = useState<string>("")
  const [line, setLine] = useState<string>("")
  const [dynamicBrands, setDynamicBrands] = useState<string[]>([])
  const [products, setProducts] = useState<PricingProduct[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(false)
  const [savingAll, setSavingAll] = useState(false)

  const staticBrandsForCategory = useMemo(() => {
    if (category === "vapes" || category === "e_liquids") return VAPING_BRANDS as readonly string[]
    if (category === "nicotine_pouches") return POUCH_BRANDS as readonly string[]
    return null
  }, [category])

  const brandOptions = staticBrandsForCategory ?? dynamicBrands

  // Reset brand/line whenever category changes, and fetch a dynamic brand list for
  // categories without a fixed roster (papers/filters/lighters/other).
  useEffect(() => {
    setBrand("")
    setLine("")
    setProducts([])
    setRows({})
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

  const knownLines = brand ? PRODUCT_LINES_BY_BRAND[brand] ?? [] : []

  // Fetch every product for the chosen category+brand once both are picked.
  useEffect(() => {
    setLine("")
    setProducts([])
    setRows({})
    if (!brand) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ category, brand, limit: "100" })
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list: PricingProduct[] = Array.isArray(data?.products) ? data.products : []
        setProducts(list)
      })
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [category, brand])

  const visibleProducts = useMemo(() => {
    if (!line) return products
    return products.filter((p) => p.productLine === line)
  }, [products, line])

  // (Re)build editable row state whenever the visible product set changes — pre-filled
  // with the *effective* price per tier (falls back to the base/Tier-C price when no
  // override exists yet), so admin sees what each tier actually pays right now.
  useEffect(() => {
    const next: Record<string, RowState> = {}
    for (const p of visibleProducts) {
      const caseStr = fmt(p.casePrice)
      const aStr = fmt(p.casePriceA ?? p.casePrice)
      const bStr = fmt(p.casePriceB ?? p.casePrice)
      next[p.id] = {
        casePriceStr: caseStr,
        casePriceAStr: aStr,
        casePriceBStr: bStr,
        originalCaseStr: caseStr,
        originalAStr: aStr,
        originalBStr: bStr,
        saving: false,
      }
    }
    setRows(next)
  }, [visibleProducts])

  const updateRow = (id: string, field: "casePriceStr" | "casePriceAStr" | "casePriceBStr", value: string) => {
    setRows((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], [field]: value } } : prev))
  }

  const isRowDirty = (r: RowState) =>
    r.casePriceStr !== r.originalCaseStr || r.casePriceAStr !== r.originalAStr || r.casePriceBStr !== r.originalBStr

  const dirtyCount = Object.values(rows).filter(isRowDirty).length

  const saveRow = async (product: PricingProduct): Promise<boolean> => {
    const r = rows[product.id]
    if (!r) return true
    const body: Record<string, number> = {}
    const caseNum = parseFloat(r.casePriceStr)
    const aNum = parseFloat(r.casePriceAStr)
    const bNum = parseFloat(r.casePriceBStr)
    if (r.casePriceStr !== r.originalCaseStr) {
      if (Number.isNaN(caseNum) || caseNum < 0) return false
      body.casePrice = Math.round(caseNum * 100) / 100
    }
    if (r.casePriceAStr !== r.originalAStr) {
      if (Number.isNaN(aNum) || aNum < 0) return false
      body.casePriceA = Math.round(aNum * 100) / 100
    }
    if (r.casePriceBStr !== r.originalBStr) {
      if (Number.isNaN(bNum) || bNum < 0) return false
      body.casePriceB = Math.round(bNum * 100) / 100
    }
    if (Object.keys(body).length === 0) return true

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.ok
  }

  const handleSaveAll = async () => {
    const dirtyProducts = visibleProducts.filter((p) => rows[p.id] && isRowDirty(rows[p.id]))
    if (dirtyProducts.length === 0) return
    setSavingAll(true)
    try {
      const results = await Promise.all(dirtyProducts.map((p) => saveRow(p)))
      const failCount = results.filter((ok) => !ok).length
      if (failCount > 0) {
        toast.error(`${failCount} of ${dirtyProducts.length} price updates failed — check the values and try again.`)
      } else {
        toast.success(`Saved new prices for ${dirtyProducts.length} ${dirtyProducts.length === 1 ? "product" : "products"}.`)
      }
      // Re-baseline whatever succeeded so the dirty state clears.
      setRows((prev) => {
        const next = { ...prev }
        dirtyProducts.forEach((p, i) => {
          if (results[i] && next[p.id]) {
            next[p.id] = {
              ...next[p.id],
              originalCaseStr: next[p.id].casePriceStr,
              originalAStr: next[p.id].casePriceAStr,
              originalBStr: next[p.id].casePriceBStr,
            }
          }
        })
        return next
      })
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[13px] font-bold text-slate-800">Bulk price editor</h2>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          Pick a category, brand, and (if it has one) a product line — every flavour underneath
          shows up below with its Tier A/B/C case price ready to edit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Line <span className="normal-case font-medium text-slate-400">(optional)</span>
            </label>
            <select
              value={line}
              onChange={(e) => setLine(e.target.value)}
              disabled={knownLines.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">All lines</option>
              {knownLines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && brand && visibleProducts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700">No products found</p>
          <p className="text-[11px] text-slate-400 mt-1">Nothing live yet for {brand} in this section.</p>
        </div>
      )}

      {!loading && visibleProducts.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-wider text-slate-400">
              <span>Flavour</span>
              <span className="text-right">Tier C</span>
              <span className="text-right">Tier A</span>
              <span className="text-right">Tier B</span>
            </div>
            <div className="divide-y divide-slate-50">
              {visibleProducts.map((p) => {
                const r = rows[p.id]
                if (!r) return null
                const dirty = isRowDirty(r)
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] items-center gap-2 px-4 py-2.5 ${
                      dirty ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[9.5px] text-slate-400 font-semibold">{p.packLabel}</p>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.casePriceStr}
                      onChange={(e) => updateRow(p.id, "casePriceStr", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right font-mono text-[12px]"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.casePriceAStr}
                      onChange={(e) => updateRow(p.id, "casePriceAStr", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right font-mono text-[12px]"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.casePriceBStr}
                      onChange={(e) => updateRow(p.id, "casePriceBStr", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right font-mono text-[12px]"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={dirtyCount === 0 || savingAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {savingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : dirtyCount === 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingAll
              ? "Saving…"
              : dirtyCount === 0
                ? "No changes to save"
                : `Save ${dirtyCount} changed ${dirtyCount === 1 ? "price" : "prices"}`}
          </button>
        </>
      )}
    </div>
  )
}
