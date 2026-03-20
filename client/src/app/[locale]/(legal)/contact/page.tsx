import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default function ContactPage() {
  const t = useTranslations('legal');

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-8"
      >
        <span>&#8592;</span> {t('backHome')}
      </Link>

      <h1 className="text-4xl font-heading font-bold text-day-text mb-4">
        {t('contactTitle')}
      </h1>

      <p className="text-lg text-day-muted mb-10 leading-relaxed">
        {t('contactIntro')}
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('contactEmailTitle')}
        </h2>
        <a
          href={`mailto:${t('contactEmail')}`}
          className="text-primary hover:text-primary/80 transition-colors text-lg"
        >
          {t('contactEmail')}
        </a>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('contactSocialTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">
          {t('contactSocialDesc')}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('contactFeedbackTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">
          {t('contactFeedbackDesc')}
        </p>
      </section>
    </main>
  );
}
