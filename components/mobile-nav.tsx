"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

/* ============================================
   Types and Interfaces
   ============================================ */

export interface MobileNavItem {
  href: string
  icon: LucideIcon
  label: string
  badge?: number
  isActive?: (pathname: string) => boolean
}

interface MobileNavProps {
  items: MobileNavItem[]
  className?: string
}

/* ============================================
   Mobile Bottom Navigation Component
   ============================================ */

/**
 * Mobile Bottom Navigation Bar
 *
 * Features:
 * - Fixed bottom position
 * - Touch-optimized targets (44px min)
 * - Active state indicators
 * - Badge support for notifications
 * - Safe area insets for iOS
 * - Smooth transitions
 */
export function MobileNav({ items, className }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white border-t border-gray-200",
        "safe-area-bottom",
        "lg:hidden", // Hide on desktop
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = item.isActive
            ? item.isActive(pathname)
            : pathname === item.href || pathname.startsWith(item.href + "/")

          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-[44px] min-h-[44px] flex-1",
                "transition-colors duration-200",
                "touch-manipulation",
                "group",
                isActive
                  ? "text-teal-600"
                  : "text-gray-500 hover:text-gray-700 active:text-gray-900"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Icon Container */}
              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                />

                {/* Badge for notifications */}
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center rounded-full"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs mt-1 font-medium transition-all duration-200",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-teal-600 rounded-t-full"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ============================================
   Compact Mobile Navigation
   ============================================ */

/**
 * Compact Mobile Navigation (Icons Only)
 *
 * A more compact version showing only icons, useful when space is limited
 */
export function MobileNavCompact({ items, className }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white/95 backdrop-blur-sm border-t border-gray-200",
        "safe-area-bottom",
        "lg:hidden",
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = item.isActive
            ? item.isActive(pathname)
            : pathname === item.href || pathname.startsWith(item.href + "/")

          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center",
                "min-w-[44px] min-h-[44px]",
                "rounded-full transition-all duration-200",
                "touch-manipulation",
                isActive
                  ? "text-white bg-teal-600"
                  : "text-gray-500 hover:bg-gray-100 active:bg-gray-200"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />

              {/* Badge for notifications */}
              {item.badge !== undefined && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center rounded-full"
                  aria-label={`${item.badge} notifications`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ============================================
   Mobile Navigation Spacer
   ============================================ */

/**
 * Spacer component to prevent content from being hidden behind bottom nav
 * Add this at the end of your page content
 */
export function MobileNavSpacer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "lg:hidden",
        compact ? "h-14" : "h-16",
        "safe-area-bottom"
      )}
      aria-hidden="true"
    />
  )
}

/* ============================================
   Floating Action Button (FAB)
   ============================================ */

interface MobileFABProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: "primary" | "secondary" | "danger"
  position?: "right" | "center"
  className?: string
}

/**
 * Floating Action Button for mobile
 *
 * Primary action button that floats above the bottom navigation
 */
export function MobileFAB({
  icon: Icon,
  label,
  onClick,
  variant = "primary",
  position = "right",
  className,
}: MobileFABProps) {
  const variantStyles = {
    primary: "bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white",
    danger: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white",
  }

  const positionStyles = {
    right: "right-4",
    center: "left-1/2 -translate-x-1/2",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 z-40",
        "w-14 h-14 rounded-full shadow-lg",
        "flex items-center justify-center",
        "transition-all duration-200",
        "touch-manipulation",
        "lg:hidden",
        variantStyles[variant],
        positionStyles[position],
        "hover:shadow-xl active:scale-95",
        className
      )}
      aria-label={label}
    >
      <Icon className="w-6 h-6" aria-hidden="true" />
    </button>
  )
}

/* ============================================
   Helper Functions
   ============================================ */

/**
 * Helper to create navigation items for patient role
 */
export function getPatientNavItems(notificationCount: number = 0): MobileNavItem[] {
  return [
    {
      href: "/dashboard",
      icon: require("lucide-react").LayoutDashboard,
      label: "Início",
    },
    {
      href: "/dashboard/journey",
      icon: require("lucide-react").Heart,
      label: "Jornada",
    },
    {
      href: "/dashboard/chat",
      icon: require("lucide-react").MessageSquare,
      label: "Chat",
      badge: notificationCount,
    },
    {
      href: "/dashboard/sessions",
      icon: require("lucide-react").Calendar,
      label: "Sessões",
    },
    {
      href: "/dashboard/settings",
      icon: require("lucide-react").Settings,
      label: "Config",
    },
  ]
}

/**
 * Helper to create navigation items for psychologist role
 */
export function getPsychologistNavItems(notificationCount: number = 0): MobileNavItem[] {
  return [
    {
      href: "/dashboard",
      icon: require("lucide-react").LayoutDashboard,
      label: "Início",
    },
    {
      href: "/dashboard/patients",
      icon: require("lucide-react").Users,
      label: "Pacientes",
    },
    {
      href: "/dashboard/schedule",
      icon: require("lucide-react").Calendar,
      label: "Agenda",
    },
    {
      href: "/dashboard/reports",
      icon: require("lucide-react").BarChart3,
      label: "Relatórios",
      badge: notificationCount,
    },
    {
      href: "/dashboard/settings",
      icon: require("lucide-react").Settings,
      label: "Config",
    },
  ]
}
