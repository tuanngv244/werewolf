'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const { register, isLoading, error, setError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError(t('auth.fieldsRequired'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    await register(username, email, password);
    router.push('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐺</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-day-text">{t('auth.registerTitle')}</h1>
          <p className="text-day-muted mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            id="username"
            label={t('auth.username')}
            placeholder={t('auth.usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            id="email"
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            id="confirmPassword"
            label={t('auth.confirmPassword')}
            type="password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('auth.register')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-day-muted">
          {t('auth.hasAccount')}{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-primary font-semibold hover:underline"
          >
            {t('auth.login')}
          </button>
        </p>
      </Card>
    </main>
  );
}
