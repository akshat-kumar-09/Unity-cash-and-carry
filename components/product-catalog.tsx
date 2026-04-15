"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { matchesBrandFilter, type BrandFilter, type Product } from "@/lib/products"
import { demoProducts } from "@/lib/demo-products"
import { ProductCard } from "./product-card"
import { BrandHeader } from "./brand-header"
import { EditProductModal } from "./edit-product-modal"
import { BulkEditProductsModal } from "./bulk-edit-products-modal"
import type { ProductCategorySlug } from "@/lib/product-categories"

function isLiveCatalogProduct(p: Product) {
  return !String(p.id).startsWith("demo-")
}

const PAGE_SIZE = 24
/** When drilling into vape/e-liquid sub-shelves, fetch more rows so client-side subcategory rules aren’t applied to a tiny first page only (max allowed by API is 100). */
const SUBCATEGORY_FETCH_LIMIT = 100

type ProductCatalogProps = {
  isAdmin?: boolean
  refreshKey?: number
  search: string
  categorySlug: ProductCategorySlug
  activeBrand: BrandFilter
  /** When set, filter products by subcategory (vaping / e-liquids ladders). */
  subcategoryFilter?: string | null
  onProductUpdated?: () => void
}

function matchesSubcategory(
  product: Product,
  subcategory: string,
  categorySlug: ProductCategorySlug
): boolean {
  if (categorySlug === "e_liquids") {
    if (subcategory === "Nic Salts") {
      return /salt|nic|10ml|20mg/i.test(product.name + (product.sku ?? ""))
    }
    if (subcategory === "Freebase") {
      return /freebase|3mg|6mg|12mg/i.test(product.name + (product.sku ?? "")) || true
    }
    if (subcategory === "Shortfills") {
      return /short|50ml|100ml/i.test(product.name + (product.sku ?? "")) || true
    }
    if (subcategory === "Bar Salts") {
      return /bar|disposable/i.test(product.name + (product.sku ?? "")) || true
    }
    return true
  }

  if (categorySlug !== "vapes") return true

  if (subcategory === "NEW Compliant 600 Puffs") {
    return /600/i.test(product.name) || /600|EB6|6\d{2}/i.test(product.sku ?? "")
  }
  if (subcategory === "Big Puff Devices") {
    return true
  }
  if (subcategory === "Pre-filled POD Systems" || subcategory === "Open POD Systems") {
    return true
  }
  return true
}

