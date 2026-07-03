"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { AppBottomNav, type AppTab } from "@/components/app-bottom-nav"
import { ShopView } from "@/components/shop-view"
import { OrdersView } from "@/components/orders-view"
import { AdminOrdersView } from "@/components/admin-orders-view"
import { OffersView } from "@/components/offers-view"
import { RetailAssistView } from "@/components/retail-assist-view"
import { AdminCreditControlView } from "@/components/admin-credit-control-view"
import { AccountView } from "@/components/account-view"
import { CartProvider } from "@/lib/cart-context"
import { TradeProvider, useTrade } from "@/lib/trade-context"
import { AdminDashboardView } from "@/components/admin-dashboard-view"
import { AdminWarehouseView } from "@/components/admin-warehouse-view"
import { AdminLeadsView } from "@/components/admin-leads-view"
import { AdminRoutePlannerView } from "@/components/admin-route-planner-view"
import { AdminComplianceView } from "@/components/admin-compliance-view"
import { AdminReportsView } from "@/components/admin-reports-view"
import { AdminSettingsView } from "@/components/admin-settings-view"

export type AdminSection = "dashboard" | "warehouse" | "leads" | "routes" | "compliance" | "reports" | "settings"

function AdminView() {
  const [section, setSection] = useState<AdminSection>("dashboard")

  return (
    <>
      {section === "dashboard" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection} />
      )}
      {section === "warehouse" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminWarehouseView />
        </AdminDashboardView>
      )}
      {section === "leads" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminLeadsView />
        </AdminDashboardView>
      )}
      {section === "routes" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminRoutePlannerView />
        </AdminDashboardView>
      )}
      {section === "compliance" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminComplianceView />
        </AdminDashboardView>
      )}
      {section === "reports" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminReportsView />
        </AdminDashboardView>
      )}
      {section === "settings" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminSettingsView />
        </AdminDashboardView>
      )}
    </>
  )
}

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
      {activeTab === "orders" && (isAdmin ? <AdminOrdersView /> : <OrdersView />)}
      {activeTab === "offers" && <OffersView />}
      {activeTab === "assist" && (isAdmin ? <AdminCreditControlView /> : <RetailAssistView />)}
      {activeTab === "account" && <AccountView />}
      {activeTab === "admin" && isAdmin && <AdminView />}

      <AppBottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
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
