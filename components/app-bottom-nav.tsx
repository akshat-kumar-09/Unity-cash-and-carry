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
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)

  return (
    <nav
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.75rem)] max-w-[480px] rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur-xl"
      role="navigation"
      aria-label="Main"
    >
      <div className="relative flex items-center justify-between">
        {/* Animated Sliding Background Indicator */}
        <div
          className="absolute bottom-0 top-0 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] -z-10 shadow-[0_4px_16px_rgba(37,99,235,0.45)]"
          style={{
            width: "20%",
            left: 0,
            transform: `translateX(${activeIndex * 100}%) scale(0.92, 0.9)`,
          }}
        />

        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`unity-tap relative flex h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-300 ${
                isActive
                  ? "text-white scale-105"
                  : "text-slate-400 hover:text-slate-200 active:scale-95"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <Icon
                className={`h-5 w-5 transition-all duration-300 ${
                  isActive 
                    ? "stroke-[2.25px] scale-110 drop-shadow-[0_2px_6px_rgba(255,255,255,0.25)]" 
                    : "stroke-[1.75px]"
                }`}
              />
              <span
                className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                  isActive ? "text-white opacity-100" : "opacity-80"
                }`}
              >
                {label}
              </span>
              
              {/* Discrete indicator dot below label */}
              <span 
                className={`absolute bottom-1 h-1 w-1 rounded-full bg-white transition-all duration-300 ${
                  isActive ? "scale-100 opacity-80" : "scale-0 opacity-0"
                }`}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
