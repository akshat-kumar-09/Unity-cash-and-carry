import { flushSync } from "react-dom"

/** Applies a state change that adds/removes content above `anchor` (e.g. a single-open
 *  accordion collapsing the section above the one just tapped) while keeping `anchor`
 *  exactly where it was on screen. Without this the whole list lurches up as the other
 *  section disappears, and the row you tapped can end up off the top of the screen. */
export function anchorScroll(anchor: HTMLElement | null, update: () => void) {
  if (!anchor) {
    update()
    return
  }
  const before = anchor.getBoundingClientRect().top
  flushSync(update)
  const delta = anchor.getBoundingClientRect().top - before
  if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, left: 0, behavior: "instant" as ScrollBehavior })
}
