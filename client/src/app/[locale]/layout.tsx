import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales } from '@/lib/i18n';
import { SocketProvider } from '@/components/providers/SocketProvider';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure valid locale — fallback to default instead of notFound()
  // to prevent redirect loops when locale is invalid
  const validLocale = locales.includes(locale as 'en' | 'vi')
    ? locale
    : 'en';

  setRequestLocale(validLocale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={validLocale}>
      <SocketProvider>
        {children}
      </SocketProvider>
    </NextIntlClientProvider>
  );
}
