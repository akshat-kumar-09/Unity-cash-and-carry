"use client"

import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from "react"
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
import { UnityAssistWidget } from "@/components/unity-assist-widget"
import { CartFooter } from "@/components/cart-footer"
import { AppSplash } from "@/components/app-splash"
import { ShopStagingProvider, StagedBar } from "@/lib/shop-staging"
import { announceTabShown } from "@/lib/tab-events"

type OnboardingProfile = {
  name: string | null
  companyName: string | null
  vatNumber: string | null
  approvedAt: string | null
  welcomeGameCompletedAt: string | null
}

export type AdminSection = "dashboard" | "warehouse" | "leads" | "routes" | "compliance" | "pricing" | "reports" | "settings"

function AdminView() {
  const [section, setSectionState] = useState<AdminSection>("dashboard")
  const sectionChanged = useRef(false)
  const setSection = (next: AdminSection) => {
    sectionChanged.current = true
    setSectionState(next)
  }
  // Each section opens at its top rather than wherever the last one was scrolled to.
  useLayoutEffect(() => {
    if (!sectionChanged.current) return
    sectionChanged.current = false
    window.scrollTo(0, 0)
  }, [section])

  // One frame for every section, so the header and section tabs stay put (tab strip
  // scroll included) and only the content below them changes.
  return (
    <AdminDashboardView activeSection={section} onSectionChange={setSection}>
      {section === "warehouse" && <AdminWarehouseView />}
      {section === "leads" && <AdminLeadsView />}
      {section === "routes" && <AdminRoutePlannerView />}
      {section === "compliance" && <AdminComplianceView />}
      {section === "pricing" && <AdminPricingView />}
      {section === "reports" && <AdminReportsView />}
      {section === "settings" && <AdminSettingsView />}
    </AdminDashboardView>
  )
}

const TAB_ORDER: AppTab[] = ["shop", "orders", "offers", "assist", "account", "admin"]

function AppShell() {
  const { isAdmin } = useTrade()
  const [activeTab, setActiveTabState] = useState<AppTab>("shop")
  const [productRefreshKey, setProductRefreshKey] = useState(0)

  // Tabs are mounted on first visit and then kept (hidden) — switching back to Shop finds
  // the same open brand and line, scrolled to the same spot, instead of a reset screen.
  const [visited, setVisited] = useState<Set<AppTab>>(() => new Set<AppTab>(["shop"]))
  const scrollByTab = useRef<Partial<Record<AppTab, number>>>({})
  const activeTabRef = useRef<AppTab>("shop")

  const showTab = (tab: AppTab) => {
    scrollByTab.current[activeTabRef.current] = window.scrollY
    activeTabRef.current = tab
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
    setActiveTabState(tab)
  }

  // Restore the tab's own scroll position before paint, so there's no flash of the
  // previous tab's position.
  useLayoutEffect(() => {
    window.scrollTo(0, scrollByTab.current[activeTab] ?? 0)
  }, [activeTab])

  useEffect(() => {
    announceTabShown(activeTab)
  }, [activeTab])

  // The app is one URL with all "tabs" swapped via local state, so switching tabs never
  // left anything in browser history — the phone/browser back button had nothing of the
  // app's own to step through and jumped straight past it. Push a history entry per tab
  // so back steps back through tabs visited instead of leaving the app immediately.
  useEffect(() => {
    window.history.replaceState({ tab: "shop" }, "", "#shop")
    const onPopState = (e: PopStateEvent) => {
      // Entries pushed by sheets/modals (useBackHandler) carry no tab — those are theirs.
      if (e.state?.backHandler) return
      const tab = (e.state?.tab as AppTab) || "shop"
      showTab(tab)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const setActiveTab = (tab: AppTab) => {
    if (tab === activeTab) {
      // Tapping the tab you're already on scrolls it back to the top, like native apps.
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    window.history.pushState({ tab }, "", `#${tab}`)
    showTab(tab)
  }

  const renderTab = (tab: AppTab): ReactNode => {
    switch (tab) {
      case "shop":
        return (
          <ShopView
            isAdmin={isAdmin}
            productRefreshKey={productRefreshKey}
            onProductAdded={() => setProductRefreshKey((k) => k + 1)}
          />
        )
      case "orders":
        return isAdmin ? <AdminOrdersView /> : <OrdersView />
      case "offers":
        return <OffersView />
      case "assist":
        return isAdmin ? <AdminCreditControlView /> : <RetailAssistView />
      case "account":
        return <AccountView />
      case "admin":
        return isAdmin ? <AdminView /> : null
    }
  }

  return (
    <ShopStagingProvider>
      <div className="min-h-[100dvh] flex flex-col md:max-w-4xl md:mx-auto md:bg-slate-100">
        {TAB_ORDER.filter((tab) => visited.has(tab)).map((tab) => (
          <div key={tab} hidden={tab !== activeTab}>
            {renderTab(tab)}
          </div>
        ))}

        {/* The cart sheet can open from any tab (e.g. Quick Reorder on Orders); its
            floating "View Order" bar only shows on Shop. */}
        <StagedBar active={activeTab === "shop"} />
        <CartFooter showBar={activeTab === "shop"} />
        <AppBottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
        <UnityAssistWidget />
      </div>
    </ShopStagingProvider>
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

  if (status === "loading" || (status === "authenticated" && profileLoading) || !session) {
    return <AppSplash />
  }

  const role = (session.user as { role?: string })?.role
  const isAdmin = role === "admin"
  // welcomeGameCompletedAt is the sole gate now (role-independent) — real accounts of any
  // role only ever have it null before their actual first login or after an explicit
  // "Replay Welcome Build" from Admin Settings, so admin/rep accounts don't see this
  // unprompted; it only shows when someone deliberately triggers a replay for demos.
  const needsWelcomeBuild = profile != null && !profile.welcomeGameCompletedAt

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
