"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function HeroSection() {
  return (
    <section id="sobre" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 bg-slate-50 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/auth-background.png"
          alt="Fundo Abstrato"
          layout="fill"
          objectFit="cover"
          className="opacity-50"
        />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight mb-6">
              Clareza existencial em uma <span className="text-teal-600 font-lora">experiência cinematográfica</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
              CÁRIS é um software web premium que combina escrita reflexiva guiada, organização emocional por ciclos e
              visualizações poéticas para proporcionar uma jornada de autoconhecimento única.
            </p>
            <div className="bg-orange-100/50 border-l-4 border-orange-500 text-orange-800 p-4 rounded-r-lg mb-8 max-w-xl mx-auto lg:mx-0">
              <p className="font-medium">
                A clareza não é apenas ver o mundo como ele é, mas reconhecer como você o transforma com seu olhar.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 text-base"
                asChild
              >
                <Link href="/register">Iniciar Jornada</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-base bg-white/50" asChild>
                <Link href="#ciclos">Conhecer os Ciclos</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/hero-brain-puppet.png"
              alt="Mão controlando um cérebro com cordas"
              width={500}
              height={500}
              className="rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
