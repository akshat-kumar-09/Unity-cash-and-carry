"use client"

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { PIECE_COUNT, PIECE_WIDTH, DEVICE_HEIGHT, PuzzlePiece, PuzzlePieceOutline, SolvedDeviceImage } from "./device-parts"
import { triggerPiecePlacedFeedback, triggerNudgeFeedback, triggerWinFeedback } from "@/lib/welcome-build-haptics"
import { usePrefersReducedMotion } from "@/lib/reduced-motion"

type Props = {
  /** Fired once the puzzle is fully solved, after the win animation plays out. */
  onComplete: () => void
}

const SLOT_HEIGHT = 76
const SLOT_WIDTH = Math.round(SLOT_HEIGHT * (PIECE_WIDTH / DEVICE_HEIGHT))
const SCATTER_HEIGHT = 210

const NUDGE_MESSAGES = ["not quite, try another spot", "so close!", "almost there"]

type ScatterSpot = { xPct: number; yPx: number; rotate: number }

function shuffledTray(): number[] {
  const arr = Array.from({ length: PIECE_COUNT }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.every((id, i) => id === i) ? shuffledTray() : arr
}

/** Scattered, not tidy — pieces land at a random spot and a random tilt so solving takes
 *  a look, not just a grab from a neat row in order. Generated once per game (keyed off
 *  the already-shuffled tray order) so pieces don't jump around on re-render. */
function buildScatterLayout(order: number[]): Record<number, ScatterSpot> {
  const layout: Record<number, ScatterSpot> = {}
  const bucketWidth = 100 / PIECE_COUNT
  order.forEach((pieceId, i) => {
    const jitter = (Math.random() - 0.5) * (bucketWidth * 0.7)
    layout[pieceId] = {
      xPct: Math.min(82, Math.max(4, bucketWidth * i + bucketWidth / 2 + jitter - 8)),
      yPx: Math.random() * (SCATTER_HEIGHT - SLOT_HEIGHT),
      rotate: (Math.random() - 0.5) * 30,
    }
  })
  return layout
}

export function DeviceAssemblyGame({ onComplete }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [trayIds, setTrayIds] = useState<number[]>(() => shuffledTray())
  const [scatterLayout] = useState<Record<number, ScatterSpot>>(() => buildScatterLayout(trayIds))
  const [placed, setPlaced] = useState<Set<number>>(new Set())
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const [missCount, setMissCount] = useState(0)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const [bounceId, setBounceId] = useState<number | null>(null)
  const [won, setWon] = useState(false)

  const originCenterRef = useRef({ x: 0, y: 0 })
  const startPointerRef = useRef({ x: 0, y: 0 })
  const nudgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotRefs = useRef<Partial<Record<number, HTMLDivElement | null>>>({})

  // Magnetize: the drop-catch radius quietly grows after a couple of wrong tries, so
  // success gets easier without any visible counter.
  const catchPadding = missCount >= 4 ? 72 : missCount >= 2 ? 34 : 10

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: number) => {
      if (won) return
      const rect = e.currentTarget.getBoundingClientRect()
      originCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      startPointerRef.current = { x: e.clientX, y: e.clientY }
      setDraggingId(id)
      setDragDelta({ x: 0, y: 0 })
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [won]
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingId && draggingId !== 0) return
      setDragDelta({ x: e.clientX - startPointerRef.current.x, y: e.clientY - startPointerRef.current.y })
    },
    [draggingId]
  )

  const showNudge = useCallback(() => {
    const message = NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)]
    setNudgeMessage(message)
    if (nudgeTimeoutRef.current) clearTimeout(nudgeTimeoutRef.current)
    nudgeTimeoutRef.current = setTimeout(() => setNudgeMessage(null), 1800)
  }, [])

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: number) => {
      if (draggingId === null) return
      const currentCenter = {
        x: originCenterRef.current.x + dragDelta.x,
        y: originCenterRef.current.y + dragDelta.y,
      }

      let targetSlot: number | null = null
      let bestDist = Infinity
      for (let s = 0; s < PIECE_COUNT; s++) {
        if (placed.has(s)) continue
        const el = slotRefs.current[s]
        if (!el) continue
        const r = el.getBoundingClientRect()
        const withinX = currentCenter.x >= r.left - catchPadding && currentCenter.x <= r.right + catchPadding
        const withinY = currentCenter.y >= r.top - catchPadding && currentCenter.y <= r.bottom + catchPadding
        if (withinX && withinY) {
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const dist = Math.hypot(currentCenter.x - cx, currentCenter.y - cy)
          if (dist < bestDist) {
            bestDist = dist
            targetSlot = s
          }
        }
      }

      if (targetSlot !== null && targetSlot === id) {
        triggerPiecePlacedFeedback()
        setPlaced((prev) => {
          const next = new Set(prev)
          next.add(id)
          if (next.size === PIECE_COUNT) {
            setWon(true)
            triggerWinFeedback()
            setTimeout(onComplete, reducedMotion ? 400 : 900)
          }
          return next
        })
        setTrayIds((prev) => prev.filter((p) => p !== id))
      } else if (targetSlot !== null && targetSlot !== id) {
        setMissCount((m) => m + 1)
        triggerNudgeFeedback()
        showNudge()
        setBounceId(id)
        if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current)
        bounceTimeoutRef.current = setTimeout(() => setBounceId(null), 420)
      }

      setDraggingId(null)
      setDragDelta({ x: 0, y: 0 })
    },
    [draggingId, dragDelta, placed, catchPadding, onComplete, reducedMotion, showNudge]
  )

  const trayItems = useMemo(
    () =>
      trayIds.map((id) => {
        const isDragging = draggingId === id
        const isBouncing = bounceId === id
        const spot = scatterLayout[id]
        const restTransform = `rotate(${spot.rotate}deg)`
        const dragTransform = `translate3d(${dragDelta.x}px, ${dragDelta.y}px, 0) scale(1.1) rotate(0deg)`
        return (
          <div
            key={id}
            role="button"
            aria-label={`Puzzle piece ${id + 1}, drag into place`}
            onPointerDown={(e) => handlePointerDown(e, id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, id)}
            className={`absolute touch-none select-none ${isBouncing && !reducedMotion ? "welcome-build-bounce-back" : ""}`}
            style={{
              left: `${spot.xPct}%`,
              top: spot.yPx,
              width: SLOT_WIDTH,
              height: SLOT_HEIGHT,
              touchAction: "none",
              cursor: "grab",
              zIndex: isDragging ? 30 : 1,
              transform: isDragging ? dragTransform : restTransform,
              transition: isDragging ? "none" : "transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ height: SLOT_HEIGHT }}>
              <PuzzlePiece index={id} />
            </div>
          </div>
        )
      }),
    [trayIds, draggingId, dragDelta, bounceId, scatterLayout, reducedMotion, handlePointerDown, handlePointerMove, handlePointerUp]
  )

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-5 py-10 text-center">
      <div className="opacity-0 animate-scale-in [animation-fill-mode:forwards]">
        <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Assemble</h1>
        <p className="mt-2 text-sm font-semibold text-white/70">your Unity card.</p>
      </div>

      {!won && <p className="text-[13px] font-semibold text-white/60">Fill in the gap.</p>}

      {/* Track — where the picture comes together. Hidden once solved in favor of the
          clean seamless image, so the win moment reads as "done," not "still tiled." */}
      {!won && (
        <div className="flex items-center justify-center gap-1" style={{ height: SLOT_HEIGHT }}>
          {Array.from({ length: PIECE_COUNT }, (_, i) => i).map((i) => (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el
              }}
              className="relative"
              style={{ width: SLOT_WIDTH, height: SLOT_HEIGHT }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ height: SLOT_HEIGHT }}>
                {placed.has(i) ? (
                  <div className="opacity-0 animate-cart-pulse [animation-fill-mode:forwards]" style={{ height: "100%" }}>
                    <PuzzlePiece index={i} />
                  </div>
                ) : (
                  <PuzzlePieceOutline index={i} className="text-white/25" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!won && (
        <div className="h-6">
          {nudgeMessage && (
            <p className="text-xs font-bold text-cyan-200/90 opacity-0 animate-scale-in [animation-fill-mode:forwards]">
              {nudgeMessage}
            </p>
          )}
        </div>
      )}

      {won && (
        <div className="relative flex flex-col items-center">
          <div className="relative opacity-0 animate-scale-in [animation-fill-mode:forwards]" style={{ height: SLOT_HEIGHT }}>
            <SolvedDeviceImage litUp />
          </div>
          {!reducedMotion && (
            <div className="pointer-events-none relative w-full" style={{ height: 0 }}>
              <div className="welcome-build-vapor" />
            </div>
          )}
        </div>
      )}

      {!won && (
        <div className="relative w-full max-w-sm" style={{ height: SCATTER_HEIGHT }}>
          {trayItems}
        </div>
      )}
    </div>
  )
}
