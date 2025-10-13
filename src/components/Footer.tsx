import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Link as I18nLink } from '@/i18n/routing'
import { type Pathnames } from '@/i18n/config'
import Image from 'next/image'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')

  const navigation = {
    community: [
      { name: t('links.github'), href: 'https://github.com/cnych/claude-mcp' },
      { name: tNav('playground'), href: '/playground' as keyof Pathnames },
      { name: tNav('inspector'), href: '/inspector' as keyof Pathnames },
      { name: tNav('documentation'), href: '/docs' as keyof Pathnames },
      { name: tNav('specification'), href: '/specification' as keyof Pathnames },
      { name: tNav('blog'), href: '/blog' as keyof Pathnames },
      { name: t('sections.resources'), href: '/resources' as keyof Pathnames },
    ],
    contact: [
      { name: 'X', href: 'https://x.com/cnych' },
      { name: 'Email', href: 'mailto:icnych@gmail.com' },
      { name: 'Github', href: 'https://github.com/cnych' },
      { name: 'Cal.com', href: 'https://cal.com/cnych' },
      { name: 'Linktree', href: 'https://linktr.ee/1mo' },
      { name: 'Hugging Face', href: 'https://huggingface.co/1bo'},
      { name: 'HackMD', href: 'https://hackmd.io/@cnych'}
    ],
    hotMcp: [
      { name: 'SEO MCP', href: '/servers/seo-mcp' },
      { name: 'Figma Context MCP', href: '/servers/figma-context-mcp' },
      { name: 'Blender MCP', href: '/servers/blender-mcp' },
      { name: 'MarkItDown MCP', href: '/servers/markitdown-mcp' },
      { name: 'Google Drive', href: '/servers/gdrive' },
      { name: 'Filesystem MCP', href: '/servers/filesystem' },
      { name: 'Bright Data', href: '/servers/brightdata' },
      { name: 'MCP Feedback Enhanced', href: '/servers/mcp-feedback-enhanced' },
      { name: '...', href: '/servers' },
    ]
  }

  return (
    <footer className="border-t bg-background/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-4">
            <Link href="/" className="text-xl font-bold flex flex-row items-center gap-2">
              <Image src="/logo.png" alt="Claude MCP" width={27} height={27} />
              {tNav('title')}
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('description')}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold">{t('sections.community')}</h3>
                <ul role="list" className="mt-4 space-y-4">
                  {navigation.community.map((item) => (
                    <li key={item.name}>
                      <I18nLink
                        href={item.href as any}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.name}
                      </I18nLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold">{t('sections.contact')}</h3>
                <ul role="list" className="mt-4 space-y-4">
                  {navigation.contact.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('sections.hotMcp')}</h3>
              <ul role="list" className="mt-4 space-y-4 max-h-[200px] overflow-y-auto">
                {navigation.hotMcp.map((item) => (
                  <li key={item.name}>
                    <I18nLink
                      href={item.href as any}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </I18nLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Claude MCP Community.
            </p>
            &nbsp;&nbsp;
            <Link href="/sitemap.xml" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sitemap.xml
            </Link>
            &nbsp;&nbsp;
            <Link href="/llms.txt" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              llms.txt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 