"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  BookOpen,
  BarChart3,
  Heart,
  Shield,
  Menu,
  X,
  Brain,
  Video,
  Flower2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useLogout } from "@/hooks/use-logout"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { MobileNav, MobileNavSpacer } from "@/components/mobile-nav"
import { useIsMobile } from "@/lib/responsive-utils"
import { ErrorBoundary } from "@/components/error-boundary"
import { LocaleSwitcherCompact } from "@/components/locale-switcher"
import { useTranslations } from "@/lib/i18n"

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const t = useTranslations('dashboard')
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { logout, isLoggingOut } = useLogout()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/users/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const success = await logout()
    if (success) {
      router.push("/login")
    }
  }

  const getNavigationItems = () => {
    const commonItems = [{ href: "/dashboard/settings", icon: Settings, label: t('navigation.settings') }]

    if (user?.role === "psychologist") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: t('navigation.dashboard') },
        { href: "/dashboard/patients", icon: Users, label: t('navigation.patients') },
        { href: "/dashboard/schedule", icon: Calendar, label: t('navigation.schedule') },
        { href: "/dashboard/ai-assistant", icon: Brain, label: t('navigation.aiAssistant') },
        { href: "/dashboard/reports", icon: BarChart3, label: t('navigation.reports') },
        { href: "/dashboard/library", icon: BookOpen, label: t('navigation.library') },
        ...commonItems,
      ]
    } else if (user?.role === "patient") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: t('navigation.dashboard') },
        { href: "/dashboard/journey", icon: Heart, label: t('navigation.journey') },
        { href: "/dashboard/diary", icon: FileText, label: t('navigation.diary') },
        { href: "/dashboard/emotional-map", icon: Brain, label: t('navigation.emotionalMap') },
        { href: "/dashboard/videotherapy", icon: Video, label: t('navigation.videotherapy') },
        { href: "/dashboard/chat", icon: MessageSquare, label: t('navigation.chat') },
        { href: "/dashboard/sessions", icon: Calendar, label: t('navigation.sessions') },
        { href: "/dashboard/tasks", icon: BookOpen, label: t('navigation.tasks') },
        { href: "/dashboard/meditation", icon: Flower2, label: t('navigation.meditation') },
        { href: "/dashboard/progress", icon: BarChart3, label: t('navigation.progress') },
        { href: "/dashboard/sos", icon: Shield, label: t('navigation.sos') },
        ...commonItems,
      ]
    }

    return commonItems
  }

  // Get mobile navigation items (limited to 5 most important)
  const getMobileNavigationItems = () => {
    if (user?.role === "psychologist") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: t('navigation.home') },
        { href: "/dashboard/patients", icon: Users, label: t('navigation.patients') },
        { href: "/dashboard/schedule", icon: Calendar, label: t('navigation.schedule') },
        { href: "/dashboard/reports", icon: BarChart3, label: t('navigation.reports') },
        { href: "/dashboard/settings", icon: Settings, label: t('navigation.config') },
      ]
    } else if (user?.role === "patient") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: t('navigation.home') },
        { href: "/dashboard/chat", icon: MessageSquare, label: t('navigation.chat') },
        { href: "/dashboard/emotional-map", icon: Brain, label: t('navigation.emotions') },
        { href: "/dashboard/sessions", icon: Calendar, label: t('navigation.sessions') },
        { href: "/dashboard/settings", icon: Settings, label: t('navigation.config') },
      ]
    }

    return []
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigationItems = getNavigationItems()
  const mobileNavigationItems = getMobileNavigationItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:inset-0
      `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{tCommon('appName')}</span>
          </Link>

          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {user.role === "psychologist" ? t('userRole.psychologist') : t('userRole.patient')}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-700 hover:text-gray-900"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? t('loggingOut') : tAuth('logout')}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-4 ml-auto">
              {/* Notification Center */}
              <NotificationCenter userId={user.id} />

              {/* Language Switcher */}
              <LocaleSwitcherCompact />

              {/* User avatar */}
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={`p-4 sm:p-6 ${isMobile ? 'pb-20' : ''}`}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          {/* Spacer for mobile navigation */}
          {isMobile && <MobileNavSpacer />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && user && (
        <MobileNav items={mobileNavigationItems} />
      )}
    </div>
  )
}
