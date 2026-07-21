/** Best-effort haptics for the welcome-build game — same feature-detected, silently
 *  no-op-on-iOS pattern as lib/cart-feedback.ts's triggerCartAddedFeedback(). */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // best-effort only
    }
  }
}

export function triggerPiecePlacedFeedback() {
  vibrate(15)
}

export function triggerNudgeFeedback() {
  vibrate([10, 30, 10])
}

export function triggerWinFeedback() {
  vibrate([20, 40, 20, 40, 60])
}
