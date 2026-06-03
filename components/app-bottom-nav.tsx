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
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
      role="navigation"
      aria-label="Main"
    >
      {/* Max width container for button alignment */}
      <div className="relative mx-auto max-w-4xl px-1">
        {/* Sliding Laser Indicator Line at the Top of the Bar */}
        <div
          className="absolute top-[-4px] h-[3px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            width: "20%",
            left: 0,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          {/* Core high-intensity light bar */}
          <div className="mx-3 h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.8),0_0_4px_rgba(6,182,212,0.6)]" />
          {/* Flared glow overlay */}
          <div className="absolute inset-0 mx-2 bg-cyan-400 blur-[3px] opacity-40" />
        </div>

        <div className="flex items-stretch justify-around">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`unity-tap relative flex min-h-[58px] min-w-[58px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-all duration-300 ${
                  isActive
                    ? "text-blue-600 scale-[1.03]"
                    : "text-slate-400 hover:text-slate-600 active:scale-95"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                {/* Shiny radial light bloom behind active icon */}
                {isActive && (
                  <div className="absolute w-10 h-10 rounded-full bg-blue-500/10 blur-[8px] scale-125 pointer-events-none transition-all duration-500 animate-pulse" />
                )}

                <Icon
                  className={`h-[22px] w-[22px] transition-all duration-300 ${
                    isActive
                      ? "stroke-[2.25px] scale-110 drop-shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                      : "stroke-[1.75px]"
                  }`}
                />
                <span
                  className={`text-[9.5px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive ? "text-blue-700 opacity-100" : "opacity-85"
                  }`}
                >
                  {label}
                </span>

                {/* Sub-dot active indicator */}
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-600 transition-all duration-300 ${
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
