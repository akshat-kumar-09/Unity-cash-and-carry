"use client"

import { useId } from "react"

/** A real jigsaw puzzle of one broad, plain horizontal vape body — not a set of
 *  mismatched mechanical parts. One shared silhouette (rounded body + a dark cap zone at
 *  the right end) is cut into PIECE_COUNT interlocking pieces with genuine curved
 *  tab/blank edges (the same boundary curve is shared verbatim by both neighboring
 *  pieces, so they interlock with zero gap by construction — see piecePathD). Each piece
 *  is a literal windowed crop of the one silhouette, so pieces are always visually
 *  coherent with each other regardless of shuffle order — solving the "looks
 *  artificial/mismatched" problem outright, since there's only ever one picture. The
 *  solved picture (SolvedDeviceImage) is reused verbatim on the permanent Trade ID card. */

export const PIECE_COUNT = 5
export const DEVICE_WIDTH = 300
export const DEVICE_HEIGHT = 72
export const PIECE_WIDTH = DEVICE_WIDTH / PIECE_COUNT

const CORNER_RADIUS = 14
const TAB_BULGE = 13
/** Symmetric render padding on every piece so a tab bulging either direction never
 *  clips, regardless of which neighbor "owns" the protrusion at that boundary. */
const PAD = TAB_BULGE + 3

/** Alternating tab direction per internal boundary (length PIECE_COUNT - 1) — purely
 *  for visual variety, either polarity interlocks correctly. */
const BOUNDARY_DIR = [1, -1, 1, -1]

/** Mouthpiece taper — shared by BOTH the last puzzle piece and the solved-image outline
 *  (see piecePathD's isLast branch and deviceOutlinePath below), so what gets assembled
 *  is pixel-identical to the finished picture, not a plain flush rectangle that only
 *  narrows after the puzzle is solved. Kept clear of the piece 3/4 tab-bump zone (see
 *  MOUTH_TAB_CLEARANCE) so the taper curve never fights the interlocking curve. */
const CAP_ZONE_START = (PIECE_COUNT - 1) * PIECE_WIDTH
const MOUTH_TAB_CLEARANCE = TAB_BULGE + 4
const MOUTH_NECK_WIDTH = 14
const MOUTH_RADIUS = 7
const MOUTH_NECK_START_X = CAP_ZONE_START + MOUTH_TAB_CLEARANCE
const MOUTH_START_X = MOUTH_NECK_START_X + MOUTH_NECK_WIDTH
const MOUTH_HEIGHT = 34
const MOUTH_TOP = (DEVICE_HEIGHT - MOUTH_HEIGHT) / 2
const MOUTH_BOTTOM = DEVICE_HEIGHT - MOUTH_TOP

/** The finished device's outline, tapering into a narrower rounded mouthpiece at the
 *  right end instead of staying a uniform-height capsule the whole way. */
