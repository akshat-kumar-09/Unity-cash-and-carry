import { useEffect, useState } from "react"

/** Fires after a cart mutation the user should feel, not just see: batch quick-add,
 *  etc. Vibrates where supported (most Android browsers; iOS Safari has no Vibration
 *  API and silently no-ops) and always dispatches a DOM event so any visible cart
 *  affordance (header icon, sticky footer bar) can play a pulse animation regardless
 *  of haptic support. */
export function triggerCartAddedFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(15)
    } catch {
      // best-effort only
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("unity:cart-added"))
  }
}

/** Event name for the pulse above — kept as a constant so listeners can't typo it. */
export const CART_ADDED_EVENT = "unity:cart-added"

/** True for a brief window after any triggerCartAddedFeedback() call — drive a
 *  `animate-cart-pulse` class off it on every cart affordance that should bump. */
export function usePulseOnCartAdded(durationMs = 650): boolean {
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const onAdded = () => {
      setPulsing(true)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setPulsing(false), durationMs)
    }
    window.addEventListener(CART_ADDED_EVENT, onAdded)
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, onAdded)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [durationMs])

  return pulsing
}
