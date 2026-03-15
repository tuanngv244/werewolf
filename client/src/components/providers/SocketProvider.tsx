'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { useRouter } from '@/lib/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/game-store';
import { useRoomStore } from '@/stores/room-store';

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

/**
 * Watches for the roomDeletedByHost flag and redirects non-host players
 * to the rooms page when the host deletes a room they were in.
 */
function RoomDeletedRedirect() {
  const router = useRouter();
  const roomDeletedByHost = useRoomStore((s) => s.roomDeletedByHost);
  const setRoomDeletedByHost = useRoomStore((s) => s.setRoomDeletedByHost);

  useEffect(() => {
    if (roomDeletedByHost) {
      // Clear the flag before navigating to avoid re-triggering
      setRoomDeletedByHost(false);
      router.push('/rooms');
    }
  }, [roomDeletedByHost, setRoomDeletedByHost, router]);

  return null;
}

/**
 * Watches for the roomKicked flag and redirects the kicked player
 * to the rooms page.
 */
function RoomKickedRedirect() {
  const router = useRouter();
  const roomKicked = useRoomStore((s) => s.roomKicked);
  const setRoomKicked = useRoomStore((s) => s.setRoomKicked);

  useEffect(() => {
    if (roomKicked) {
      setRoomKicked(false);
      router.push('/rooms');
    }
  }, [roomKicked, setRoomKicked, router]);

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
      <RoomDeletedRedirect />
      <RoomKickedRedirect />
      {children}
    </>
  );
}
