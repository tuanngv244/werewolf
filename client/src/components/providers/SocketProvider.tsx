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

/**
 * Redirects the user to the /game page when a FRESH game starts.
 *
 * Uses `pendingGameRedirect` flag (set only on fresh game:started with INTRO/STARTING phase).
 * On reconnect (past INTRO/STARTING), the flag stays false → no redirect.
 * This prevents hijacking the user when they navigate away from /game to Home.
 */
function GameStartRedirect() {
  const router = useRouter();
  const pendingGameRedirect = useGameStore((s) => s.pendingGameRedirect);

  useEffect(() => {
    if (pendingGameRedirect) {
      // Clear the flag immediately so it doesn't re-fire
      useGameStore.setState({ pendingGameRedirect: false });
      router.push('/game');
    }
  }, [pendingGameRedirect, router]);

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
