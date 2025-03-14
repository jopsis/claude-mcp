export const locales = ['en', 'zh', 'tw'] as const
export type Locale = typeof locales[number]

export const defaultLocale = 'en' as const

export const pathnames = {
  '/': '/',
  '/docs': '/docs',
  '/docs/[slug]': '/docs/[slug]',
  '/blog': '/blog',
  '/community': '/community',
  '/specification': '/specification',
  '/servers': '/servers',
  '/servers/[id]': '/servers/[id]',
} as const

export type Pathnames = typeof pathnames

export const languages = {
  en: 'English',
  zh: '中文',
  tw: '繁體中文',
} as const
