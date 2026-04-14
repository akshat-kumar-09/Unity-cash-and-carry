"use client"

type AppScreenHeaderProps = {
  title: string
  subtitle?: string
}

/** Shared sticky header for Orders, Offers, Wallet, Account — bright retail Unity shell */
export function AppScreenHeader({ title, subtitle }: AppScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 unity-surface-elevated border-b border-slate-200/90 px-4 py-3.5 shadow-sm">
      <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">
          {subtitle}
        </p>
      )}
    </header>
  )
}
