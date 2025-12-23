"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-lg shadow-md border-b border-slate-200/80" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <Image src="/images/caris-logo-v2.png" alt="CÁRIS Logo" width={40} height={40} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">CÁRIS</h1>
              <p className="text-xs text-slate-500 font-medium -mt-1">Organize sua jornada</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#sobre" className="text-slate-700 hover:text-teal-600 transition-colors font-medium">
              Sobre
            </Link>
            <Link href="#ciclos" className="text-slate-700 hover:text-teal-600 transition-colors font-medium">
              Os 4 Ciclos
            </Link>
            <Link href="#precos" className="text-slate-700 hover:text-teal-600 transition-colors font-medium">
              Preços
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" className="text-slate-700 hover:text-teal-600" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6" asChild>
              <Link href="/register">Registrar</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 pb-4 border-t border-slate-200 bg-white/95">
            <nav className="flex flex-col space-y-2 pt-4">
              <Link
                href="#sobre"
                className="px-4 py-2 rounded-md hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sobre
              </Link>
              <Link
                href="#ciclos"
                className="px-4 py-2 rounded-md hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Os 4 Ciclos
              </Link>
              <Link
                href="#precos"
                className="px-4 py-2 rounded-md hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Preços
              </Link>
              <div className="flex flex-col space-y-2 px-4 pt-4 border-t">
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" asChild>
                  <Link href="/register">Registrar</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
