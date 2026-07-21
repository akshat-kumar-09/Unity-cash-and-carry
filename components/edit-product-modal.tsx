"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Pencil } from "lucide-react"
import { getEffectiveMaxQtyPerOrder, type Product } from "@/lib/products"
import { PRODUCT_LINES_BY_BRAND } from "@/lib/product-categories"

type EditProductModalProps = {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function EditProductModal({ product, isOpen, onClose, onSuccess }: EditProductModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [productLine, setProductLine] = useState("")
  const [casePriceStr, setCasePriceStr] = useState("")
  const [unitPriceStr, setUnitPriceStr] = useState("")
  const [casePriceAStr, setCasePriceAStr] = useState("")
  const [unitPriceAStr, setUnitPriceAStr] = useState("")
  const [casePriceBStr, setCasePriceBStr] = useState("")
  const [unitPriceBStr, setUnitPriceBStr] = useState("")
  const [unitsPerPackStr, setUnitsPerPackStr] = useState("")
  const [packLabel, setPackLabel] = useState("")
  const [maxQtyPerOrderStr, setMaxQtyPerOrderStr] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [liquidVolumeMl, setLiquidVolumeMl] = useState(2.0)
  const [isSubjectToVapeDuty, setIsSubjectToVapeDuty] = useState(true)
  const [nicotineStrengthMg, setNicotineStrengthMg] = useState(20.0)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description ?? "")
      setImageUrl(product.imageUrl ?? "")
      setProductLine(product.productLine ?? "")
      setCasePriceStr(String(roundMoney(product.casePrice)))
      setUnitPriceStr(String(roundMoney(product.unitPrice)))
      setCasePriceAStr(product.casePriceA != null ? String(roundMoney(product.casePriceA)) : "")
      setUnitPriceAStr(product.unitPriceA != null ? String(roundMoney(product.unitPriceA)) : "")
      setCasePriceBStr(product.casePriceB != null ? String(roundMoney(product.casePriceB)) : "")
      setUnitPriceBStr(product.unitPriceB != null ? String(roundMoney(product.unitPriceB)) : "")
      setUnitsPerPackStr(String(product.unitsPerPack))
      setPackLabel(product.packLabel ?? "")
      setMaxQtyPerOrderStr(String(getEffectiveMaxQtyPerOrder(product)))
      setLiquidVolumeMl(product.liquidVolumeMl ?? 2.0)
      setIsSubjectToVapeDuty(product.isSubjectToVapeDuty ?? true)
      setNicotineStrengthMg(product.nicotineStrengthMg ?? 20.0)
      setError("")
    }
  }, [product])

  useEffect(() => {
    if (!isOpen || !product) return
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
  }, [isOpen, product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setError("")
    setLoading(true)
    try {
      const body: {
        name?: string
        description?: string
        imageUrl?: string | null
        productLine?: string | null
        casePrice?: number
        unitPrice?: number
        casePriceA?: number | null
        unitPriceA?: number | null
        casePriceB?: number | null
        unitPriceB?: number | null
        unitsPerPack?: number
        packLabel?: string
        maxQtyPerOrder?: number
        liquidVolumeMl?: number
        isSubjectToVapeDuty?: boolean
        nicotineStrengthMg?: number
      } = {}
      if (name.trim() !== product.name) body.name = name.trim()

      const descTrim = description.trim()
      const prevDesc = (product.description ?? "").trim()
      if (descTrim !== prevDesc) {
        if (descTrim.length < 20) {
          setError("Description must be at least 20 characters (UK product information).")
          setLoading(false)
          return
        }
        body.description = descTrim
      }

      const trimmed = imageUrl.trim()
      const prev = product.imageUrl ?? ""
      if (trimmed !== prev) {
        body.imageUrl = trimmed === "" ? null : trimmed
      }

      const lineTrimmed = productLine.trim()
      const linePrev = product.productLine ?? ""
      if (lineTrimmed !== linePrev) {
        body.productLine = lineTrimmed === "" ? null : lineTrimmed
      }

      const caseP = parseFloat(casePriceStr.replace(",", "."))
      const unitP = parseFloat(unitPriceStr.replace(",", "."))
      if (Number.isNaN(caseP) || caseP <= 0) {
        setError("Case price must be a positive number.")
        setLoading(false)
        return
      }
      if (Number.isNaN(unitP) || unitP <= 0) {
        setError("Unit price must be a positive number.")
        setLoading(false)
        return
      }
      const caseRounded = roundMoney(caseP)
      const unitRounded = roundMoney(unitP)
      if (caseRounded !== roundMoney(product.casePrice)) body.casePrice = caseRounded
      if (unitRounded !== roundMoney(product.unitPrice)) body.unitPrice = unitRounded

      const parseOptionalTier = (str: string, label: string): number | null => {
        const trimmed = str.trim()
        if (trimmed === "") return null
        const n = parseFloat(trimmed.replace(",", "."))
        if (Number.isNaN(n) || n <= 0) {
          throw new Error(`${label} must be a positive number, or blank to clear it.`)
        }
        return roundMoney(n)
      }

      const caseA = parseOptionalTier(casePriceAStr, "Tier A case price")
      if (caseA !== (product.casePriceA ?? null)) body.casePriceA = caseA

      const unitA = parseOptionalTier(unitPriceAStr, "Tier A unit price")
      if (unitA !== (product.unitPriceA ?? null)) body.unitPriceA = unitA

      const caseB = parseOptionalTier(casePriceBStr, "Tier B case price")
      if (caseB !== (product.casePriceB ?? null)) body.casePriceB = caseB

      const unitB = parseOptionalTier(unitPriceBStr, "Tier B unit price")
      if (unitB !== (product.unitPriceB ?? null)) body.unitPriceB = unitB

      const upp = parseInt(unitsPerPackStr.replace(/\D/g, ""), 10)
      if (Number.isNaN(upp) || upp < 1) {
        setError("Units per box must be a whole number of at least 1.")
        setLoading(false)
        return
      }
      if (upp !== product.unitsPerPack) body.unitsPerPack = upp

      const packTrim = packLabel.trim()
      if (packTrim.length < 1) {
        setError("Pack label is required (e.g. Box of 5).")
        setLoading(false)
        return
      }
      if (packTrim !== product.packLabel) body.packLabel = packTrim

      const maxQ = parseInt(maxQtyPerOrderStr.replace(/\D/g, ""), 10)
      if (Number.isNaN(maxQ) || maxQ < 1) {
        setError("Order limit must be a whole number of at least 1.")
        setLoading(false)
        return
      }
      if (maxQ > 99999) {
        setError("Order limit cannot exceed 99999.")
        setLoading(false)
        return
      }
      if (maxQ !== getEffectiveMaxQtyPerOrder(product)) body.maxQtyPerOrder = maxQ
      if (liquidVolumeMl !== (product.liquidVolumeMl ?? 2.0)) body.liquidVolumeMl = liquidVolumeMl
      if (isSubjectToVapeDuty !== (product.isSubjectToVapeDuty ?? true)) body.isSubjectToVapeDuty = isSubjectToVapeDuty
      if (nicotineStrengthMg !== (product.nicotineStrengthMg ?? 20.0)) body.nicotineStrengthMg = nicotineStrengthMg

      if (Object.keys(body).length === 0) {
        onClose()
        return
      }
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update")
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !product) return null

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
        aria-labelledby="edit-product-title"
        className="flex h-[100dvh] w-full max-w-md flex-col border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id="edit-product-title"
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800"
          >
            <Pencil className="h-4 w-4 text-blue-600" />
            Edit product
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
          <p className="text-[11px] text-slate-500 font-mono truncate">SKU: {product.sku}</p>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Product description (UK product information)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm leading-relaxed resize-y min-h-[100px]"
              placeholder="Ingredients, nicotine strength, warnings, disposal — as required for trade listings."
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Minimum 20 characters. Shown to trade customers on the product card.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Case price (£ ex VAT)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={casePriceStr}
                onChange={(e) => setCasePriceStr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Unit price (£ ex VAT)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={unitPriceStr}
                onChange={(e) => setUnitPriceStr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Cart totals use case price + VAT. Prices are stored ex. VAT. This is the Tier C (standard) price.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Tier pricing overrides (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Tier A case (£)
                </label>
                <input type="text" inputMode="decimal" value={casePriceAStr} onChange={(e) => setCasePriceAStr(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="Leave blank" autoComplete="off" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Tier A unit (£)
                </label>
                <input type="text" inputMode="decimal" value={unitPriceAStr} onChange={(e) => setUnitPriceAStr(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="Leave blank" autoComplete="off" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Tier B case (£)
                </label>
                <input type="text" inputMode="decimal" value={casePriceBStr} onChange={(e) => setCasePriceBStr(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="Leave blank" autoComplete="off" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Tier B unit (£)
                </label>
                <input type="text" inputMode="decimal" value={unitPriceBStr} onChange={(e) => setUnitPriceBStr(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="Leave blank" autoComplete="off" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-snug">
              Tier A = most valued retailers, Tier B = valued retailers. Blank = they see the standard Tier C price above.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Units per box (case pack)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={unitsPerPackStr}
              onChange={(e) => setUnitsPerPackStr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              inputMode="numeric"
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              How many sellable units are in one wholesale box/case.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Pack label
            </label>
            <input
              value={packLabel}
              onChange={(e) => setPackLabel(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. Box of 5, Outer of 10"
              autoComplete="off"
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Shown on product cards under the name — match units per box (e.g. Box of 5 when the case holds 5).
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Order limit
            </label>
            <input
              type="number"
              min={1}
              max={99999}
              step={1}
              value={maxQtyPerOrderStr}
              onChange={(e) => setMaxQtyPerOrderStr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              inputMode="numeric"
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Max wholesale cases one customer can buy per order (cart and checkout enforce this).
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
                checked={isSubjectToVapeDuty}
                onChange={(e) => setIsSubjectToVapeDuty(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {isSubjectToVapeDuty && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    E-Liquid Volume (ml)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={liquidVolumeMl}
                    onChange={(e) => setLiquidVolumeMl(parseFloat(e.target.value) || 0)}
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
                    value={nicotineStrengthMg}
                    onChange={(e) => setNicotineStrengthMg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    required
                  />
                  <p className="mt-0.5 text-[8.5px] text-slate-400">Standard max limit is 20.0mg/ml</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Product line (vapes/e-liquids)</label>
            <input
              list="edit-product-line-suggestions"
              value={productLine}
              onChange={(e) => setProductLine(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. BB 4000 Kit, Pulse Pods, Higo Salts"
              autoComplete="off"
            />
            <datalist id="edit-product-line-suggestions">
              {(PRODUCT_LINES_BY_BRAND[product.brand] ?? []).map((line) => (
                <option key={line} value={line} />
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Groups flavours under this line in the shop&apos;s brand drilldown. Clear to remove from the drilldown.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Image URL</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-[13px]"
              placeholder="https://… or /brands/elf-bar.png"
            />
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              Leave empty to use category placeholder. Clear field to remove custom image.
            </p>
          </div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
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
