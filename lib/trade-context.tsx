"use client"

import { createContext, useContext, type ReactNode } from "react"

type TradeContextType = {
  tradeCode: string
  isAdmin: boolean
  setTrade: (tradeCode: string, isAdmin: boolean) => void
}

const TradeContext = createContext<TradeContextType | null>(null)

type TradeProviderProps = {
  children: ReactNode
  isAdmin?: boolean
  tradeCode?: string
}

export function TradeProvider({ children, isAdmin = false, tradeCode = "" }: TradeProviderProps) {
  const setTrade = () => {} // No-op for logged-in users; kept for API compatibility

  return (
    <TradeContext.Provider value={{ tradeCode, isAdmin, setTrade }}>
      {children}
    </TradeContext.Provider>
  )
}

export function useTrade() {
  const ctx = useContext(TradeContext)
  if (!ctx) throw new Error("useTrade must be used within a TradeProvider")
  return ctx
}
