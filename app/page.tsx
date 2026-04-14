"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { AppBottomNav, type AppTab } from "@/components/app-bottom-nav"
import { ShopView } from "@/components/shop-view"
import { OrdersView } from "@/components/orders-view"
import { OffersView } from "@/components/offers-view"
import { WalletView } from "@/components/wallet-view"
import { AccountView } from "@/components/account-view"
import { CartProvider } from "@/lib/cart-context"
import { TradeProvider, useTrade } from "@/lib/trade-context"

function AppShell() {
  const { isAdmin } = useTrade()
  const [activeTab, setActiveTab] = useState<AppTab>("shop")
  const [productRefreshKey, setProductRefreshKey] = useState(0)

  return (
    <div className="min-h-[100dvh] flex flex-col md:max-w-4xl md:mx-auto md:bg-slate-100">
      {activeTab === "shop" && (
        <ShopView
          isAdmin={isAdmin}
          productRefreshKey={productRefreshKey}
          onProductAdded={() => setProductRefreshKey((k) => k + 1)}
        />
      )}
      {activeTab === "orders" && <OrdersView />}
      {activeTab === "offers" && <OffersView />}
      {activeTab === "wallet" && <WalletView />}
      {activeTab === "account" && <AccountView />}

      <AppBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

function HomeContent() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-500 font-mono text-sm uppercase tracking-wider">
          Loading...
        </div>
      </div>
    )
  }

  if (!session) {
    redirect("/login")
  }

  const isAdmin = (session.user as { role?: string })?.role === "admin"

  return (
    <TradeProvider isAdmin={isAdmin} tradeCode="">
      <CartProvider>
        <AppShell />
      </CartProvider>
    </TradeProvider>
  )
}

export default function Home() {
  return <HomeContent />
}
