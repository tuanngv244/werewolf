import { Footer } from '@/components/layout';

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-day-bg text-day-text flex flex-col">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
