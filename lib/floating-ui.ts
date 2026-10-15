"use client"

import { useEffect, useState } from "react"

/** A bottom bar (View Order / Add N items) tells the page it's showing, so the floating
 *  Assist button can sit above it instead of on top of it. */
export function useFloatingBarPresence(visible: boolean) {
  useEffect(() => {
    if (!visible) return
    const root = document.documentElement
    root.dataset.floatingBar = String(Number(root.dataset.floatingBar ?? "0") + 1)
    return () => {
      const next = Number(root.dataset.floatingBar ?? "1") - 1
      if (next <= 0) delete root.dataset.floatingBar
      else root.dataset.floatingBar = String(next)
    }
  }, [visible])
}

/** True while the page is being scrolled down — floating buttons step aside so they don't
 *  sit over what you're reading, and come back as soon as you stop or scroll up. */
export function useHideWhileScrollingDown(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY + 6) setHidden(true)
      else if (y < lastY - 6) setHidden(false)
      lastY = y
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setHidden(false), 700)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      clearTimeout(idleTimer)
    }
  }, [])

  return hidden
}
