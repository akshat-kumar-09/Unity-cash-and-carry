import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { PwaRegister } from "@/components/pwa-register"

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Unity Cash & Carry | Trade Wholesale',
  description:
    'Specialist tobacco & vape wholesale platform for approved trade customers. Fast UK tracked postage, dispatch under 24hrs.',
  applicationName: 'Unity Cash & Carry',
  appleWebApp: {
    capable: true,
    title: 'Unity Cash & Carry',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${_inter.variable} ${_spaceMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <PwaRegister />
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-[100dvh] md:bg-slate-200">
              {children}
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
