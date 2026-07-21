"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Plus } from "lucide-react"
import { categories } from "@/lib/products"
import { PRODUCT_LINES_BY_BRAND } from "@/lib/product-categories"

const CATEGORIES = categories.map((c) => c.key)

type AddProductModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    brand: "",
    category: "vapes",
    productLine: "",
    sku: "",
    packLabel: "",
    unitsPerPack: 10,
    unitPrice: 0,
    casePrice: 0,
    unitPriceA: 0,
    casePriceA: 0,
    unitPriceB: 0,
    casePriceB: 0,
    maxQtyPerOrder: 100,
    badge: "",
    imageUrl: "",
    isSubjectToVapeDuty: true,
    liquidVolumeMl: 2.0,
    nicotineStrengthMg: 20.0,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setForm((p) => ({ ...p, [name]: checked }))
    } else if (name === "unitsPerPack" || name === "unitPrice" || name === "casePrice" || name === "unitPriceA" || name === "casePriceA" || name === "unitPriceB" || name === "casePriceB" || name === "maxQtyPerOrder" || name === "liquidVolumeMl" || name === "nicotineStrengthMg") {
      const num = parseFloat(value) || 0
      setForm((p) => ({ ...p, [name]: num }))
    } else {
      setForm((p) => ({ ...p, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (form.description.trim().length < 20) {
      setError("Product description must be at least 20 characters (UK product information requirement).")
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        description: form.description.trim(),
        productLine: form.productLine.trim() || undefined,
        badge: form.badge.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        unitPriceA: form.unitPriceA > 0 ? form.unitPriceA : undefined,
        casePriceA: form.casePriceA > 0 ? form.casePriceA : undefined,
        unitPriceB: form.unitPriceB > 0 ? form.unitPriceB : undefined,
        casePriceB: form.casePriceB > 0 ? form.casePriceB : undefined,
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add product")
      setForm({
        name: "",
        description: "",
        brand: "",
        category: "vapes",
        productLine: "",
        sku: "",
        packLabel: "",
        unitsPerPack: 10,
        unitPrice: 0,
        casePrice: 0,
        unitPriceA: 0,
        casePriceA: 0,
        unitPriceB: 0,
        casePriceB: 0,
        maxQtyPerOrder: 100,
        badge: "",
        imageUrl: "",
        isSubjectToVapeDuty: true,
        liquidVolumeMl: 2.0,
        nicotineStrengthMg: 20.0,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const body = document.body
    const html = document.documentElement
    const prevBody = body.style.overflow
    const prevHtml = html.style.overflow
    body.style.overflow = "hidden"
    html.style.overflow = "hidden"
    return () => {
      body.style.overflow = prevBody
      html.style.overflow = prevHtml
    }
  }, [isOpen])

  if (!isOpen) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-title"
        className="flex h-[100dvh] w-full max-w-md flex-col border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="add-product-title" className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Add Product
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. 600 Blue Razz" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Product description (UK — required)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm leading-relaxed resize-y min-h-[88px]"
              placeholder="Ingredients, nicotine strength, warnings, batch/disposal — min. 20 characters."
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Legally required visible product information for UK trade listings. Shown to customers on the product card.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Brand</label>
            <input name="brand" value={form.brand} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. Elf Bar" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full max-h-48 px-3 py-2 border border-slate-200 rounded text-sm overflow-y-auto">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Product line (vapes/e-liquids)</label>
            <input
              name="productLine"
              list="product-line-suggestions"
              value={form.productLine}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
              placeholder="e.g. BB 4000 Kit, Pulse Pods, Higo Salts"
              autoComplete="off"
            />
            <datalist id="product-line-suggestions">
              {(PRODUCT_LINES_BY_BRAND[form.brand] ?? []).map((line) => (
                <option key={line} value={line} />
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Groups flavours under this line in the shop&apos;s brand drilldown (e.g. Higo → Pulse Pods → flavours). Leave blank for non-vape/e-liquid categories.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">SKU (optional)</label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-mono uppercase"
              placeholder="e.g. EB6-BLRA — leave blank to auto-generate"
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">If empty, Unity assigns a unique code automatically.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Pack Label</label>
            <input name="packLabel" value={form.packLabel} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. Box of 10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Units per box</label>
              <input name="unitsPerPack" type="number" min={1} value={form.unitsPerPack || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Order limit</label>
              <input name="maxQtyPerOrder" type="number" min={1} max={99999} value={form.maxQtyPerOrder || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Unit £</label>
              <input name="unitPrice" type="number" step="0.01" min={0} value={form.unitPrice || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Case £</label>
              <input name="casePrice" type="number" step="0.01" min={0} value={form.casePrice || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug -mt-1">
            Max wholesale cases one customer can buy per order (enforced in cart and checkout).
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Tier pricing (optional — Unit £/Case £ above is Tier C, the standard price)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tier A unit £</label>
                <input name="unitPriceA" type="number" step="0.01" min={0} value={form.unitPriceA || ""} onChange={handleChange} placeholder="Leave blank" className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tier A case £</label>
                <input name="casePriceA" type="number" step="0.01" min={0} value={form.casePriceA || ""} onChange={handleChange} placeholder="Leave blank" className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tier B unit £</label>
                <input name="unitPriceB" type="number" step="0.01" min={0} value={form.unitPriceB || ""} onChange={handleChange} placeholder="Leave blank" className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tier B case £</label>
                <input name="casePriceB" type="number" step="0.01" min={0} value={form.casePriceB || ""} onChange={handleChange} placeholder="Leave blank" className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-snug">
              Tier A = most valued retailers, Tier B = valued retailers. Blank = they see the standard Tier C price above.
            </p>
          </div>

          {/* Excise & TPD Compliance */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 text-left">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Excise & TPD Compliance
            </h4>
            
            <div className="flex items-center justify-between bg-white border border-slate-150 rounded-xl px-3 py-2.5">
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Subject to Vape Duty</p>
                <p className="text-[9px] font-semibold text-slate-400">Excise duty at £2.20 per 10ml liquid</p>
              </div>
              <input
                type="checkbox"
                name="isSubjectToVapeDuty"
                checked={form.isSubjectToVapeDuty}
                onChange={handleChange}
                className="h-4.5 w-4.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {form.isSubjectToVapeDuty && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    E-Liquid Volume (ml)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="liquidVolumeMl"
                    value={form.liquidVolumeMl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    required
                  />
                  <p className="mt-0.5 text-[8.5px] text-slate-400">Volume per unit (e.g. 2.0 or 10.0)</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Nicotine Strength (mg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="nicotineStrengthMg"
                    value={form.nicotineStrengthMg}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    required
                  />
                  <p className="mt-0.5 text-[8.5px] text-slate-400">Standard max limit is 20.0mg/ml</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Image URL (optional)</label>
            <input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-mono text-[13px]" placeholder="https://… or /brands/elf-bar.png" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Badge (optional)</label>
            <input name="badge" value={form.badge} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. Popular, New" />
          </div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {loading ? "Adding…" : "Add Product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(modal, document.body)
}
