"use client"

import { useState, useEffect, useMemo } from "react"
import {
  FileText,
  Loader2,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  Briefcase,
  Landmark,
  PoundSterling,
  CheckCircle,
  TrendingUp,
} from "lucide-react"
import { AppScreenHeader } from "@/components/app-screen-header"

type ReportType = "duty_account" | "dispatch_log"

export function AdminReportsView() {
  const [reportType, setReportType] = useState<ReportType>("duty_account")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  // Report params
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [fromDate, setFromDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  )
  const [toDate, setToDate] = useState(now.toISOString().split("T")[0])

  // Deadline Tracker Calculations
  const deadlines = useMemo(() => {
    const today = new Date()
    // Submissions due 7th of next month
    const nextMonthSub = new Date(today.getFullYear(), today.getMonth() + 1, 7)
    // Payment due 15th of next month
    const nextMonthPay = new Date(today.getFullYear(), today.getMonth() + 1, 15)

    const diffSub = nextMonthSub.getTime() - today.getTime()
    const diffPay = nextMonthPay.getTime() - today.getTime()

    return {
      submissionDate: nextMonthSub.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      daysToSub: Math.max(0, Math.ceil(diffSub / (1000 * 60 * 60 * 24))),
      paymentDate: nextMonthPay.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      daysToPay: Math.max(0, Math.ceil(diffPay / (1000 * 60 * 60 * 24))),
    }
  }, [])

  const handleGenerateReport = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      let url = `/api/admin/reports?type=${reportType}`
      if (reportType === "duty_account") {
        url += `&period=${period}`
      } else {
        url += `&from=${fromDate}&to=${toDate}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to generate report")
      }

      const reportData = await res.json()
      setData(reportData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!data) return

    let csvContent = ""
    let filename = `unity_${reportType}_report`

    if (reportType === "duty_account") {
      const extractions = data.extractions || []
      filename += `_${period}.csv`
      csvContent += "Extraction Date,Product SKU,Product Name,Quantity Units,Liquid Vol Ml,Total Vol Ml,Duty Liability (£),Notes\n"
      extractions.forEach((e: any) => {
        const date = new Date(e.extractedAt).toISOString().split("T")[0]
        csvContent += `"${date}","${e.product?.sku || ""}","${e.product?.name || ""}","${e.quantityUnits}","${e.liquidVolumeMl}","${e.totalVolumeMl}","${e.totalDuty}","${e.notes || ""}"\n`
      })
    } else {
      const orders = data.orders || []
      filename += `_${fromDate}_to_${toDate}.csv`
      csvContent += "Order Number,Date,Trader Name,Trader VAT,Subtotal (£),Duty Amount (£),VAT (£),Total (£)\n"
      orders.forEach((o: any) => {
        const date = new Date(o.createdAt).toISOString().split("T")[0]
        csvContent += `"${o.orderNumber}","${date}","${o.user?.companyName || o.customerName || ""}","${o.user?.vatNumber || ""}","${o.subtotal}","${o.vapeDutyAmount}","${o.vat}","${o.total}"\n`
      })
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col unity-app-screen pb-28">
      <AppScreenHeader
        title="Audit & Reports"
        subtitle="HMRC duty returns and order log auditing"
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Deadline Tracker Panel */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-600" />
            HMRC Duty Filing Deadline Tracker
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-slate-700">Next Return Submission</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Due date: {deadlines.submissionDate}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[16px] font-black text-blue-700">{deadlines.daysToSub}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Days remaining</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
              <Landmark className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-slate-700">Next Excise Payment</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Due date: {deadlines.daysToPay}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[16px] font-black text-amber-700">{deadlines.daysToPay}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Days remaining</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Report Selector & Parameters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportType("duty_account")
                  setData(null)
                }}
                className={`py-3 px-4 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border ${
                  reportType === "duty_account"
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Duty Account Return
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType("dispatch_log")
                  setData(null)
                }}
                className={`py-3 px-4 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border ${
                  reportType === "dispatch_log"
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Order Dispatch Log
              </button>
            </div>
          </div>

          {reportType === "duty_account" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Accounting Period
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <FileText className="h-4.5 w-4.5" />
            )}
            {loading ? "Generating report…" : "Generate Audit Report"}
          </button>
        </section>

        {/* Error Display */}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Report Results */}
        {data && !loading && (
          <section className="space-y-4">
            {/* Header / CSV Download */}
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Generated Audit Results
              </h3>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>

            {/* Stats Summary */}
            {reportType === "duty_account" ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <span className="text-[18px] font-black text-slate-900 leading-none">
                    {data.summary?.totalUnits || 0}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Total Units
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <span className="text-[18px] font-black text-slate-900 leading-none">
                    {((data.summary?.totalVolumeMl || 0) / 1000).toFixed(2)}L
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Liquid Volume
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm border-l-4 border-l-amber-500">
                  <span className="text-[18px] font-black text-amber-700 leading-none">
                    £{(data.summary?.totalDuty || 0).toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Excise Liability
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <span className="text-[18px] font-black text-slate-900 leading-none">
                    {data.count || 0}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Total Orders
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <span className="text-[18px] font-black text-emerald-600 leading-none">
                    £{(data.totalRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Dispatched Rev
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm border-l-4 border-l-blue-500">
                  <span className="text-[18px] font-black text-blue-700 leading-none">
                    £{(data.totalDuty || 0).toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 block uppercase tracking-wider">
                    Collected Duty
                  </span>
                </div>
              </div>
            )}

            {/* Results Table */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              {reportType === "duty_account" ? (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Date</span>
                    <span>Product Name</span>
                    <span className="text-right">Quantity</span>
                    <span className="text-right">Duty</span>
                  </div>
                  {/* Table Rows */}
                  <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                    {(!data.extractions || data.extractions.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-[12px]">
                        No extraction records found for this period.
                      </div>
                    ) : (
                      data.extractions.map((e: any) => (
                        <div key={e.id} className="grid grid-cols-4 gap-2 px-5 py-3 text-[12px] items-center hover:bg-slate-50/50">
                          <span className="text-slate-500">{formatDate(e.extractedAt)}</span>
                          <span className="font-bold text-slate-800 truncate">{e.product?.name}</span>
                          <span className="text-right font-mono text-slate-700">{e.quantityUnits} units</span>
                          <span className="text-right font-mono font-bold text-amber-700">£{e.totalDuty.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Order No</span>
                    <span>Trader</span>
                    <span className="text-right">Subtotal</span>
                    <span className="text-right">Excise Duty</span>
                  </div>
                  {/* Table Rows */}
                  <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                    {(!data.orders || data.orders.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-[12px]">
                        No dispatched orders found for this period.
                      </div>
                    ) : (
                      data.orders.map((o: any) => (
                        <div key={o.id} className="grid grid-cols-4 gap-2 px-5 py-3 text-[12px] items-center hover:bg-slate-50/50">
                          <span className="font-mono text-blue-600 font-bold">{o.orderNumber.split("-")[1] || o.orderNumber}</span>
                          <span className="font-semibold text-slate-700 truncate">{o.user?.companyName || o.customerName || "Trader"}</span>
                          <span className="text-right font-mono text-slate-700">£{o.subtotal.toFixed(2)}</span>
                          <span className="text-right font-mono font-bold text-blue-700">£{o.vapeDutyAmount.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
