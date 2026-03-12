'use client';

import { useEffect, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/game-store';
import { useRoomStore } from '@/stores/room-store';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getSocket().connected;
  });

  // Use individual selectors for stable references
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);
  const updateRoomPlayer = useRoomStore((s) => s.updateRoomPlayer);
  const removeRoomPlayer = useRoomStore((s) => s.removeRoomPlayer);
  const updateRoomSettings = useRoomStore((s) => s.updateRoomSettings);

  const setGame = useGameStore((s) => s.setGame);
  const setMyRole = useGameStore((s) => s.setMyRole);
  const setPhase = useGameStore((s) => s.setPhase);
  const setNightResult = useGameStore((s) => s.setNightResult);
  const setVoteState = useGameStore((s) => s.setVoteState);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const setWinners = useGameStore((s) => s.setWinners);
  const setSeerResult = useGameStore((s) => s.setSeerResult);
  const setAuraSeerResult = useGameStore((s) => s.setAuraSeerResult);
  const setWerewolfSeerResult = useGameStore((s) => s.setWerewolfSeerResult);
  const setWerewolfTeam = useGameStore((s) => s.setWerewolfTeam);
  const setIsAlive = useGameStore((s) => s.setIsAlive);

  const addDeathLogEntry = useGameStore((s) => s.addDeathLogEntry);

  const addMessage = useChatStore((s) => s.addMessage);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  useEffect(() => {
    const socket: Socket = getSocket();

    function registerListeners() {
      // Room events
      socket.on('room:state', (room) => setCurrentRoom(room));
      socket.on('room:player_joined', (player) => updateRoomPlayer(player));
      socket.on('room:player_left', ({ playerId }) => removeRoomPlayer(playerId));
      socket.on('room:settings_updated', (settings) => updateRoomSettings(settings));

      // Room errors
      socket.on('room:error', (err) => {
        // room:error is handled by page-level socket.once listeners
        // this is a fallback — store it if needed
        console.warn('[socket] room:error:', err?.message);
      });

      // Game events
      socket.on('game:started', ({ gameId, players, timers, phase, phaseEndAt, roleList }) => {
        setGame(gameId, players, timers, phase, phaseEndAt, roleList);
      });

      socket.on('game:role_assigned', ({ role, team, headhunterTarget }) => {
        setMyRole(role, team, headhunterTarget);
      });

      socket.on('game:phase_changed', ({ phase, endAt, round }) => {
        setPhase(phase, endAt, round);
      });

      socket.on('game:dawn_result', (result) => {
        setNightResult(result);
        // Mark ALL killed players as dead in the store + log deaths
        if (result.killed && Array.isArray(result.killed)) {
          const currentPlayers = useGameStore.getState().players;
          const currentRound = useGameStore.getState().round;
          for (const killedId of result.killed) {
            updatePlayer(killedId, { isAlive: false });
            const player = currentPlayers.find((p) => p.id === killedId);
            addDeathLogEntry({
              playerId: killedId,
              playerName: player?.username || 'Unknown',
              cause: 'night',
              round: currentRound,
              phase: 'DAWN',
            });
          }
        }
        // Check if local player was killed in dawn results
        const userId = useAuthStore.getState().user?.id;
        if (userId && result.killed && result.killed.includes(userId)) {
          setIsAlive(false);
          setActiveChannel('DEAD');
        }
      });

      socket.on('game:vote_update', (voteState) => {
        setVoteState(voteState);
      });

      socket.on('game:vote_result', (result) => {
        setVoteState({ votes: {}, result });
        // Mark eliminated player as dead + log death
        if (result.eliminatedId) {
          updatePlayer(result.eliminatedId, { isAlive: false });
          const currentPlayers = useGameStore.getState().players;
          const currentRound = useGameStore.getState().round;
          const player = currentPlayers.find((p) => p.id === result.eliminatedId);
          addDeathLogEntry({
            playerId: result.eliminatedId,
            playerName: player?.username || 'Unknown',
            cause: 'voted',
            round: currentRound,
            phase: 'VOTE',
          });
          const userId = useAuthStore.getState().user?.id;
          if (userId && result.eliminatedId === userId) {
            setIsAlive(false);
            setActiveChannel('DEAD');
          }
        }
      });

      socket.on('game:player_died', ({ playerId }) => {
        updatePlayer(playerId, { isAlive: false });
        // Check if local player died
        const userId = useAuthStore.getState().user?.id;
        if (userId && playerId === userId) {
          setIsAlive(false);
          setActiveChannel('DEAD');
        }
      });

      socket.on('game:over', ({ winningTeam, winners }) => {
        setWinners(winningTeam, winners);
      });

      // Seer results
      socket.on('game:seer_result', (result) => {
        setSeerResult(result);
      });

      socket.on('game:aura_seer_result', (result) => {
        setAuraSeerResult(result);
      });

      socket.on('game:werewolf_seer_result', (result) => {
        setWerewolfSeerResult(result);
      });

      socket.on('game:werewolf_team', ({ wolves }) => {
        setWerewolfTeam(wolves);
      });

      socket.on('game:gunner_shot', ({ targetId }) => {
        updatePlayer(targetId, { isAlive: false });
        const currentPlayers = useGameStore.getState().players;
        const currentRound = useGameStore.getState().round;
        const player = currentPlayers.find((p) => p.id === targetId);
        addDeathLogEntry({
          playerId: targetId,
          playerName: player?.username || 'Unknown',
          cause: 'gunner',
          round: currentRound,
          phase: 'DAY',
        });
        const userId = useAuthStore.getState().user?.id;
        if (userId && targetId === userId) {
          setIsAlive(false);
          setActiveChannel('DEAD');
        }
      });

      socket.on('game:action_confirmed', () => {
        // Action was confirmed by server
      });

      // Chat events
      socket.on('chat:message', (message) => {
        addMessage(message);
      });
    }

    function cleanupListeners() {
      socket.off('room:state');
      socket.off('room:player_joined');
      socket.off('room:player_left');
      socket.off('room:settings_updated');
      socket.off('room:error');
      socket.off('game:started');
      socket.off('game:role_assigned');
      socket.off('game:phase_changed');
      socket.off('game:dawn_result');
      socket.off('game:vote_update');
      socket.off('game:vote_result');
      socket.off('game:player_died');
      socket.off('game:over');
      socket.off('game:seer_result');
      socket.off('game:aura_seer_result');
      socket.off('game:werewolf_seer_result');
      socket.off('game:werewolf_team');
      socket.off('game:gunner_shot');
      socket.off('game:action_confirmed');
      socket.off('chat:message');
    }

    // Track connection state
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Register listeners immediately — socket.io buffers events if not yet connected,
    // and listeners need to be there when connection completes
    registerListeners();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      cleanupListeners();
    };
  }, [
    setCurrentRoom,
    updateRoomPlayer,
    removeRoomPlayer,
    updateRoomSettings,
    setGame,
    setMyRole,
    setPhase,
    setNightResult,
    setVoteState,
    updatePlayer,
    setWinners,
    setSeerResult,
    setAuraSeerResult,
    setWerewolfSeerResult,
    setWerewolfTeam,
    setIsAlive,
    addDeathLogEntry,
    addMessage,
    setActiveChannel,
  ]);

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = getSocket();
    socket.emit(event, data);
  }, []);

  return { emit, isConnected };
}

/**
 * Lightweight hook that only provides emit() without registering socket listeners.
 * Use this in child components that need to send events but should NOT register
 * duplicate socket.on() listeners (which causes duplicate state updates).
 * Only one component (typically the page root) should call useSocket().
 */
export function useEmit() {
  const emit = useCallback((event: string, data?: unknown) => {
    const socket = getSocket();
    socket.emit(event, data);
  }, []);

  return { emit };
}
