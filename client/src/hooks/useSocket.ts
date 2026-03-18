'use client';

import { useEffect, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/game-store';
import { useRoomStore } from '@/stores/room-store';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { GamePhase } from '@shared/types/game.types';
import { isWerewolfRole } from '@shared/constants/roles';
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
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const removeRoom = useRoomStore((s) => s.removeRoom);
  const setRoomDeletedByHost = useRoomStore((s) => s.setRoomDeletedByHost);
  const setRoomKicked = useRoomStore((s) => s.setRoomKicked);

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
  const setWitchAttackedTarget = useGameStore((s) => s.setWitchAttackedTarget);
  const setWitchPotionState = useGameStore((s) => s.setWitchPotionState);

  const addDeathLogEntry = useGameStore((s) => s.addDeathLogEntry);

  const addMessage = useChatStore((s) => s.addMessage);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  useEffect(() => {
    const socket: Socket = getSocket();

    // Named handler references so cleanup removes only THIS instance's listeners
    const handleRoomState = (room: any) => setCurrentRoom(room);
    const handlePlayerJoined = (player: any) => updateRoomPlayer(player);
    const handlePlayerLeft = ({ playerId }: any) => removeRoomPlayer(playerId);
    const handlePlayerDisconnected = ({ playerId }: any) => {
      // Mark player as disconnected in room store
      const room = useRoomStore.getState().currentRoom;
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          updateRoomPlayer({ ...player, isConnected: false });
        }
      }
    };
    const handlePlayerReconnected = ({ playerId }: any) => {
      // Mark player as reconnected in room store
      const room = useRoomStore.getState().currentRoom;
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          updateRoomPlayer({ ...player, isConnected: true });
        }
      }
    };
    const handleSettingsUpdated = (settings: any) => updateRoomSettings(settings);
    const handleRoomError = (err: any) => {
      console.warn('[socket] room:error:', err?.message);
    };
    const handleRoomDeleted = () => {
      // Set flag first so the redirect component can pick it up
      setRoomDeletedByHost(true);
      leaveRoom();
    };
    const handleRoomKicked = () => {
      // Set flag so the redirect component can pick it up
      setRoomKicked(true);
      leaveRoom();
    };
    const handleRoomRemoved = ({ code }: { code: string }) => {
      removeRoom(code);
    };
    const handleGameStarted = ({ gameId, players, timers, phase, phaseEndAt, roleList }: any) => {
      setGame(gameId, players, timers, phase, phaseEndAt, roleList);
      // Store the current room code for post-game navigation
      const roomCode = useRoomStore.getState().currentRoom?.code;
      if (roomCode) {
        useGameStore.setState({ lastRoomCode: roomCode });
      }
    };
    const handleRoleAssigned = ({ role, team, headhunterTarget }: any) => {
      setMyRole(role, team, headhunterTarget);
    };
    const handlePhaseChanged = ({ phase, endAt, round }: any) => {
      setPhase(phase, endAt, round);
      // Auto-switch wolves to WEREWOLF chat channel when NIGHT starts
      const gameState = useGameStore.getState();
      if (phase === GamePhase.NIGHT && gameState.myRole && isWerewolfRole(gameState.myRole) && gameState.isAlive) {
        setActiveChannel('WEREWOLF');
      } else if (phase === GamePhase.DAY || phase === GamePhase.DAWN) {
        // Switch back to DAY chat when leaving night
        setActiveChannel('DAY');
      }
    };
    const handleDawnResult = (result: any) => {
      setNightResult(result);
      if (result.killed && Array.isArray(result.killed)) {
        // Read player names BEFORE mutating store — updatePlayer changes the store
        // and the player may no longer be findable after mutation
        const currentPlayers = useGameStore.getState().players;
        const currentRound = useGameStore.getState().round;
        const playerNames = new Map<string, string>();
        for (const killedId of result.killed) {
          const player = currentPlayers.find((p) => p.id === killedId);
          playerNames.set(killedId, player?.username || 'Unknown');
        }
        for (const killedId of result.killed) {
          updatePlayer(killedId, { isAlive: false });
          addDeathLogEntry({
            playerId: killedId,
            playerName: playerNames.get(killedId) || 'Unknown',
            cause: 'night',
            round: currentRound,
            phase: 'DAWN',
          });
        }
      }
      const userId = useAuthStore.getState().user?.id;
      if (userId && result.killed && result.killed.includes(userId)) {
        setIsAlive(false);
        setActiveChannel('DEAD');
      }
    };
    const handleVoteUpdate = (voteState: any) => {
      setVoteState(voteState);
    };
    const handleVoteResult = (result: any) => {
      setVoteState({ votes: {}, result });
      if (result.eliminatedId) {
        // Read player name BEFORE mutating store
        const currentPlayers = useGameStore.getState().players;
        const currentRound = useGameStore.getState().round;
        const player = currentPlayers.find((p) => p.id === result.eliminatedId);
        const playerName = player?.username || 'Unknown';
        updatePlayer(result.eliminatedId, { isAlive: false });
        addDeathLogEntry({
          playerId: result.eliminatedId,
          playerName,
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
    };
    const handlePlayerDied = ({ playerId, cause }: any) => {
      // Read player name BEFORE mutating store
      const currentPlayers = useGameStore.getState().players;
      const currentRound = useGameStore.getState().round;
      const phase = useGameStore.getState().phase;
      const player = currentPlayers.find((p) => p.id === playerId);
      const playerName = player?.username || 'Unknown';
      updatePlayer(playerId, { isAlive: false });
      addDeathLogEntry({
        playerId,
        playerName,
        cause: cause || 'unknown',
        round: currentRound,
        phase: phase || 'UNKNOWN',
      });
      const userId = useAuthStore.getState().user?.id;
      if (userId && playerId === userId) {
        setIsAlive(false);
        setActiveChannel('DEAD');
      }
    };
    const handleGameOver = ({ winningTeam, winners, winCondition, players: revealedPlayers, gameLog, rounds, duration }: any) => {
      setWinners(winningTeam, winners, winCondition, revealedPlayers, gameLog, rounds, duration);
    };
    const handleSeerResult = (result: any) => {
      setSeerResult(result);
    };
    const handleAuraSeerResult = (result: any) => {
      setAuraSeerResult(result);
    };
    const handleWerewolfSeerResult = (result: any) => {
      setWerewolfSeerResult(result);
    };
    const handleWerewolfTeam = ({ wolves }: any) => {
      setWerewolfTeam(wolves);
      // If receiving werewolf team info during NIGHT (e.g., Cursed transformation),
      // auto-switch to WEREWOLF chat channel
      const gameState = useGameStore.getState();
      if (gameState.phase === GamePhase.NIGHT && gameState.isAlive) {
        setActiveChannel('WEREWOLF');
      }
    };
    const handleWitchTarget = ({ targetId, hasHealPotion, hasKillPotion }: any) => {
      setWitchAttackedTarget(targetId);
      // Update potion availability if server sent it
      if (hasHealPotion !== undefined && hasKillPotion !== undefined) {
        setWitchPotionState(hasHealPotion, hasKillPotion);
      }
    };
    const handleGunnerShot = ({ targetId }: any) => {
      // Read player name BEFORE mutating store
      const currentPlayers = useGameStore.getState().players;
      const currentRound = useGameStore.getState().round;
      const player = currentPlayers.find((p) => p.id === targetId);
      const playerName = player?.username || 'Unknown';
      updatePlayer(targetId, { isAlive: false });
      addDeathLogEntry({
        playerId: targetId,
        playerName,
        cause: 'gunner',
        round: currentRound,
        phase: 'DAY',
      });
      const userId = useAuthStore.getState().user?.id;
      if (userId && targetId === userId) {
        setIsAlive(false);
        setActiveChannel('DEAD');
      }
    };
    const handleActionConfirmed = () => {
      // Action was confirmed by server
    };
    const handleChatMessage = (message: any) => {
      addMessage(message);
    };

    function registerListeners() {
      socket.on('room:state', handleRoomState);
      socket.on('room:player_joined', handlePlayerJoined);
      socket.on('room:player_left', handlePlayerLeft);
      socket.on('room:player_disconnected', handlePlayerDisconnected);
      socket.on('room:player_reconnected', handlePlayerReconnected);
      socket.on('room:settings_updated', handleSettingsUpdated);
      socket.on('room:error', handleRoomError);
      socket.on('room:deleted', handleRoomDeleted);
      socket.on('room:kicked', handleRoomKicked);
      socket.on('room:removed', handleRoomRemoved);
      socket.on('game:started', handleGameStarted);
      socket.on('game:role_assigned', handleRoleAssigned);
      socket.on('game:phase_changed', handlePhaseChanged);
      socket.on('game:dawn_result', handleDawnResult);
      socket.on('game:vote_update', handleVoteUpdate);
      socket.on('game:vote_result', handleVoteResult);
      socket.on('game:player_died', handlePlayerDied);
      socket.on('game:over', handleGameOver);
      socket.on('game:seer_result', handleSeerResult);
      socket.on('game:aura_seer_result', handleAuraSeerResult);
      socket.on('game:werewolf_seer_result', handleWerewolfSeerResult);
      socket.on('game:werewolf_team', handleWerewolfTeam);
      socket.on('game:witch_target', handleWitchTarget);
      socket.on('game:gunner_shot', handleGunnerShot);
      socket.on('game:action_confirmed', handleActionConfirmed);
      socket.on('chat:message', handleChatMessage);
    }

    function cleanupListeners() {
      socket.off('room:state', handleRoomState);
      socket.off('room:player_joined', handlePlayerJoined);
      socket.off('room:player_left', handlePlayerLeft);
      socket.off('room:player_disconnected', handlePlayerDisconnected);
      socket.off('room:player_reconnected', handlePlayerReconnected);
      socket.off('room:settings_updated', handleSettingsUpdated);
      socket.off('room:error', handleRoomError);
      socket.off('room:deleted', handleRoomDeleted);
      socket.off('room:kicked', handleRoomKicked);
      socket.off('room:removed', handleRoomRemoved);
      socket.off('game:started', handleGameStarted);
      socket.off('game:role_assigned', handleRoleAssigned);
      socket.off('game:phase_changed', handlePhaseChanged);
      socket.off('game:dawn_result', handleDawnResult);
      socket.off('game:vote_update', handleVoteUpdate);
      socket.off('game:vote_result', handleVoteResult);
      socket.off('game:player_died', handlePlayerDied);
      socket.off('game:over', handleGameOver);
      socket.off('game:seer_result', handleSeerResult);
      socket.off('game:aura_seer_result', handleAuraSeerResult);
      socket.off('game:werewolf_seer_result', handleWerewolfSeerResult);
      socket.off('game:werewolf_team', handleWerewolfTeam);
      socket.off('game:witch_target', handleWitchTarget);
      socket.off('game:gunner_shot', handleGunnerShot);
      socket.off('game:action_confirmed', handleActionConfirmed);
      socket.off('chat:message', handleChatMessage);
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
    leaveRoom,
    removeRoom,
    setRoomDeletedByHost,
    setRoomKicked,
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
    setWitchAttackedTarget,
    setWitchPotionState,
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
