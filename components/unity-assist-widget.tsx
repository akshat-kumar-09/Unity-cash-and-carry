"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai"
import { useHideWhileScrollingDown } from "@/lib/floating-ui"
import { useCart } from "@/lib/cart-context"
import { triggerCartAddedFeedback } from "@/lib/cart-feedback"
import type { Product } from "@/lib/products"
import type { ProposedBasket } from "@/lib/assist-tools"
import { MessageCircle, X, Send, Mail, Square, ShieldAlert, PackageX, ChevronLeft, Maximize2, Minimize2, Mic, ShoppingCart, MapPin, RotateCcw } from "lucide-react"

// From the Unity Cash & Carry invoice header — confirm this is WhatsApp-enabled
// (it's listed there as a landline) before relying on it in production.
const SUPPORT_WHATSAPP = "441417371500"
const SUPPORT_EMAIL = "support@unitycashandcarry.com"

/** Tappable starter prompts shown before the first message — real questions sent to the
 *  AI, not pre-written cards. Picked to show range (compliance depth, business/margin,
 *  logistics) rather than the "does the ban exist" basics every trade customer already
 *  knows cold by now. Each carries an icon + one-word tag so the list reads as a curated
 *  set, not a plain FAQ dump. */
const STARTER_PROMPTS: { icon: ComponentType<{ className?: string }>; tag: string; text: string }[] = [
  {
    icon: ShoppingCart,
    tag: "Ordering",
    text: "Build me my usual order",
  },
  {
    icon: MapPin,
    tag: "Buying",
    text: "What's selling near me that I don't stock yet?",
  },
  {
    icon: ShieldAlert,
    tag: "Compliance",
    text: "What happens if HMRC finds banned stock during a spot-check — walk me through it",
  },
  {
    icon: PackageX,
    tag: "Logistics",
    text: "My pallet arrived a case short — what's my move?",
  },
]

/** What to show while each tool runs, so a lookup reads as progress, not a stall. */
const TOOL_STATUS: Record<string, string> = {
  searchCatalogue: "Searching the catalogue…",
  myRecentOrders: "Reading your recent orders…",
  myUsualRestock: "Checking what you're due…",
  sellingNearMe: "Looking at what's selling near you…",
  proposeBasket: "Putting your basket together…",
}

/** The basket Unity Assist proposes — added to the order only when the retailer taps. */
function BasketProposal({ basket, onViewOrder }: { basket: ProposedBasket; onViewOrder: () => void }) {
  const { addItems, openCart } = useCart()
  const [added, setAdded] = useState(false)

  if (basket.lines.length === 0) {
    return <p className="mt-1 text-[12.5px] text-slate-500">None of those products are available right now.</p>
  }

  const cases = basket.lines.reduce((sum, l) => sum + l.quantity, 0)

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60">
      {basket.note && <p className="px-3 pt-2.5 text-[12px] font-semibold text-slate-700">{basket.note}</p>}
      <ul className="divide-y divide-blue-100 px-3 py-1">
        {basket.lines.map((line) => (
          <li key={line.product.id} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
            <span className="min-w-0 truncate text-slate-800">{line.product.name}</span>
            <span className="shrink-0 font-mono font-bold text-slate-900">× {line.quantity}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-blue-100 bg-white px-3 py-2.5">
        <span className="font-mono text-[13px] font-bold text-slate-900">
          £{basket.totalExVat.toFixed(2)} <span className="font-sans text-[10px] font-semibold text-slate-400">ex VAT</span>
        </span>
        {added ? (
          <button
            type="button"
            onClick={() => {
              onViewOrder()
              openCart()
            }}
            className="unity-tap rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white"
          >
            Added · view order
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              addItems(basket.lines.map((l) => ({ product: l.product as unknown as Product, quantity: l.quantity })))
              triggerCartAddedFeedback()
              setAdded(true)
            }}
            className="unity-tap rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white"
          >
            Add {cases} {cases === 1 ? "case" : "cases"} to order
          </button>
        )}
      </div>
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20Z" />
    </svg>
  )
}

/** Small gradient orb used both on the floating trigger and the panel header —
 *  the one recurring visual mark that makes this read as a distinct assistant
 *  rather than a generic chat-widget shell. */
