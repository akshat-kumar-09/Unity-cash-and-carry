"use client"

import { useState } from "react"
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  Star,
  UserPlus,
  Check,
  AlertCircle,
  Route,
  Store,
  Phone,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type ShopResult = {
  id: string
  name: string
  address: string
  rating: number
  totalRatings: number
  phone?: string
  openNow?: boolean
  placeUrl?: string
  distance?: string
}

export function AdminRoutePlannerView() {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [shops, setShops] = useState<ShopResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [addingLeadId, setAddingLeadId] = useState<string | null>(null)
  const [addedLeadIds, setAddedLeadIds] = useState<Set<string>>(new Set())
  const [noApiKey, setNoApiKey] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!origin.trim() || !destination.trim()) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await fetch("/api/admin/route-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes("GOOGLE_MAPS_KEY") || data.error?.includes("API key")) {
          setNoApiKey(true)
          setShops([])
          return
        }
        throw new Error(data.error || "Failed to find shops")
      }

      setShops(Array.isArray(data.shops) ? data.shops : Array.isArray(data) ? data : [])
      setNoApiKey(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleAddAsLead = async (shop: ShopResult) => {
    setAddingLeadId(shop.id)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: shop.name,
          contactName: "",
          phone: shop.phone || "",
          email: "",
          address: shop.address,
          postcode: "",
          city: "",
          notes: `Discovered via Route Planner. Rating: ${shop.rating}/5 (${shop.totalRatings} reviews)`,
          status: "prospect",
        }),
      })

      if (!res.ok) throw new Error("Failed to add lead")

      setAddedLeadIds((prev) => new Set(prev).add(shop.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add as lead")
    } finally {
      setAddingLeadId(null)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-200"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader
        title="Route Planner"
        subtitle="Discover vape shops along your route"
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Route Info Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Route className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">
                Route Discovery Tool
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Find potential retail partners along your delivery route
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Origin
              </label>
              <div className="relative">
                <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="text"
                  placeholder="e.g. Glasgow, G41 1LU"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Destination
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                <input
                  type="text"
                  placeholder="e.g. Edinburgh, EH1 1YZ"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !origin.trim() || !destination.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Search className="h-4.5 w-4.5" />
              )}
              {loading ? "Searching…" : "Find Vape Shops"}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* No API Key Warning */}
        {noApiKey && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <h3 className="text-[15px] font-bold text-amber-900">
              Google Maps API Key Required
            </h3>
            <p className="text-[12px] text-amber-700 leading-relaxed max-w-sm mx-auto">
              The route planner requires a Google Maps API key to discover shops
              along your route. Please add{" "}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                GOOGLE_MAPS_KEY
              </code>{" "}
              to your environment variables.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-[12px] text-slate-500 font-semibold">
              Scanning route for vape retailers…
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && shops.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />
                {shops.length} Shops Found Along Route
              </h3>
            </div>

            <div className="space-y-2.5">
              {shops.map((shop) => {
                const isAdded = addedLeadIds.has(shop.id)
                const isAdding = addingLeadId === shop.id

                return (
                  <div
                    key={shop.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-4 transition-all hover:shadow-md hover:border-slate-300/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-600 shrink-0" />
                          <h4 className="text-[14px] font-bold text-slate-900 truncate">
                            {shop.name}
                          </h4>
                        </div>
                        <p className="text-[12px] text-slate-500 mt-1 ml-6 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          {shop.address}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 ml-6 flex-wrap">
                      {/* Rating */}
                      <div className="flex items-center gap-1.5">
                        {renderStars(shop.rating)}
                        <span className="text-[11px] font-bold text-slate-700">
                          {shop.rating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({shop.totalRatings})
                        </span>
                      </div>

                      {shop.phone && (
                        <a
                          href={`tel:${shop.phone}`}
                          className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {shop.phone}
                        </a>
                      )}

                      {shop.openNow !== undefined && (
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                            shop.openNow
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {shop.openNow ? "Open Now" : "Closed"}
                        </span>
                      )}

                      {shop.distance && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {shop.distance}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3.5 flex gap-2 ml-6">
                      <button
                        onClick={() => handleAddAsLead(shop)}
                        disabled={isAdded || isAdding}
                        className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-lg transition-all active:scale-[0.97] ${
                          isAdded
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/15 disabled:opacity-50"
                        }`}
                      >
                        {isAdding ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isAdded ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <UserPlus className="h-3 w-3" />
                        )}
                        {isAdded ? "Added to CRM" : "Add as Lead"}
                      </button>

                      {shop.placeUrl && (
                        <a
                          href={shop.placeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-lg transition-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Maps
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty Results */}
        {!loading && searched && shops.length === 0 && !noApiKey && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Store className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800">
              No vape shops found
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] leading-snug">
              Try adjusting your route or expanding the search radius.
            </p>
          </div>
        )}

        {/* Pre-search state */}
        {!searched && !loading && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[13px] leading-relaxed text-slate-600 text-left">
                <p className="font-semibold text-slate-800">
                  How it works
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-slate-500">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                      1
                    </span>
                    Enter your starting point and destination
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                      2
                    </span>
                    We scan for vape shops along your route
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                      3
                    </span>
                    Add promising shops directly to your sales pipeline
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
