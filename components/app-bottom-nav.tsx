"use client"

import { Store, Package, Tag, Wallet, User } from "lucide-react"

export type AppTab = "shop" | "orders" | "offers" | "wallet" | "account"

const tabs: { id: AppTab; label: string; icon: typeof Store }[] = [
  { id: "shop", label: "Shop", icon: Store },
  { id: "orders", label: "Orders", icon: Package },
  { id: "offers", label: "Offers", icon: Tag },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "account", label: "Account", icon: User },
]

type AppBottomNavProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export function AppBottomNav({ activeTab, onTabChange }: AppBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-4xl items-stretch justify-around px-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`unity-tap relative flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors ${
                isActive
                  ? "text-blue-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              {isActive && (
                <span
                  className="absolute inset-x-3 top-1 h-1 rounded-full bg-blue-600/90"
                  aria-hidden
                />
              )}
              <Icon
                className={`h-6 w-6 ${isActive ? "stroke-[2.25px]" : "stroke-[1.75px]"}`}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  isActive ? "text-blue-800" : ""
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
