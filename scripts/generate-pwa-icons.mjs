/**
 * Generates PWA icons from public/UNITYLOGO.jpeg — run: pnpm run pwa:icons
 */
import sharp from "sharp"
import { mkdir } from "fs/promises"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const src = join(root, "public/UNITYLOGO.jpeg")
const outDir = join(root, "public/icons")

const bg = { r: 248, g: 250, b: 252, alpha: 1 }

await mkdir(outDir, { recursive: true })

async function squareIcon(size) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(join(outDir, `icon-${size}.png`))
}

async function appleTouch() {
  await sharp(src)
    .resize(180, 180, { fit: "contain", background: bg })
    .png()
    .toFile(join(outDir, "apple-touch-icon.png"))
}

/** Maskable: logo in ~72% safe zone for Android adaptive icons */
async function maskable512() {
  const s = 512
  const inner = Math.round(s * 0.72)
  const buf = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: bg })
    .png()
    .toBuffer()
  const pad = Math.floor((s - inner) / 2)
  await sharp({
    create: {
      width: s,
      height: s,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: buf, left: pad, top: pad }])
    .png()
    .toFile(join(outDir, "maskable-512.png"))
}

await squareIcon(192)
await squareIcon(512)
await appleTouch()
await maskable512()

console.log("PWA icons written to public/icons/")
