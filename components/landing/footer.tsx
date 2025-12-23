import Link from "next/link"
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <Image src="/images/caris-logo-v2.png" alt="CÁRIS Logo" width={40} height={40} />
              <div>
                <h3 className="text-xl font-bold">CÁRIS</h3>
                <p className="text-sm text-slate-400">Plataforma Terapêutica</p>
              </div>
            </div>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Clareza existencial em uma experiência sensorial única. Transformando a prática terapêutica com tecnologia
              e sensibilidade.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Produto</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/#funcionalidades" className="text-slate-400 hover:text-white transition-colors">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="/#precos" className="text-slate-400 hover:text-white transition-colors">
                  Preços
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-400 hover:text-white transition-colors">
                  Começar Agora
                </Link>
              </li>
              <li>
                <Link href="/#depoimentos" className="text-slate-400 hover:text-white transition-colors">
                  Depoimentos
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Suporte</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/#faq" className="text-slate-400 hover:text-white transition-colors">
                  Perguntas Frequentes
                </Link>
              </li>
              <li>
                <a href="mailto:contato@caris.com.br" className="text-slate-400 hover:text-white transition-colors">
                  Contato
                </a>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                  Acessar Plataforma
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contato</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-teal-400" />
                <span className="text-slate-400">contato@caris.com.br</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-teal-400" />
                <span className="text-slate-400">(11) 3000-0000</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-teal-400" />
                <span className="text-slate-400">São Paulo, SP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap justify-center md:justify-start space-x-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-white transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              <Link href="/lgpd" className="hover:text-white transition-colors">
                LGPD
              </Link>
              <Link href="/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
            <div className="text-sm text-slate-400">© 2025 CÁRIS. Todos os direitos reservados.</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
