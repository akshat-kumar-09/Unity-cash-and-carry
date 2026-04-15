"use client"

import { useState, useEffect } from "react"
import { X, Pencil } from "lucide-react"
import type { Product } from "@/lib/products"

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
  const [imageUrl, setImageUrl] = useState("")
  const [casePriceStr, setCasePriceStr] = useState("")
  const [unitPriceStr, setUnitPriceStr] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (product) {
      setName(product.name)
      setImageUrl(product.imageUrl ?? "")
      setCasePriceStr(String(roundMoney(product.casePrice)))
      setUnitPriceStr(String(roundMoney(product.unitPrice)))
      setError("")
    }
  }, [product])

  if (!isOpen || !product) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const body: {
        name?: string
        imageUrl?: string | null
        casePrice?: number
        unitPrice?: number
      } = {}
      if (name.trim() !== product.name) body.name = name.trim()

      const trimmed = imageUrl.trim()
      const prev = product.imageUrl ?? ""
      if (trimmed !== prev) {
        body.imageUrl = trimmed === "" ? null : trimmed
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

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            Edit product
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
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
            Cart totals use case price + VAT. Prices are stored ex. VAT.
          </p>
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
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
