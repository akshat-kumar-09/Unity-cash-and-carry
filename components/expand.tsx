"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePrefersReducedMotion } from "@/lib/reduced-motion"

/** Grows its content open from zero height when it mounts — a smooth reveal for
 *  accordion bodies instead of content popping in. Height animates via grid rows
 *  (0fr → 1fr), so it follows the content's real height, including content that arrives
 *  after a fetch. Clipping is lifted once open so nothing inside gets cut off.
 *  `appear={false}` renders already open — for sections open by default on page load,
 *  which shouldn't paint empty and then grow. */
export function Expand({
  children,
  className = "",
  appear = true,
}: {
  children: ReactNode
  className?: string
  appear?: boolean
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [open, setOpen] = useState(!appear)
  const [settled, setSettled] = useState(!appear)

  useEffect(() => {
    if (!appear) return
    if (reducedMotion) {
      setOpen(true)
      setSettled(true)
      return
    }
    // Two frames: the closed (0fr) state must be painted once before switching to 1fr,
    // or the browser skips straight to the end and nothing animates.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOpen(true))
    })
    const done = setTimeout(() => setSettled(true), 320)
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
      clearTimeout(done)
    }
  }, [reducedMotion, appear])

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className={settled ? "min-h-0" : "min-h-0 overflow-hidden"}>{children}</div>
    </div>
  )
}
