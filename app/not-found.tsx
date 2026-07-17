import Link from "next/link"
import { PackageSearch } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-slate-100 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
        <PackageSearch className="h-8 w-8 text-slate-500" />
      </div>
      <div>
        <h1 className="text-lg font-bold uppercase tracking-wider text-slate-800">
          Page not found
        </h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-700"
      >
        Go to shop
      </Link>
    </div>
  )
}
