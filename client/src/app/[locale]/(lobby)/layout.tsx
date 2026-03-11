export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-day-bg text-day-text">
      {children}
    </div>
  );
}
