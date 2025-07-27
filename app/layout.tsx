import type React from "react"
import type { Metadata } from "next"
// Temporarily disabled due to network issues in build environment
// import { Inter, Lora } from 'next/font/google'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

// Temporarily disabled due to network issues in build environment
// const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
// const lora = Lora({ subsets: ["latin"], variable: "--font-lora", style: "italic" })

export const metadata: Metadata = {
  title: "CÁRIS - Clareza Existencial",
  description: "Organize sua jornada em ciclos naturais. A plataforma completa para psicólogos e pacientes.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
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
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
