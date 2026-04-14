"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { categories } from "@/lib/products"

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
    brand: "",
    category: "vapes",
    sku: "",
    packLabel: "",
    unitsPerPack: 10,
    unitPrice: 0,
    casePrice: 0,
    badge: "",
    imageUrl: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "unitsPerPack" || name === "unitPrice" || name === "casePrice") {
      const num = parseFloat(value) || 0
      setForm((p) => ({ ...p, [name]: num }))
    } else {
      setForm((p) => ({ ...p, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const payload = {
        ...form,
        badge: form.badge.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add product")
      setForm({ name: "", brand: "", category: "vapes", sku: "", packLabel: "", unitsPerPack: 10, unitPrice: 0, casePrice: 0, badge: "", imageUrl: "" })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Add Product</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. 600 Blue Razz" />
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
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Units</label>
              <input name="unitsPerPack" type="number" min={1} value={form.unitsPerPack || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-200 rounded text-sm" />
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
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Image URL (optional)</label>
            <input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-mono text-[13px]" placeholder="https://… or /brands/elf-bar.png" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Badge (optional)</label>
            <input name="badge" value={form.badge} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="e.g. Popular, New" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              {loading ? "Adding…" : "Add Product"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
