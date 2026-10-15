"use client"

import { Store, Package, Tag, User, Shield, HeartHandshake } from "lucide-react"

export type AppTab = "shop" | "orders" | "offers" | "assist" | "account" | "admin"

const traderTabs: { id: AppTab; label: string; icon: typeof Store }[] = [
  { id: "shop", label: "Shop", icon: Store },
  { id: "orders", label: "Orders", icon: Package },
  { id: "offers", label: "Rewards", icon: Tag },
  { id: "assist", label: "Assist", icon: HeartHandshake },
  { id: "account", label: "Account", icon: User },
]

// Admin has no separate Account tab — change password / sign out live in Admin Settings
// instead, since the generic account page had little to offer an admin. In its place,
// admin gets the trader-facing Rewards page (editable in place), so they always know
// exactly what the live customer experience looks like. Admin moves to the end.
const adminTabs: { id: AppTab; label: string; icon: typeof Store }[] = [
  { id: "shop", label: "Shop", icon: Store },
  { id: "orders", label: "Orders", icon: Package },
  { id: "offers", label: "Rewards", icon: Tag },
  { id: "assist", label: "Assist", icon: HeartHandshake },
  { id: "admin", label: "Admin", icon: Shield },
]

type AppBottomNavProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  isAdmin?: boolean
}

export function AppBottomNav({ activeTab, onTabChange, isAdmin = false }: AppBottomNavProps) {
  const tabs = isAdmin ? adminTabs : traderTabs
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
      role="navigation"
      aria-label="Main"
    >
      <div className="relative mx-auto max-w-4xl px-1">
        {/* Sliding Laser Indicator Line */}
        <div
          className="absolute top-[-4px] h-[3px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            width: `${100 / tabs.length}%`,
            left: 0,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          <div className="mx-3 h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.8),0_0_4px_rgba(6,182,212,0.6)]" />
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
                className={`unity-tap relative flex min-h-[58px] min-w-[58px] flex-1 flex-col items-center justify-center gap-1 py-1.5 ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-[stroke-width] duration-200 ${
                    isActive ? "stroke-[2.25px]" : "stroke-[1.75px]"
                  }`}
                />
                <span
                  className={`text-[9.5px] font-black uppercase tracking-widest transition-colors duration-200 ${
                    isActive ? "text-blue-700" : ""
                  }`}
                >
                  {label}
                </span>
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
