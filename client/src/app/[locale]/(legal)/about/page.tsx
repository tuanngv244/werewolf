import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default function AboutPage() {
  const t = useTranslations('legal');

  const features = [
    t('aboutFeature1'),
    t('aboutFeature2'),
    t('aboutFeature3'),
    t('aboutFeature4'),
    t('aboutFeature5'),
    t('aboutFeature6'),
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-8"
      >
        <span>&#8592;</span> {t('backHome')}
      </Link>

      <h1 className="text-4xl font-heading font-bold text-day-text mb-4">
        {t('aboutTitle')}
      </h1>

      <p className="text-lg text-day-muted mb-10 leading-relaxed">
        {t('aboutIntro')}
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('aboutWhatTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('aboutWhatDesc')}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-3">
          {t('aboutWhyTitle')}
        </h2>
        <p className="text-day-text/80 leading-relaxed">{t('aboutWhyDesc')}</p>
      </section>

      <section>
        <h2 className="text-2xl font-heading font-semibold text-day-text mb-4">
          {t('aboutFeaturesTitle')}
        </h2>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-day-text/80">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
