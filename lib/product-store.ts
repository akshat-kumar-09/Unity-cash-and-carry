"use client"

import { useEffect, useReducer, useState } from "react"
import type { Product } from "@/lib/products"

/** One slice of the catalogue the shop browses by: a category, optionally one brand. */
export type ProductQuery = { category: string; brand?: string }

type Entry = { query: ProductQuery; products: Product[]; fetchedAt: number }

/** Shared in-memory catalogue cache. Every accordion level reads from here, so opening a
 *  line, closing it and opening it again never re-downloads or flashes a spinner, and a
 *  brand's lines and its flavour lists come from the same single request. */
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<Product[]>>()
const listeners = new Set<() => void>()

/** After this, cached data is still shown instantly but refreshed in the background. */
const FRESH_MS = 2 * 60_000
const PAGE_SIZE = 100

const keyOf = (q: ProductQuery) => `${q.category}|${q.brand ?? ""}`

function notify() {
  listeners.forEach((listener) => listener())
}

/** Fetches every page — the API caps a page at 100, and a big brand can have more SKUs
 *  than that in one category. */
async function fetchAll(q: ProductQuery): Promise<Product[]> {
  const all: Product[] = []
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ category: q.category, limit: String(PAGE_SIZE), page: String(page) })
    if (q.brand) params.set("brand", q.brand)
    const res = await fetch(`/api/products?${params.toString()}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(data?.products)) throw new Error("Failed to load products")
    all.push(...data.products)
    if (page >= (data.totalPages ?? 1)) return all
  }
}

export function loadProducts(q: ProductQuery, { force = false } = {}): Promise<Product[]> {
  const key = keyOf(q)
  const hit = cache.get(key)
  if (hit && !force && Date.now() - hit.fetchedAt < FRESH_MS) return Promise.resolve(hit.products)
  const pending = inflight.get(key)
  if (pending) return pending
  const request = fetchAll(q)
    .then((products) => {
      cache.set(key, { query: q, products, fetchedAt: Date.now() })
      notify()
      return products
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, request)
  return request
}

/** Warm the cache ahead of a tap. Failures are ignored — the real load retries. */
export function prefetchProducts(q: ProductQuery) {
  void loadProducts(q).catch(() => {})
}

/** After an admin edit/delete: refresh everything already cached, in the background,
 *  while the current data stays on screen. */
export function invalidateProducts() {
  for (const entry of cache.values()) {
    void loadProducts(entry.query, { force: true }).catch(() => {})
  }
}

/** Products for a query: cached data immediately when there is any (no spinner), kept
 *  in sync as the cache refreshes. `products` is null only on the very first load. */
export function useProducts(q: ProductQuery | null) {
  const key = q ? keyOf(q) : null
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [])

  useEffect(() => {
    if (!q) return
    setFailed(false)
    loadProducts(q).catch(() => setFailed(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures the query
  }, [key])

  const entry = key ? cache.get(key) : undefined
  return {
    products: entry?.products ?? null,
    failed: failed && !entry,
    retry: () => {
      if (!q) return
      setFailed(false)
      loadProducts(q, { force: true }).catch(() => setFailed(true))
    },
  }
}
