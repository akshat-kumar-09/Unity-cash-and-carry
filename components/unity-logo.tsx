"use client"

type UnityLogoProps = {
  className?: string
  size?: number
}

/** Unity logo for landing and shop header.
 * Uses the provided UNITYLOGO.jpeg from /public by default.
 * Replace that file if the artwork is updated.
 */
const LOGO_SRC = "/UNITYLOGO.jpeg"

export function UnityLogo({ className = "", size = 32 }: UnityLogoProps) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Unity Cash & Carry"
    >
      <img
        src={LOGO_SRC}
        alt="Unity Cash & Carry"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  )
}
