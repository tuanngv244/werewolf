'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { useRouter } from '@/lib/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/game-store';

function SocketEventListener() {
  useSocket();
  return null;
}

function GameStartRedirect() {
  const router = useRouter();
  const gameId = useGameStore((s) => s.gameId);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (gameId && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/game');
    }
  }, [gameId, router]);

  // Reset when game is cleared
  useEffect(() => {
    if (!gameId) {
      hasRedirected.current = false;
    }
  }, [gameId]);

  return null;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      hydrate();
    }
  }, [hydrate]);

  // Re-connect socket if token exists but socket is disconnected
  useEffect(() => {
    if (token) {
      const socket = getSocket();
      if (!socket.connected) {
        socket.auth = { token };
        socket.connect();
      }
    }
  }, [token]);

  return (
    <>
      <SocketEventListener />
      <GameStartRedirect />
      {children}
    </>
  );
}