function AssistMark({ className }: { className?: string }) {
  return (
    <span className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 ${className ?? ""}`}>
      <MessageCircle className="h-5 w-5 text-white" />
    </span>
  )
}

export function UnityAssistWidget() {
  const hideForScroll = useHideWhileScrollingDown()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  // Speak an order instead of typing it — where the browser supports speech recognition.
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  }, [])

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const w = window as unknown as Record<string, new () => any>
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = "en-GB"
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      setInput(Array.from(event.results, (r) => r[0].transcript).join(" "))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const { messages, sendMessage, regenerate, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assist/chat" }),
  })

  const busy = status === "submitted" || status === "streaming"
  const hasMessages = messages.length > 0

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  const close = () => setOpen(false)

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    sendMessage({ text: trimmed })
    setInput("")
  }

  const waHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi Unity, I have a question.")}`
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Unity Assist enquiry")}`

  return (
    <>
      {/* Floating trigger — mirrors AppBottomNav's fixed-full-width + centered-max-w-4xl trick
          so the bubble aligns with the card edge on desktop instead of the raw viewport edge. */}
      {!open && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="relative mx-auto h-0 max-w-4xl">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open Unity Assist"
              className={`unity-tap pointer-events-auto absolute bottom-[92px] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30 transition-[transform,opacity] duration-300 ease-out [html[data-floating-bar]_&]:bottom-[152px] ${
                hideForScroll ? "pointer-events-none translate-y-6 opacity-0" : ""
              }`}
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          className={`fixed inset-0 z-50 flex justify-center animate-in fade-in duration-200 ${
            expanded ? "" : "items-end bg-black/50 backdrop-blur-sm sm:items-center"
          }`}
          onClick={expanded ? undefined : close}
        >
          <div
            className={`flex w-full flex-col overflow-hidden bg-slate-50 shadow-2xl animate-in duration-300 ${
              expanded
                ? "h-full slide-in-from-bottom-1"
                : "h-[88dvh] rounded-t-3xl slide-in-from-bottom sm:mx-4 sm:h-[80vh] sm:max-h-[720px] sm:max-w-md sm:rounded-3xl sm:zoom-in-95 sm:slide-in-from-bottom-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 px-5 pb-6 pt-5 text-white">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {hasMessages && (
                    <button
                      type="button"
                      onClick={() => setMessages([])}
                      aria-label="Back to suggestions"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                    >
                      <ChevronLeft className="h-4.5 w-4.5" />
                    </button>
                  )}
                  <AssistMark className="h-10 w-10 shrink-0" />
                  <div>
                    <h2 className="text-[16px] font-black leading-none tracking-tight">Unity Assist</h2>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-100/80">
                      Your trade know-it-all
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    aria-label={expanded ? "Exit full screen" : "Full screen"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close Unity Assist"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {!hasMessages && (
                <p className="relative mt-3 max-w-[92%] text-[12.5px] leading-relaxed text-blue-50/90">
                  Say what you need — &ldquo;my usual, plus 5 BM600 blue razz&rdquo; — and I&rsquo;ll build the basket. Or ask about compliance, margins, logistics.
                </p>
              )}
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!hasMessages ? (
                <div className="space-y-2">
                  <p className="px-1 text-[10.5px] font-black uppercase tracking-widest text-slate-400">
                    Try asking
                  </p>
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={prompt.text}
                      type="button"
                      onClick={() => submit(prompt.text)}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className="group flex w-full animate-in fade-in slide-in-from-bottom-2 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all fill-mode-both hover:border-blue-400 hover:shadow-md active:scale-[0.99]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 transition-colors group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white">
                        <prompt.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/70">
                          {prompt.tag}
                        </span>
                        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-700">
                          {prompt.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                        message.role === "user"
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.parts.map((part, i) => {
                        if (part.type === "text") {
                          return <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                        }
                        if (!isToolUIPart(part)) return null
                        const tool = getToolName(part)
                        if (tool === "proposeBasket" && part.state === "output-available") {
                          return <BasketProposal key={i} basket={part.output as ProposedBasket} onViewOrder={close} />
                        }
                        if (part.state === "input-streaming" || part.state === "input-available") {
                          return (
                            <span key={i} className="block text-[12px] font-semibold text-blue-600">
                              {TOOL_STATUS[tool] ?? "Working on it…"}
                            </span>
                          )
                        }
                        if (part.state === "output-error") {
                          return (
                            <span key={i} className="block text-[12px] text-red-600">
                              That lookup didn&apos;t work — try again.
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))
              )}
              {status === "submitted" && (
                <div className="flex animate-in fade-in justify-start">
                  <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                    <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500" />
                    <span className="text-[11px] font-semibold text-slate-400">Thinking…</span>
                  </div>
                </div>
              )}
              {status === "error" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-medium text-red-700">
                  <p>Something went wrong getting a reply. Try again, or message the team below.</p>
                  <button
                    type="button"
                    onClick={() => regenerate().catch(() => {})}
                    className="unity-tap mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-700 shadow-sm ring-1 ring-red-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Try again
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3">
              <form
                onSubmit={(e) => { e.preventDefault(); submit(input) }}
                className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2 transition-colors focus-within:border-blue-500"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? "Listening…" : "Ask or say what you need…"}
                  disabled={busy}
                  className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-slate-400 disabled:opacity-60"
                />
                {speechSupported && !busy && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-label={listening ? "Stop listening" : "Speak your message"}
                    aria-pressed={listening}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                      listening ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
                {busy ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    aria-label="Stop response"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white transition-colors hover:bg-slate-900"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>
            </div>

            {/* Handoff footer */}
            <div className="shrink-0 space-y-3 bg-white px-4 pb-4 pt-3">
              <div className="flex gap-2.5">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-emerald-600"
                >
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp a person
                </a>
                <a
                  href={mailHref}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
              <p className="pt-0.5 text-center text-[9.5px] leading-relaxed text-slate-400">
                Unity Assist gives general guidance to help you trade compliantly. It isn&rsquo;t legal advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
