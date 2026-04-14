"use client"

import { ShoppingCart, Truck, ShieldCheck, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import { useCart } from "@/lib/cart-context"
import { UnityLogo } from "./unity-logo"

export function StoreHeader({ isAdmin = false, morphed = false }: { isAdmin?: boolean; morphed?: boolean }) {
  const { totalItems, openCart } = useCart()

  return (
    <header
      className={`sticky top-0 z-50 bg-gradient-to-r from-blue-700 to-blue-600 text-white border-b border-blue-800/50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        morphed ? "shadow-xl shadow-blue-900/30" : "shadow-lg shadow-blue-900/20"
      }`}
    >
      <div
        className={`flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          morphed ? "px-3 py-1.5" : "px-3 py-2.5"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`rounded-md border border-white/20 bg-white/10 transition-all duration-300 ${
              morphed ? "p-0.5" : "p-1"
            }`}
          >
            <UnityLogo size={morphed ? 24 : 32} />
          </div>
          <div>
            <h1
              className={`font-bold text-white tracking-tight uppercase transition-all duration-300 ${
                morphed ? "text-xs" : "text-sm"
              }`}
            >
              Unity Cash & Carry
            </h1>
            {!morphed && (
              <p className="text-[10px] text-blue-100 font-mono uppercase tracking-wider flex items-center gap-1">
                Trade Wholesale
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[9px] font-bold">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!morphed && (
            <div className="flex items-center gap-1.5 text-blue-100">
              <Truck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase hidden sm:inline">
                UK Tracked Postage
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 -m-1 rounded-lg hover:bg-white/10 transition-colors text-blue-100 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 p-1 -m-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={`View cart (${totalItems} items)`}
          >
            <ShoppingCart className={`text-white transition-all duration-300 ${morphed ? "w-4 h-4" : "w-5 h-5"}`} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-blue-700 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
