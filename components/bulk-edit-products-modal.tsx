"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Layers } from "lucide-react"

type BulkEditProductsModalProps = {
  isOpen: boolean
  selectedIds: string[]
  onClose: () => void
  onSuccess: () => void
}

function parseOptionalPositive(s: string): number | undefined {
  const t = s.trim()
  if (t === "") return undefined
  const n = parseFloat(t.replace(",", "."))
  if (Number.isNaN(n) || n <= 0) return NaN
  return Math.round(n * 100) / 100
}

function parseOptionalInt(s: string): number | undefined {
  const t = s.trim()
  if (t === "") return undefined
  const n = parseInt(t.replace(/\D/g, ""), 10)
  if (Number.isNaN(n) || n < 1) return NaN
  return n
}

export function BulkEditProductsModal({
  isOpen,
  selectedIds,
  onClose,
  onSuccess,
}: BulkEditProductsModalProps) {
  const [casePriceStr, setCasePriceStr] = useState("")
  const [unitPriceStr, setUnitPriceStr] = useState("")
  const [unitsPerPackStr, setUnitsPerPackStr] = useState("")
  const [packLabel, setPackLabel] = useState("")
  const [maxQtyStr, setMaxQtyStr] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setCasePriceStr("")
      setUnitPriceStr("")
      setUnitsPerPackStr("")
      setPackLabel("")
      setMaxQtyStr("")
      setError("")
    }
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const n = selectedIds.length
    if (n < 1) return

    const casePrice = parseOptionalPositive(casePriceStr)
    const unitPrice = parseOptionalPositive(unitPriceStr)
    const unitsPerPack = parseOptionalInt(unitsPerPackStr)
    const maxQty = parseOptionalInt(maxQtyStr)
    const packTrim = packLabel.trim()

    if (casePrice !== undefined && Number.isNaN(casePrice)) {
      setError("Case price must be a positive number or left blank.")
      return
    }
    if (unitPrice !== undefined && Number.isNaN(unitPrice)) {
      setError("Unit price must be a positive number or left blank.")
      return
    }
    if (unitsPerPack !== undefined && Number.isNaN(unitsPerPack)) {
      setError("Units per box must be a whole number ≥ 1 or left blank.")
      return
    }
    if (maxQty !== undefined && Number.isNaN(maxQty)) {
      setError("Order limit must be a whole number ≥ 1 or left blank.")
      return
    }
    if (maxQty !== undefined && maxQty > 99999) {
      setError("Order limit cannot exceed 99999.")
      return
    }

    const payload: {
      productIds: string[]
      casePrice?: number
      unitPrice?: number
      unitsPerPack?: number
      packLabel?: string
      maxQtyPerOrder?: number
    } = { productIds: selectedIds }
    if (casePrice !== undefined) payload.casePrice = casePrice
    if (unitPrice !== undefined) payload.unitPrice = unitPrice
    if (unitsPerPack !== undefined) payload.unitsPerPack = unitsPerPack
    if (packTrim !== "") payload.packLabel = packTrim
    if (maxQty !== undefined) payload.maxQtyPerOrder = maxQty

    const keys = Object.keys(payload).filter((k) => k !== "productIds")
    if (keys.length === 0) {
      setError("Enter at least one field to apply to all selected products.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Bulk update failed")
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const count = selectedIds.length

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
        aria-labelledby="bulk-edit-title"
        className="flex h-[100dvh] w-full max-w-md flex-col border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id="bulk-edit-title"
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800"
          >
            <Layers className="h-4 w-4 text-blue-600" />
            Bulk edit ({count} {count === 1 ? "product" : "products"})
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
            <p className="text-[11px] leading-snug text-slate-600">
              Only fill fields you want to change — the same values will be applied to every selected product.
            </p>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                  Case price (£ ex VAT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={casePriceStr}
                  onChange={(e) => setCasePriceStr(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                  placeholder="Leave blank"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                  Unit price (£ ex VAT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitPriceStr}
                  onChange={(e) => setUnitPriceStr(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                  placeholder="Leave blank"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                Units per box
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={unitsPerPackStr}
                onChange={(e) => setUnitsPerPackStr(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                placeholder="Leave blank"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                Pack label
              </label>
              <input
                value={packLabel}
                onChange={(e) => setPackLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Leave blank"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                Order limit
              </label>
              <input
                type="number"
                min={1}
                max={99999}
                step={1}
                value={maxQtyStr}
                onChange={(e) => setMaxQtyStr(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                placeholder="Leave blank"
              />
            </div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={loading || count < 1}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Applying…" : `Apply to ${count}`}
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
