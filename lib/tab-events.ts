"use client"

import { useEffect, useRef } from "react"
import type { AppTab } from "@/components/app-bottom-nav"

const TAB_SHOWN_EVENT = "unity:tab-shown"

/** Fired by the app shell whenever a tab comes back into view. Tabs stay mounted between
 *  visits (so they keep their place), and use this to refresh quietly in the background. */
export function announceTabShown(tab: AppTab) {
  window.dispatchEvent(new CustomEvent<AppTab>(TAB_SHOWN_EVENT, { detail: tab }))
}

/** Runs `onShown` each time `tab` is switched back to (not on first mount). */
export function useOnTabShown(tab: AppTab, onShown: () => void) {
  const callback = useRef(onShown)
  callback.current = onShown

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<AppTab>).detail === tab) callback.current()
    }
    window.addEventListener(TAB_SHOWN_EVENT, handler)
    return () => window.removeEventListener(TAB_SHOWN_EVENT, handler)
  }, [tab])
}
