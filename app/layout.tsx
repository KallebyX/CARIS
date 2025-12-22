import type React from "react"
import type { Metadata, Viewport } from "next"

// Temporarily disabled due to network issues in build environment
// import { Inter, Lora } from 'next/font/google'

import "./globals.css"

// Force dynamic rendering for all pages to avoid static generation issues with
// cookies, authentication, and i18n during build
export const dynamic = 'force-dynamic'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { QueryProvider } from "./providers"
import { ServiceWorkerRegister } from "@/app/sw-register"
import Script from "next/script"

// Temporarily disabled due to network issues in build environment
// const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
// const lora = Lora({ subsets: ["latin"], variable: "--font-lora", style: "italic" })




export const metadata: Metadata = {
  title: "CÁRIS - Clareza Existencial",
  description: "Organize sua jornada em ciclos naturais. A plataforma completa para psicólogos e pacientes.",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CÁRIS',
  },
  applicationName: 'CÁRIS',
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'CÁRIS',
    title: 'CÁRIS - Clareza Existencial',
    description: 'Organize sua jornada em ciclos naturais. A plataforma completa para psicólogos e pacientes.',
  },
  twitter: {
    card: 'summary',
    title: 'CÁRIS - Clareza Existencial',
    description: 'Organize sua jornada em ciclos naturais. A plataforma completa para psicólogos e pacientes.',
  },
}

export const viewport: Viewport = {
  themeColor: '#14b8a6', // Teal-500 to match platform theme
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@1,400;1,500&display=swap" rel="stylesheet" />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#14b8a6" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CÁRIS" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="font-sans antialiased">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <ServiceWorkerRegister />
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
