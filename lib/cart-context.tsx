"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { getEffectiveMaxQtyPerOrder, type Product } from "./products"

export type CartItem = {
  product: Product
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (product: Product) => void
  addItems: (itemsToAdd: { product: Product; quantity: number }[]) => void
  removeItem: (productId: string) => void
  getQuantity: (productId: string) => number
  totalItems: number
  subtotal: number
  vat: number
  total: number
  clearCart: () => void
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

const CART_STORAGE_KEY = "unity-cart"

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Validate structure
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item.product &&
          item.product.id &&
          typeof item.quantity === "number" &&
          item.quantity > 0
      )
    }
    return []
  } catch {
    return []
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error("Failed to save cart to localStorage:", error)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const hasFetchedRef = useRef(false)
  const [serverCartLoaded, setServerCartLoaded] = useState(false)

  // Load cart from localStorage on mount — instant for guests, and a fallback until
  // the server cart (if any) loads for a logged-in user just below.
  useEffect(() => {
    const savedItems = loadCartFromStorage()
    setItems(savedItems)
    setIsHydrated(true)
  }, [])

  // Once logged in, the server's saved cart is authoritative — this is what survives
  // logout/login and device changes, unlike localStorage which is per-browser only.
  // serverCartLoaded only flips true once the response actually arrives — the PUT-sync
  // effect below is gated on it, so it can't fire with stale local data and clobber the
  // server's real cart before this load has had a chance to apply it.
  useEffect(() => {
    if (status !== "authenticated" || hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetch("/api/cart")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) setItems(data.items)
      })
      .catch(() => {})
      .finally(() => setServerCartLoaded(true))
  }, [status])

  // Reset on logout so a different account logging in on the same browser re-fetches
  // its own cart instead of reusing (or overwriting) the previous user's.
  useEffect(() => {
    if (status === "unauthenticated") {
      hasFetchedRef.current = false
      setServerCartLoaded(false)
    }
  }, [status])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isHydrated) {
      saveCartToStorage(items)
    }
  }, [items, isHydrated])

  // Also persist to the DB for logged-in users so it survives logout/login.
  useEffect(() => {
    if (!isHydrated || status !== "authenticated" || !serverCartLoaded) return
    fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).catch(() => {})
  }, [items, isHydrated, status, serverCartLoaded])

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const maxQ = getEffectiveMaxQtyPerOrder(product)
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing && existing.quantity >= maxQ) return prev
      const updated = existing
        ? prev.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: Math.min(i.quantity + 1, maxQ) }
              : i
          )
        : [...prev, { product, quantity: 1 }]
      return updated
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === productId)
      if (!existing) return prev
      if (existing.quantity === 1) {
        return prev.filter((i) => i.product.id !== productId)
      }
      return prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
    })
  }, [])

  const getQuantity = useCallback(
    (productId: string) => {
      return items.find((i) => i.product.id === productId)?.quantity ?? 0
    },
    [items]
  )

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce(
    (sum, i) => sum + i.product.casePrice * i.quantity,
    0
  )
  const vat = subtotal * 0.2
  const total = subtotal + vat

  const addItems = useCallback((itemsToAdd: { product: Product; quantity: number }[]) => {
    setItems((prev) => {
      const updated = [...prev]
      for (const item of itemsToAdd) {
        const maxQ = getEffectiveMaxQtyPerOrder(item.product)
        const idx = updated.findIndex((i) => i.product.id === item.product.id)
        if (idx > -1) {
          updated[idx] = {
            ...updated[idx],
            quantity: Math.min(updated[idx].quantity + item.quantity, maxQ)
          }
        } else {
          updated.push({
            product: item.product,
            quantity: Math.min(item.quantity, maxQ)
          })
        }
      }
      return updated
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addItems,
        removeItem,
        getQuantity,
        totalItems,
        subtotal,
        vat,
        total,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
