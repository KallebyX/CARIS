/**
 * Internationalization Configuration
 *
 * This file configures next-intl for the CÁRIS platform.
 * Supports Portuguese (pt-BR) and English (en-US).
 */

export const locales = ['pt-BR', 'en-US'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'pt-BR'

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
}

export const localeFlags: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
}
