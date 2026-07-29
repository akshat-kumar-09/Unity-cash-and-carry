"use client"

import { useEffect, useState } from "react"
import { Flame, Sparkles, Plus, X, ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react"
import { getProductImageUrl } from "@/lib/products"
import { toast } from "sonner"

type TrendingItem = {
  id: string
  name: string
  brand: string
  casePrice: number
  imageUrl?: string | null
  category: string
  badge?: string | null
  trendingOrder?: number | null
  reason: "featured" | "trending"
}

type SearchProduct = {
  id: string
  name: string
  brand: string
  sku: string
  imageUrl?: string | null
  category: string
  badge?: string | null
}

/** Admin's "What's Selling" shelf — same visual card as the trader-facing carousel
 *  (components/orders-view.tsx), plus curation controls: remove, reorder (swap with
 *  neighbour), and add via search. Reuses the existing `badge` field to feature a
 *  product and the new `trendingOrder` field to persist manual sequencing. */
export function AdminTrendingShelf() {
  const [featured, setFeatured] = useState<TrendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchProduct[]>([])
  const [searching, setSearching] = useState(false)

  const loadFeatured = async () => {
    try {
      const res = await fetch("/api/products/trending")
      const data = await res.json()
      const items: TrendingItem[] = Array.isArray(data?.products) ? data.products : []
      setFeatured(items.filter((p) => p.reason === "featured"))
    } catch {
      toast.error("Failed to load trending list")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadFeatured() }, [])

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=8`)
      const data = await res.json()
      setResults(Array.isArray(data?.products) ? data.products : [])
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  const patchProduct = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("Failed to update product")
  }

  const handleRemove = async (product: TrendingItem) => {
    setBusyId(product.id)
    try {
      await patchProduct(product.id, { badge: null, trendingOrder: null })
      toast.success("Removed from trending shelf")
      await loadFeatured()
    } catch {
      toast.error("Failed to update product")
    } finally {
      setBusyId(null)
    }
  }

  const handleAdd = async (product: SearchProduct) => {
    setBusyId(product.id)
    try {
      const nextOrder = featured.length
      await patchProduct(product.id, { badge: "Popular", trendingOrder: nextOrder })
      toast.success("Added to trending shelf")
      setResults((prev) => prev.map((p) => (p.id === product.id ? { ...p, badge: "Popular" } : p)))
      await loadFeatured()
    } catch {
      toast.error("Failed to update product")
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= featured.length) return
    const a = featured[index]
    const b = featured[otherIndex]
    setBusyId(a.id)
    try {
      // Persist by swapping explicit sort positions (index-based), never relying on
      // whatever trendingOrder happened to be — guarantees no ties across passes.
      await Promise.all([
        patchProduct(a.id, { trendingOrder: otherIndex }),
        patchProduct(b.id, { trendingOrder: index }),
      ])
      const next = [...featured]
      next[index] = b
      next[otherIndex] = a
      setFeatured(next)
    } catch {
      toast.error("Failed to reorder")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Flame className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-white">What's Selling</h2>
            <p className="text-[10.5px] font-medium text-blue-100/70">Curate the customer-facing shelf</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/90 hover:bg-white/15 transition-colors active:scale-[0.97]"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 w-32 shrink-0 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : featured.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center">
          <p className="text-[12px] font-medium text-blue-100/70">Nothing featured yet — tap Add to feature a product.</p>
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featured.map((product, i) => (
            <div
              key={product.id}
              className="group relative flex w-32 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"
            >
              <div className="relative aspect-square w-full bg-gradient-to-br from-slate-50 to-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getProductImageUrl(product)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain p-2"
                  onError={(e) => { const t = e.currentTarget; if (t.src !== "/placeholder.svg") t.src = "/placeholder.svg" }}
                />
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
                  <Sparkles className="h-2.5 w-2.5" />
                  {product.badge || "Featured"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(product)}
                  disabled={busyId === product.id}
                  aria-label={`Remove ${product.name} from trending`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-red-50 disabled:opacity-40"
                >
                  {busyId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              </div>
              <div className="space-y-0.5 p-2.5">
                <p className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{product.brand}</p>
                <p className="line-clamp-2 text-[11.5px] font-bold leading-snug text-slate-800">{product.name}</p>
                <p className="pt-0.5 font-mono text-[12px] font-black text-blue-700">£{product.casePrice.toFixed(2)}</p>
              </div>
              <div className="flex border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0 || busyId !== null}
                  aria-label="Move earlier"
                  className="flex flex-1 items-center justify-center py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="w-px bg-slate-100" />
                <button
                  type="button"
                  onClick={() => handleMove(i, 1)}
                  disabled={i === featured.length - 1 || busyId !== null}
                  aria-label="Move later"
                  className="flex flex-1 items-center justify-center py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-auto w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/30 bg-white/5 text-blue-100/80 hover:bg-white/10 transition-colors"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add product</span>
          </button>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Feature a product</h3>
              <button
                type="button"
                onClick={() => { setAddOpen(false); setQuery(""); setResults([]) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={runSearch} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products to feature..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
                autoFocus
              />
              <button type="submit" disabled={searching} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
                {results.map((p) => {
                  const isFeatured = !!p.badge
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getProductImageUrl(p)} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10.5px] text-slate-500">{p.brand} · {p.sku}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === p.id || isFeatured}
                        onClick={() => handleAdd(p)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide disabled:opacity-40 ${
                          isFeatured ? "bg-slate-100 text-slate-500" : "bg-orange-500 text-white hover:bg-orange-600"
                        }`}
                      >
                        {busyId === p.id ? "…" : isFeatured ? "Featured" : "Feature"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
