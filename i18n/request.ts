/**
 * i18n Request Configuration
 *
 * This file configures how next-intl retrieves the locale
 * for each request in the CÁRIS platform.
 */

import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale } from '@/i18n.config'

export default getRequestConfig(async () => {
  // Get locale from cookie or use default
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined
  const locale = localeCookie || defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/Sao_Paulo',
    now: new Date(),
  }
})
