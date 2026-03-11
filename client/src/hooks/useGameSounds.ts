'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useChatStore } from '@/stores/chat-store';
import { useUiStore } from '@/stores/ui-store';
import { playSound } from '@/lib/sounds';
import { GamePhase, Team } from '@shared/types/game.types';

/**
 * Hook that listens to game state changes and plays appropriate sound effects.
 * Should be called once in the game page root component.
 */
export function useGameSounds() {
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevChatCountRef = useRef(0);
  const prevDeadCountRef = useRef(0);
  const prevWinnersRef = useRef<{ team: Team } | null>(null);
  const prevSeerRef = useRef(false);
  const prevAuraSeerRef = useRef(false);
  const prevWolfSeerRef = useRef(false);
  const prevNightActionRef = useRef(false);
  const prevVoteCountRef = useRef(0);
  const prevRoleRef = useRef<string | null>(null);

  // Subscribe to game store for phase changes, deaths, wins, actions
  useEffect(() => {
    const unsubscribeGame = useGameStore.subscribe((state, prevState) => {
      const isSoundEnabled = useUiStore.getState().isSoundEnabled;
      if (!isSoundEnabled) return;

      // ── Phase change sounds ──
      if (state.phase !== prevPhaseRef.current) {
        const prev = prevPhaseRef.current;
        prevPhaseRef.current = state.phase;

        switch (state.phase) {
          case GamePhase.STARTING:
            playSound('gameStart');
            break;
          case GamePhase.NIGHT:
            playSound('nightFall');
            break;
          case GamePhase.DAWN:
            playSound('dawn');
            break;
          case GamePhase.DAY:
            playSound('dayStart');
            break;
          case GamePhase.VOTE:
            playSound('voteStart');
            break;
          case GamePhase.VOTE_RESULT:
            playSound('voteResult');
            break;
          case GamePhase.LAST_WORDS:
            playSound('lastWords');
            break;
          case GamePhase.GAME_OVER:
            // Game over sound is handled by winners check below
            break;
        }
      }

      // ── Role reveal sound ──
      if (state.myRole && state.myRole !== prevRoleRef.current) {
        prevRoleRef.current = state.myRole;
        // Small delay so it doesn't overlap with game start
        setTimeout(() => {
          if (useUiStore.getState().isSoundEnabled) {
            playSound('roleReveal');
          }
        }, 600);
      }

      // ── Player death sounds ──
      const deadCount = state.players.filter(p => !p.isAlive).length;
      if (deadCount > prevDeadCountRef.current) {
        // Check if it was from dawn result (werewolf kill)
        if (state.nightResult && state.nightResult.killed.length > 0) {
          playSound('werewolfKill');
        } else {
          playSound('death');
        }

        // Check if saved players exist in dawn
        if (state.nightResult && state.nightResult.saved.length > 0) {
          setTimeout(() => {
            if (useUiStore.getState().isSoundEnabled) {
              playSound('heal');
            }
          }, 500);
        }
      }
      prevDeadCountRef.current = deadCount;

      // ── Winners / Game Over ──
      if (state.winners && !prevWinnersRef.current) {
        const myTeam = state.myTeam;
        const winningTeam = state.winners.team;
        // Check if player won
        if (myTeam && winningTeam === myTeam) {
          playSound('victory');
        } else {
          playSound('defeat');
        }
      }
      prevWinnersRef.current = state.winners;

      // ── Seer result sounds ──
      if (state.seerResult && !prevSeerRef.current) {
        playSound('seerReveal');
      }
      prevSeerRef.current = !!state.seerResult;

      if (state.auraSeerResult && !prevAuraSeerRef.current) {
        playSound('seerReveal');
      }
      prevAuraSeerRef.current = !!state.auraSeerResult;

      if (state.werewolfSeerResult && !prevWolfSeerRef.current) {
        playSound('seerReveal');
      }
      prevWolfSeerRef.current = !!state.werewolfSeerResult;

      // ── Night action confirmed ──
      if (state.nightActionDone && !prevNightActionRef.current) {
        playSound('actionConfirm');
      }
      prevNightActionRef.current = state.nightActionDone;

      // ── Vote updates (someone cast a vote) ──
      if (state.voteState?.votes) {
        const voteCount = Object.keys(state.voteState.votes).length;
        if (voteCount > prevVoteCountRef.current) {
          playSound('voteCast');
        }
        prevVoteCountRef.current = voteCount;
      } else {
        prevVoteCountRef.current = 0;
      }
    });

    return unsubscribeGame;
  }, []);

  // Subscribe to chat store for message ping sounds
  useEffect(() => {
    const unsubscribeChat = useChatStore.subscribe((state) => {
      const isSoundEnabled = useUiStore.getState().isSoundEnabled;
      if (!isSoundEnabled) return;

      const msgs = state.messages;
      if (msgs.length > prevChatCountRef.current) {
        const newMsgs = msgs.slice(prevChatCountRef.current);
        // Only play ping for non-system messages from other players
        const hasPlayerMessage = newMsgs.some(m => !m.isSystem);
        if (hasPlayerMessage) {
          playSound('chatPing');
        }
      }
      prevChatCountRef.current = msgs.length;
    });

    return unsubscribeChat;
  }, []);
}
