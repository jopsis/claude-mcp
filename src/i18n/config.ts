import { US, CN, TW, FlagComponent } from 'country-flag-icons/react/3x2'; 
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

export interface Language {
  code: string;
  name: string;
  icon: FlagComponent;
}

export const languagesWithFlags: Language[] = [
  { code: 'en', name: 'English', icon: US },
  { code: 'zh', name: '中文', icon: CN },
  { code: 'tw', name: '繁體中文', icon: TW },
]; 