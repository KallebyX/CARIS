/**
 * LocaleSwitcher Component
 *
 * Dropdown component to switch between available locales (languages).
 * Uses cookies to persist user preference and triggers page reload.
 */

'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronDown, Globe, Loader2 } from 'lucide-react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n.config'
import { setLocale, useLocale } from '@/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface LocaleSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline'
  showLabel?: boolean
  align?: 'start' | 'center' | 'end'
}

export function LocaleSwitcher({
  variant = 'ghost',
  showLabel = false,
  align = 'end',
}: LocaleSwitcherProps) {
  const currentLocale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  function handleLocaleChange(newLocale: Locale) {
    if (newLocale === currentLocale) return

    startTransition(() => {
      setLocale(newLocale)
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Globe className="h-4 w-4" />
              {showLabel && (
                <>
                  <span className="hidden md:inline">
                    {localeNames[currentLocale]}
                  </span>
                  <span className="md:hidden">{localeFlags[currentLocale]}</span>
                </>
              )}
              {!showLabel && <span>{localeFlags[currentLocale]}</span>}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            disabled={isPending}
            className="gap-2"
          >
            <span className="text-lg">{localeFlags[locale]}</span>
            <span className="flex-1">{localeNames[locale]}</span>
            {locale === currentLocale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact LocaleSwitcher for mobile navigation
 */
export function LocaleSwitcherCompact() {
  return <LocaleSwitcher variant="ghost" showLabel={false} align="end" />
}

/**
 * LocaleSwitcher with full label for desktop navigation
 */
export function LocaleSwitcherFull() {
  return <LocaleSwitcher variant="ghost" showLabel={true} align="end" />
}
