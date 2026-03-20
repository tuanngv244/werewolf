import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default function PrivacyPage() {
  const t = useTranslations('legal');

  const uses = [
    t('privacyUse1'),
    t('privacyUse2'),
    t('privacyUse3'),
    t('privacyUse4'),
    t('privacyUse5'),
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
        {t('privacyTitle')}
      </h1>
      <p className="text-sm text-day-muted mb-6">{t('privacyEffective')}</p>

      <p className="text-day-text/80 leading-relaxed mb-10">
        {t('privacyIntro')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-4">
          {t('privacyCollectTitle')}
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-heading font-semibold text-day-text mb-1">
              {t('privacyCollect1Title')}
            </h3>
            <p className="text-day-text/80 leading-relaxed">{t('privacyCollect1Desc')}</p>
          </div>
          <div>
            <h3 className="font-heading font-semibold text-day-text mb-1">
              {t('privacyCollect2Title')}
            </h3>
            <p className="text-day-text/80 leading-relaxed">{t('privacyCollect2Desc')}</p>
          </div>
          <div>
            <h3 className="font-heading font-semibold text-day-text mb-1">
              {t('privacyCollect3Title')}
            </h3>
            <p className="text-day-text/80 leading-relaxed">{t('privacyCollect3Desc')}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyCookiesTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyCookiesDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyAdsTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed mb-3">{t('privacyAdsDesc')}</p>
        <p className="text-day-text/80 leading-relaxed mb-2">
          {t('privacyAdsOptOut')}{' '}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            {t('privacyAdsOptOutLink')}
          </a>
          .
        </p>
        <p className="text-day-text/80 leading-relaxed">
          {t('privacyAdsLearnMore')}{' '}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            {t('privacyAdsLearnMoreLink')}
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-4">
          {t('privacyUseTitle')}
        </h2>
        <ul className="space-y-2">
          {uses.map((use, i) => (
            <li key={i} className="flex items-start gap-3 text-day-text/80">
              <span className="text-primary mt-0.5">&#8226;</span>
              <span>{use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyShareTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyShareDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacySecurityTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacySecurityDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyChildrenTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyChildrenDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyRightsTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyRightsDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyConsentTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyConsentDesc')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyChangesTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('privacyChangesDesc')}</p>
      </section>

      <section>
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('privacyContactTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">
          {t('privacyContactDesc')}
        </p>
      </section>
    </main>
  );
}