export function ProductCatalog({
  isAdmin = false,
  refreshKey = 0,
  search,
  categorySlug,
  activeBrand,
  subcategoryFilter = null,
  onProductUpdated,
}: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usingDemo, setUsingDemo] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    const params = new URLSearchParams()
    params.set("category", categorySlug)
    if (activeBrand !== "All") params.append("brand", activeBrand)
    if (search.trim()) params.append("search", search.trim())
    params.set("page", String(pageNum))
    const limit = subcategoryFilter != null ? SUBCATEGORY_FETCH_LIMIT : PAGE_SIZE
    params.set("limit", String(limit))

    const response = await fetch(`/api/products?${params.toString()}`)
    const data = await response.json()
    if (!response.ok) throw new Error("Failed to fetch products")
    if (data?.products && Array.isArray(data.products)) {
      setTotal(data.total ?? data.products.length)
      setPage(data.page ?? pageNum)
      setProducts((prev) => (append ? [...prev, ...data.products] : data.products))
      setUsingDemo(false)
      setError(null)
      return { total: data.total, totalPages: data.totalPages ?? 1 }
    }
    throw new Error("Invalid response")
  }, [activeBrand, search, categorySlug, subcategoryFilter])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("category", categorySlug)
        if (activeBrand !== "All") params.append("brand", activeBrand)
        if (search.trim()) params.append("search", search.trim())
        params.set("page", "1")
        const limit = subcategoryFilter != null ? SUBCATEGORY_FETCH_LIMIT : PAGE_SIZE
        params.set("limit", String(limit))

        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()
        if (cancelled) return
        if (!response.ok) throw new Error("Failed to fetch products")
        if (data?.products && Array.isArray(data.products)) {
          const totalFromApi = data.total ?? 0
          const emptyLive = data.products.length === 0 && totalFromApi === 0 && !search.trim()
          if (emptyLive) {
            setUsingDemo(true)
            setProducts([])
            setTotal(0)
            setPage(1)
            setError("Live catalogue is empty — showing sample products. Add stock in Admin when ready.")
            return
          }
          setProducts(data.products)
          setTotal(totalFromApi)
          setPage(1)
          setUsingDemo(false)
          setError(null)
        } else {
          setUsingDemo(true)
          setProducts([])
          setTotal(0)
          setPage(1)
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        setProducts([])
        setTotal(0)
        setPage(1)
        setUsingDemo(true)
        setError("Could not load products. Showing demo catalogue.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeBrand, search, refreshKey, categorySlug, subcategoryFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list: Product[]
    if (usingDemo) {
      list = demoProducts.filter((p) => {
        if (p.category !== categorySlug) return false
        if (!matchesBrandFilter(p, activeBrand)) return false
        if (!isAdmin && subcategoryFilter && !matchesSubcategory(p, subcategoryFilter, categorySlug)) return false
        if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false
        return true
      })
    } else {
      list = products.filter((p) => {
        if (p.category !== categorySlug) return false
        if (!matchesBrandFilter(p, activeBrand)) return false
        // Subcategory rules use heuristics on name/SKU; renaming can drop "600" etc. and hide the product.
        // Admins need to see every product the API returned for this category/brand so edits don't "vanish".
        if (!isAdmin && subcategoryFilter && !matchesSubcategory(p, subcategoryFilter, categorySlug)) return false
        if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false
        return true
      })
    }
    return [...list].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name))
  }, [products, usingDemo, activeBrand, search, subcategoryFilter, categorySlug, isAdmin])

  useEffect(() => {
    setSelectedIds([])
  }, [categorySlug, activeBrand, search, subcategoryFilter, usingDemo])

  const toggleSelectProduct = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const useClientFilter = usingDemo || subcategoryFilter != null
  const demoTotal = filtered.length
  const demoPageSize = PAGE_SIZE
  const demoDisplayed = useClientFilter ? filtered.slice(0, page * demoPageSize) : products
  const demoHasMore = useClientFilter ? page * demoPageSize < demoTotal : false
  const totalCount = useClientFilter ? demoTotal : total
  const hasMore = useClientFilter ? demoHasMore : products.length < total

  const selectAllVisibleLive = useCallback(() => {
    const ids = demoDisplayed
      .filter((p) => isAdmin && !usingDemo && isLiveCatalogProduct(p))
      .map((p) => p.id)
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])))
  }, [demoDisplayed, isAdmin, usingDemo])

  const handleLoadMore = async () => {
    if (useClientFilter) {
      setPage((p) => p + 1)
      return
    }
    setLoadingMore(true)
    try {
      await fetchPage(page + 1, true)
    } catch {
      // ignore
    } finally {
      setLoadingMore(false)
    }
  }

  const handleAdminDelete = async (product: Product) => {
    if (!isAdmin || usingDemo || String(product.id).startsWith("demo-")) return
    if (!confirm(`Remove “${product.name}” from the catalog?`)) return
    setDeletingId(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Could not remove product.")
        return
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      setTotal((t) => Math.max(0, t - 1))
      onProductUpdated?.()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex-1 pb-40">
      <EditProductModal
        product={editingProduct}
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          onProductUpdated?.()
          setEditingProduct(null)
        }}
      />
      <BulkEditProductsModal
        isOpen={bulkModalOpen}
        selectedIds={selectedIds}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={() => {
          setSelectedIds([])
          setBulkModalOpen(false)
          onProductUpdated?.()
        }}
      />
      {/* Results bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm shop-section-tint">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            {loading
              ? "Loading..."
              : totalCount === 0
                ? "0 products"
                : `${demoDisplayed.length} of ${totalCount} ${totalCount === 1 ? "product" : "products"}`
            }
          </p>
          {isAdmin && !usingDemo && !loading && totalCount > 0 && (
            <button
              type="button"
              onClick={selectAllVisibleLive}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
            >
              Select visible
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80">
            Ex VAT
          </p>
        </div>
      </div>

      {/* API fallback notice — calm, not alarming */}
      {error && (
        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-center shadow-sm">
          <p className="text-[13px] font-medium leading-snug text-amber-950/90">
            {error}
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="px-3 py-16 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
              Loading products...
            </p>
          </div>
        </div>
      )}

      {/* Brand header (when a single brand is selected) */}
      {!loading && !error && activeBrand !== "All" && (
        <div className="mt-3">
          <BrandHeader brand={activeBrand} />
        </div>
      )}

      {/* Product grid */}
      {!loading && !error && (
        <>
          {isAdmin && !usingDemo && selectedIds.length > 0 && (
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-2 right-2 z-[45] flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 text-sm shadow-lg shadow-slate-900/10 backdrop-blur-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
              <span className="font-bold text-slate-800">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700"
              >
                Bulk edit
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 pb-4">
            {demoDisplayed.map((product, i) => {
              const live = isLiveCatalogProduct(product)
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isAdmin={isAdmin}
                  bulkSelected={selectedIds.includes(product.id)}
                  onBulkToggle={
                    isAdmin && !usingDemo && live ? () => toggleSelectProduct(product.id) : undefined
                  }
                  onAdminEdit={
                    isAdmin && !usingDemo && live ? () => setEditingProduct(product) : undefined
                  }
                  onAdminDelete={
                    isAdmin && !usingDemo && live
                      ? () => {
                          if (deletingId) return
                          void handleAdminDelete(product)
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center pb-8">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !error && totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-slate-800">No products found</p>
          <p className="unity-meta mx-auto mt-2 max-w-[260px]">
            {activeBrand !== "All"
              ? `No products for ${activeBrand} in this section. Try another line or search.`
              : "Try a different search or category."}
          </p>
        </div>
      )}
    </div>
  )
}
