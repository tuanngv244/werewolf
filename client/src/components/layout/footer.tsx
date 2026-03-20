import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export function Footer() {
  const t = useTranslations('footer');

  const links = [
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
  ] as const;

  return (
    <footer className="px-4 py-8 border-t border-day-border/50">
      <div className="max-w-4xl mx-auto">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-day-muted hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-day-muted text-sm">{t('copyright')}</p>
      </div>
    </footer>
  );
}