function deviceOutlinePath(): string {
  const w = DEVICE_WIDTH
  const h = DEVICE_HEIGHT
  const r = CORNER_RADIUS
  const mr = MOUTH_RADIUS

  return [
    `M ${r} 0`,
    `L ${MOUTH_NECK_START_X} 0`,
    `C ${MOUTH_NECK_START_X + MOUTH_NECK_WIDTH * 0.6} 0 ${MOUTH_START_X - MOUTH_NECK_WIDTH * 0.15} ${MOUTH_TOP} ${MOUTH_START_X} ${MOUTH_TOP}`,
    `L ${w - mr} ${MOUTH_TOP}`,
    `A ${mr} ${mr} 0 0 1 ${w} ${MOUTH_TOP + mr}`,
    `L ${w} ${MOUTH_BOTTOM - mr}`,
    `A ${mr} ${mr} 0 0 1 ${w - mr} ${MOUTH_BOTTOM}`,
    `L ${MOUTH_START_X} ${MOUTH_BOTTOM}`,
    `C ${MOUTH_START_X - MOUTH_NECK_WIDTH * 0.15} ${MOUTH_BOTTOM} ${MOUTH_NECK_START_X + MOUTH_NECK_WIDTH * 0.6} ${h} ${MOUTH_NECK_START_X} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ")
}

/* Brushed-metal shading: asymmetric (light from upper-left, like a real photographed
 * product) rather than a smooth symmetric blend — a sharp, narrow highlight band reads
 * as polished metal; a soft wide one reads as flat plastic. A dimmer secondary highlight
 * near the bottom mimics ambient bounce light off a surface below the device. */
const BODY_STOPS = [
  { offset: "0%", color: "#1e3a8a" },
  { offset: "7%", color: "#3b82f6" },
  { offset: "20%", color: "#dbeafe" },
  { offset: "30%", color: "#3b82f6" },
  { offset: "52%", color: "#1d4ed8" },
  { offset: "72%", color: "#1e3a8a" },
  { offset: "88%", color: "#60a5fa" },
  { offset: "100%", color: "#1e3a8a" },
]

const CAP_STOPS = [
  { offset: "0%", color: "#020617" },
  { offset: "7%", color: "#334155" },
  { offset: "20%", color: "#cbd5e1" },
  { offset: "30%", color: "#334155" },
  { offset: "52%", color: "#0f172a" },
  { offset: "72%", color: "#020617" },
  { offset: "88%", color: "#475569" },
  { offset: "100%", color: "#020617" },
]

function bumpDown(x: number, cx: number, h: number) {
  return `C ${x} ${h * 0.25} ${cx} ${h * 0.25} ${cx} ${h * 0.5} C ${cx} ${h * 0.75} ${x} ${h * 0.75} ${x} ${h}`
}
function bumpUp(x: number, cx: number, h: number) {
  return `C ${x} ${h * 0.75} ${cx} ${h * 0.75} ${cx} ${h * 0.5} C ${cx} ${h * 0.25} ${x} ${h * 0.25} ${x} 0`
}

/** The path for piece `i`, in the one shared 0..DEVICE_WIDTH / 0..DEVICE_HEIGHT
 *  coordinate space — every piece's SVG just windows into this same space via its own
 *  viewBox, so no per-piece coordinate translation is needed. */
export function piecePathD(i: number): string {
  const xL = i * PIECE_WIDTH
  const xR = (i + 1) * PIECE_WIDTH
  const h = DEVICE_HEIGHT
  const r = CORNER_RADIUS
  const isFirst = i === 0
  const isLast = i === PIECE_COUNT - 1

  let d = isFirst ? `M ${r} 0 ` : `M ${xL} 0 `

  if (isLast) {
    // Same taper as deviceOutlinePath, so the puzzle piece already looks like the
    // finished mouthpiece — not a flush rectangle that only narrows once solved.
    const mr = MOUTH_RADIUS
    d += `L ${MOUTH_NECK_START_X} 0 `
    d += `C ${MOUTH_NECK_START_X + MOUTH_NECK_WIDTH * 0.6} 0 ${MOUTH_START_X - MOUTH_NECK_WIDTH * 0.15} ${MOUTH_TOP} ${MOUTH_START_X} ${MOUTH_TOP} `
    d += `L ${xR - mr} ${MOUTH_TOP} `
    d += `A ${mr} ${mr} 0 0 1 ${xR} ${MOUTH_TOP + mr} `
  } else {
    d += `L ${xR} 0 `
  }

  if (isLast) {
    const mr = MOUTH_RADIUS
    d += `L ${xR} ${MOUTH_BOTTOM - mr} `
    d += `A ${mr} ${mr} 0 0 1 ${xR - mr} ${MOUTH_BOTTOM} `
    d += `L ${MOUTH_START_X} ${MOUTH_BOTTOM} `
    d += `C ${MOUTH_START_X - MOUTH_NECK_WIDTH * 0.15} ${MOUTH_BOTTOM} ${MOUTH_NECK_START_X + MOUTH_NECK_WIDTH * 0.6} ${h} ${MOUTH_NECK_START_X} ${h} `
  } else {
    const cx = xR + BOUNDARY_DIR[i] * TAB_BULGE
    d += bumpDown(xR, cx, h) + " "
  }

  d += isFirst ? `L ${r} ${h} ` : `L ${xL} ${h} `

  if (isFirst) {
    d += `A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 `
  } else {
    const cx = xL + BOUNDARY_DIR[i - 1] * TAB_BULGE
    d += bumpUp(xL, cx, h) + " "
  }

  return d + "Z"
}

function pieceViewBox(i: number) {
  const x = i * PIECE_WIDTH - PAD
  const y = -PAD
  const w = PIECE_WIDTH + PAD * 2
  const h = DEVICE_HEIGHT + PAD * 2
  return `${x} ${y} ${w} ${h}`
}

type PieceProps = {
  index: number
  litUp?: boolean
  className?: string
}

function useGradientDefs(uid: string) {
  const bodyId = `${uid}-body`
  const capId = `${uid}-cap`
  const ledId = `${uid}-led`
  const liftId = `${uid}-lift`
  const grainId = `${uid}-grain`
  const defs = (
    <defs>
      <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
        {BODY_STOPS.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
      <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
        {CAP_STOPS.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
      <radialGradient id={ledId}>
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="60%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </radialGradient>
      <filter id={liftId} x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#000000" floodOpacity="0.4" />
      </filter>
      {/* Fine brushed-metal grain — hairline stripes along the body, low-opacity so it
          reads as surface texture rather than pattern. */}
      <pattern id={grainId} width="2.2" height="2.2" patternUnits="userSpaceOnUse">
        <line x1="0" y1="1.1" x2="2.2" y2="1.1" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.55" />
      </pattern>
    </defs>
  )
  return { bodyId, capId, ledId, liftId, grainId, defs }
}

/** One draggable jigsaw piece — a literal windowed crop of the shared device silhouette. */
export function PuzzlePiece({ index, litUp, className }: PieceProps) {
  const uid = useId()
  const { bodyId, capId, ledId, liftId, grainId, defs } = useGradientDefs(uid)
  const isCapZone = index === PIECE_COUNT - 1
  const path = piecePathD(index)

  return (
    <svg viewBox={pieceViewBox(index)} className={className} style={{ height: "100%", width: "auto", overflow: "visible" }} fill="none">
      {defs}
      <path d={path} fill={`url(#${isCapZone ? capId : bodyId})`} filter={`url(#${liftId})`} stroke="#0f172a" strokeOpacity="0.35" strokeWidth="1" />
      <path d={path} fill={`url(#${grainId})`} fillOpacity="0.12" />
      {index === 0 && (
        <circle
          cx="16"
          cy={DEVICE_HEIGHT / 2}
          r="4"
          fill={litUp ? `url(#${ledId})` : "#1e3a8a"}
          style={litUp ? { filter: "drop-shadow(0 0 5px #22d3ee)" } : undefined}
        />
      )}
    </svg>
  )
}

/** The same piece silhouette, unfilled — used as the empty slot's dashed placeholder. */
export function PuzzlePieceOutline({ index, className }: { index: number; className?: string }) {
  return (
    <svg viewBox={pieceViewBox(index)} className={className} style={{ height: "100%", width: "auto", overflow: "visible" }} fill="none">
      <path d={piecePathD(index)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  )
}

/** The finished, seamless picture — no piece joins visible. Reused verbatim for the
 *  reveal beat and the permanent Trade ID card. */
export function SolvedDeviceImage({ litUp, className }: { litUp?: boolean; className?: string }) {
  const uid = useId()
  const { bodyId, capId, ledId, liftId, grainId, defs } = useGradientDefs(uid)
  const clipId = `${uid}-clip`
  const outline = deviceOutlinePath()
  const colorSplitX = CAP_ZONE_START

  return (
    <svg viewBox={`0 0 ${DEVICE_WIDTH} ${DEVICE_HEIGHT}`} className={className} style={{ height: "100%", width: "auto" }} fill="none">
      <defs>
        {defs}
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} filter={`url(#${liftId})`}>
        <rect x="0" y="0" width={colorSplitX} height={DEVICE_HEIGHT} fill={`url(#${bodyId})`} />
        <rect x={colorSplitX} y="0" width={DEVICE_WIDTH - colorSplitX} height={DEVICE_HEIGHT} fill={`url(#${capId})`} />
        <rect x="0" y="0" width={DEVICE_WIDTH} height={DEVICE_HEIGHT} fill={`url(#${grainId})`} fillOpacity="0.12" />
      </g>
      <path d={outline} fill="none" stroke="#0f172a" strokeOpacity="0.3" strokeWidth="1" />
      <circle
        cx="16"
        cy={DEVICE_HEIGHT / 2}
        r="4"
        fill={litUp ? `url(#${ledId})` : "#1e3a8a"}
        style={litUp ? { filter: "drop-shadow(0 0 5px #22d3ee)" } : undefined}
      />
    </svg>
  )
}
