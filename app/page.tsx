"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { AdminPricingView } from "@/components/admin-pricing-view"
import { AdminReportsView } from "@/components/admin-reports-view"
import { AdminSettingsView } from "@/components/admin-settings-view"
import { WelcomeBuild } from "@/components/welcome-build/welcome-build"

type OnboardingProfile = {
  name: string | null
  companyName: string | null
  vatNumber: string | null
  approvedAt: string | null
  welcomeGameCompletedAt: string | null
}

export type AdminSection = "dashboard" | "warehouse" | "leads" | "routes" | "compliance" | "pricing" | "reports" | "settings"

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
      {section === "pricing" && (
        <AdminDashboardView activeSection={section} onSectionChange={setSection}>
          <AdminPricingView />
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
  const [activeTab, setActiveTabState] = useState<AppTab>("shop")
  const [productRefreshKey, setProductRefreshKey] = useState(0)

  // The app is one URL with all "tabs" swapped via local state, so switching tabs never
  // left anything in browser history — the phone/browser back button had nothing of the
  // app's own to step through and jumped straight past it. Push a history entry per tab
  // so back steps back through tabs visited instead of leaving the app immediately.
  useEffect(() => {
    window.history.replaceState({ tab: "shop" }, "", "#shop")
    const onPopState = (e: PopStateEvent) => {
      const tab = (e.state?.tab as AppTab) || "shop"
      setActiveTabState(tab)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const setActiveTab = (tab: AppTab) => {
    if (tab !== activeTab) {
      window.history.pushState({ tab }, "", `#${tab}`)
    }
    setActiveTabState(tab)
  }

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
  const router = useRouter()
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [status])

  // Client Component navigation belongs in an effect, not a render-time redirect() call —
  // during sign-out's session-state transition, a render-time redirect() was getting caught
  // by the error boundary instead of the router (the "sign out -> error page" bug).
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  if (status === "loading" || (status === "authenticated" && profileLoading)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-500 font-mono text-sm uppercase tracking-wider">
          Loading...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-500 font-mono text-sm uppercase tracking-wider">
          Loading...
        </div>
      </div>
    )
  }

  const role = (session.user as { role?: string })?.role
  const isAdmin = role === "admin"
  // The welcome build is a retailer's first-login moment — admin/rep accounts (internal
  // tooling logins, not onboarded trade partners) skip it entirely.
  const isRetailer = role === "customer" || role === "trader"
  const needsWelcomeBuild = isRetailer && profile != null && !profile.welcomeGameCompletedAt

  if (needsWelcomeBuild && profile) {
    return (
      <WelcomeBuild
        companyName={profile.companyName || ""}
        name={profile.name}
        vatNumber={profile.vatNumber}
        approvedAt={profile.approvedAt}
        onDone={() => {
          setProfile((p) => (p ? { ...p, welcomeGameCompletedAt: new Date().toISOString() } : p))
        }}
      />
    )
  }

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
