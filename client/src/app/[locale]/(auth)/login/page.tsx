'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { login, guestLogin, isLoading, error, setError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.fieldsRequired'));
      return;
    }
    await login(email, password);
    router.push('/');
  };

  const handleGuestPlay = async () => {
    await guestLogin();
    router.push('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐺</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-day-text">{t('auth.loginTitle')}</h1>
          <p className="text-day-muted mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && !email ? t('auth.fieldsRequired') : undefined}
          />
          <Input
            id="password"
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('auth.login')}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-day-border" />
          <span className="text-sm text-day-muted">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-day-border" />
        </div>

        <div className="mt-6 space-y-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGuestPlay}
            isLoading={isLoading}
          >
            {t('auth.guestPlay')}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-day-muted">
          {t('auth.noAccount')}{' '}
          <button
            onClick={() => router.push('/register')}
            className="text-primary font-semibold hover:underline"
          >
            {t('auth.register')}
          </button>
        </p>
      </Card>
    </main>
  );
}
