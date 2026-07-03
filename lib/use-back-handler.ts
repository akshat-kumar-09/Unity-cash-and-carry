"use client"

import { useEffect, useRef } from "react"

/**
 * Makes the phone/browser back button step back out of an open modal, sheet, or
 * drill-down level instead of leaving the app entirely. Push a history entry while
 * `active` is true; on back (popstate), call `onBack`. If the caller closes the
 * thing itself (X button, backdrop click, in-app back link) while our entry is
 * still current, we pop it ourselves so a later real back-press isn't wasted on a
 * stale entry.
 */
export function useBackHandler(active: boolean, onBack: () => void) {
  const pushedRef = useRef(false)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (active && !pushedRef.current) {
      window.history.pushState({ backHandler: true }, "")
      pushedRef.current = true
    } else if (!active && pushedRef.current) {
      pushedRef.current = false
      window.history.back()
    }
  }, [active])

  useEffect(() => {
    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false
        onBackRef.current()
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])
}
