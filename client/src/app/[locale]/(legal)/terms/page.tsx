import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default function TermsPage() {
  const t = useTranslations('legal');

  const conductRules = [
    t('termsConduct1'),
    t('termsConduct2'),
    t('termsConduct3'),
    t('termsConduct4'),
    t('termsConduct5'),
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-8"
      >
        <span>&#8592;</span> {t('backHome')}
      </Link>

      <h1 className="text-4xl font-heading font-bold text-day-text mb-2">
        {t('termsTitle')}
      </h1>
      <p className="text-sm text-day-muted mb-6">{t('termsEffective')}</p>

      <p className="text-day-text/80 leading-relaxed mb-10">
        {t('termsIntro')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsAcceptTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsAcceptDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsAccountTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsAccountDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsConduct')}
        </h2>
        <p className="text-day-text/80 leading-relaxed mb-3">{t('termsConductDesc')}</p>
        <ul className="space-y-2">
          {conductRules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-day-text/80">
              <span className="text-danger mt-0.5">&#10007;</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsIPTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsIPDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsDisclaimerTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsDisclaimerDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsLiabilityTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsLiabilityDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsTerminationTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsTerminationDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsChangesTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsChangesDesc')}</p>
      </section>

      <section>
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('termsContactTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('termsContactDesc')}</p>
      </section>
    </main>
  );
}
