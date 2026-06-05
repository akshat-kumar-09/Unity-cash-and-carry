"use client"

import { Shield, Mail, Lock, Phone } from "lucide-react"
import { UnityLogo } from "@/components/unity-logo"

export default function InviteOnlyPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] auth-page-bg flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-[80px]" />
        <div className="absolute bottom-1/3 -right-24 w-96 h-96 rounded-full bg-blue-400/25 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="inline-flex justify-center mb-6 rounded-2xl border-2 border-white/40 bg-white/15 p-4 shadow-2xl backdrop-blur-sm animate-scale-in">
          <UnityLogo size={72} />
        </div>

        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg [text-shadow:0_2px_20px_rgba(0,0,0,0.3)]">
          UNITY
        </h1>
        <h2 className="text-xl font-bold text-white/90 tracking-wide mt-1">
          CASH & CARRY
        </h2>
        <p className="text-white/60 mt-3 text-xs font-mono uppercase tracking-[0.2em] mb-8">
          Private Trade Portal
        </p>

        <div className="bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-3xl p-8 text-left space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-2">
            <Shield className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Private Trade Entrance</h3>
            <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
              This B2B portal is restricted to authorized trade customers only. To protect pricing compliance and HMRC wholesale regulations, public access is gated.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">How to gain access</p>
            
            <div className="flex items-start gap-3 text-slate-700">
              <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold">Existing approved customers</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Check your commercial email for your secure activation link.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-700">
              <Phone className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold">New trade account requests</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Please apply via <a href="https://unitywholesale.co.uk" className="text-blue-600 hover:underline font-bold" target="_blank" rel="noopener noreferrer">our public website</a> or contact your assigned Unity sales representative.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/50 text-[10px] font-mono mt-8">
          HMRC AWRS Registered • VAT Compliance Portal
        </p>
      </div>
    </div>
  )
}
