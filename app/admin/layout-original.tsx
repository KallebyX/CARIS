"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Users, Settings, LogOut, User, Bell, Menu, Shield, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-logout"

const adminNavItems = [
  { title: "Visão Geral", href: "/admin", icon: Home },
  { title: "Usuários", href: "/admin/users", icon: Users },
  { title: "Planos", href: "/admin/plans", icon: Shield },
]

interface UserData {
  id: number
  name: string
  email: string
  role: "admin"
  avatarUrl?: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, isLoggingOut } = useLogout()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const data = await res.json()
          if (data.role !== "admin") {
            router.push("/dashboard")
            return
          }
          setUser(data)
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Failed to fetch user", error)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  const handleLogout = () => {
    logout(true)
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === href
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <Link href="/admin" className="flex items-center space-x-3">
          <Image src="/images/caris-logo-v2.png" alt="CÁRIS Logo" width={32} height={32} />
          <div>
            <h1 className="text-xl font-bold text-slate-800">CÁRIS</h1>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-teal-100 text-teal-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              isLoggingOut && "pointer-events-none opacity-50",
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t border-slate-200">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors",
            isLoggingOut && "pointer-events-none opacity-50",
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </Link>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Overlay durante logout */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-slate-700 font-medium">Desconectando...</p>
          </div>
        </div>
      )}

      <aside className="hidden lg:block fixed left-0 top-0 z-40 w-64 h-screen bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white/80 backdrop-blur-lg px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden shrink-0 bg-transparent"
                disabled={isLoggingOut}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" disabled={isLoggingOut}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificações</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" disabled={isLoggingOut}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl || "/placeholder.svg?height=40&width=40"} alt={user?.name} />
                    <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-slate-500 font-normal">{user?.email}</p>
                  <p className="text-xs text-orange-600 font-medium">Administrador</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={cn("p-4 md:p-8", isLoggingOut && "pointer-events-none opacity-50")}>{children}</main>
      </div>
    </div>
  )
}
