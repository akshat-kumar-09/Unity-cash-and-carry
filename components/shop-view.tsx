"use client"

import { useMemo, useState } from "react"
import { Search, Filter, ChevronLeft, ShoppingCart } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"
import { useCart } from "@/lib/cart-context"
import { CartFooter } from "@/components/cart-footer"
import { ShopCategoryAccordion } from "@/components/shop-category-accordion"
import { AdminBanner } from "@/components/admin-banner"
import { ProductCatalog } from "@/components/product-catalog"
import { SHOP_CATEGORIES, SIMPLE_BROWSE_SLUGS, type ProductCategorySlug } from "@/lib/product-categories"
import type { BrandFilter } from "@/lib/products"

type ShopViewProps = {
  isAdmin: boolean
  productRefreshKey: number
  onProductAdded?: () => void
}

export function ShopView({ isAdmin, productRefreshKey, onProductAdded }: ShopViewProps) {
  const { totalItems, openCart } = useCart()
  const [search, setSearch] = useState("")
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<ProductCategorySlug | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<BrandFilter | null>(null)

  const showProductGrid = useMemo(() => {
    if (!selectedCategorySlug) return false
    if (SIMPLE_BROWSE_SLUGS.includes(selectedCategorySlug)) return true
    if (selectedCategorySlug === "vapes" || selectedCategorySlug === "e_liquids") {
      return !!(selectedSubcategory && selectedBrand)
    }
    return false
  }, [selectedCategorySlug, selectedSubcategory, selectedBrand])

  const categoryLabel = useMemo(() => {
    if (!selectedCategorySlug) return ""
    return SHOP_CATEGORIES.find((c) => c.id === selectedCategorySlug)?.label ?? selectedCategorySlug
  }, [selectedCategorySlug])

  const resetBrowse = () => {
    setSelectedCategorySlug(null)
    setSelectedSubcategory(null)
    setSelectedBrand(null)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col unity-app-screen w-full md:max-w-4xl md:mx-auto md:shadow-xl md:border-x md:border-slate-200/80">
      <header className="sticky top-0 z-50 unity-surface-elevated border-b border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm shrink-0 ring-1 ring-slate-100">
              <UnityLogo size={32} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Unity Cash &amp; Carry
              </p>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                Shop
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.98] unity-tap"
            aria-label={`View cart (${totalItems} items)`}
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900 shadow-sm">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 shadow-inner ring-1 ring-slate-100 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-blue-100 transition-colors">
            <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Start typing to filter products..."
              className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              aria-label="Search products"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto shop-main-tint pb-28">
        {isAdmin && <AdminBanner onProductAdded={onProductAdded} morphed={false} />}

        {!showProductGrid ? (
          <ShopCategoryAccordion
            onNavigate={({ categorySlug, subcategory, brand }) => {
              setSelectedCategorySlug(categorySlug)
              setSelectedSubcategory(subcategory)
              setSelectedBrand(brand)
            }}
          />
        ) : (
          <>
            {/* Stays visible while scrolling product list — phone-first */}
            <div className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/90">
              <button
                type="button"
                onClick={resetBrowse}
                className="unity-tap flex w-full items-center gap-2 rounded-xl py-1 text-left text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                Back to categories
              </button>
            </div>

            <div className="px-3 pb-6 pt-3">
              {selectedCategorySlug && SIMPLE_BROWSE_SLUGS.includes(selectedCategorySlug) ? (
                <div className="unity-card mb-4 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {categoryLabel}
                  </p>
                  <p className="text-base font-bold text-slate-900">All lines</p>
                </div>
              ) : (
                selectedSubcategory &&
                selectedBrand && (
                  <div className="unity-card mb-4 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {categoryLabel} · {selectedSubcategory}
                    </p>
                    <p className="text-base font-bold text-slate-900">{selectedBrand}</p>
                  </div>
                )
              )}

              {selectedCategorySlug && (
                <ProductCatalog
                  isAdmin={isAdmin}
                  refreshKey={productRefreshKey}
                  search={search}
                  categorySlug={selectedCategorySlug}
                  activeBrand={selectedBrand ?? "All"}
                  subcategoryFilter={selectedSubcategory}
                  onProductUpdated={() => {
                    onProductAdded?.()
                  }}
                />
              )}
            </div>
          </>
        )}
      </main>

      <CartFooter />
    </div>
  )
}
