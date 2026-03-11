import type { Metadata } from 'next';
import { Nunito, Fredoka } from 'next/font/google';
import '@/styles/globals.css';

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-nunito',
  display: 'swap',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Werewolf Game | Ma Soi',
  description: 'A real-time multiplayer social deduction game with cute 3D characters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${nunito.variable} ${fredoka.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
