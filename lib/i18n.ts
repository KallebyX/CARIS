/**
 * i18n Utilities
 *
 * This file provides helper functions and hooks for internationalization
 * using next-intl in the CÁRIS platform.
 */

'use client'

import { useTranslations as useNextIntlTranslations } from 'next-intl'
import { useLocale as useNextIntlLocale } from 'next-intl'
import { locales, type Locale } from '@/i18n.config'

/**
 * Hook to get translations for a specific namespace
 *
 * @example
 * const t = useTranslations('common')
 * return <button>{t('save')}</button>
 */
export const useTranslations = useNextIntlTranslations

/**
 * Hook to get the current locale
 *
 * @example
 * const locale = useLocale()
 * console.log(locale) // 'pt-BR' or 'en-US'
 */
export const useLocale = useNextIntlLocale

/**
 * Change locale by setting cookie (client-side)
 */
export function setLocale(locale: Locale): void {
  if (!locales.includes(locale)) {
    console.error(`Invalid locale: ${locale}`)
    return
  }

  // Set cookie
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax${
    window.location.protocol === 'https:' ? '; Secure' : ''
  }`

  // Reload page to apply locale
  window.location.reload()
}

/**
 * Get current locale from cookie (client-side)
 */
export function getLocale(): Locale {
  if (typeof document === 'undefined') {
    return 'pt-BR'
  }

  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/)
  const locale = match?.[1] as Locale | undefined

  return locale && locales.includes(locale) ? locale : 'pt-BR'
}
