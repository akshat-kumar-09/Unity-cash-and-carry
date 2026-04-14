"use client"

import { useEffect } from "react"

/** Registers the service worker in production so the app is installable as a PWA. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal */
    })
  }, [])
  return null
}
