'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useVoiceStore } from '@/stores/voice-store';
import { useGameStore } from '@/stores/game-store';
import { useAuthStore } from '@/stores/auth-store';

interface PeerConnection {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Hook to manage WebRTC voice chat in a game room.
 * - Requests microphone via getUserMedia
 * - Creates peer connections for each player in the room
 * - Exchanges SDP offers/answers and ICE candidates via socket
 * - Respects voice store state (isMicOn, isListening)
 * - Auto-mutes mic when player is dead
 */
export function useVoiceChat(roomCode: string | null) {
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isMicOn = useVoiceStore((s) => s.isMicOn);
  const isListening = useVoiceStore((s) => s.isListening);
  const setMicAllowed = useVoiceStore((s) => s.setMicAllowed);
  const setMicOn = useVoiceStore((s) => s.setMicOn);
  const isAlive = useGameStore((s) => s.isAlive);
  const userId = useAuthStore((s) => s.user?.id);

  // Track values in refs for use in callbacks
  const isMicOnRef = useRef(isMicOn);
  const isListeningRef = useRef(isListening);
  const isAliveRef = useRef(isAlive);
  const roomCodeRef = useRef(roomCode);

  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isAliveRef.current = isAlive; }, [isAlive]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Auto-disable mic when player dies
  useEffect(() => {
    if (!isAlive) {
      setMicOn(false);
    }
  }, [isAlive, setMicOn]);

  // Toggle mic track enabled state
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const effectiveMic = isMicOn && isAlive;
    for (const track of stream.getAudioTracks()) {
      track.enabled = effectiveMic;
    }
  }, [isMicOn, isAlive]);

  // Toggle remote audio volume
  useEffect(() => {
    for (const [, peer] of peersRef.current) {
      peer.audioEl.muted = !isListening;
    }
  }, [isListening]);

  // Create a new peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    // Handle remote audio
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.muted = !isListeningRef.current;

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        audioEl.srcObject = e.streams[0];
      }
    };

    // ICE candidate exchange
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice:ice-candidate', {
          targetId: remoteUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, { pc, audioEl });
    return pc;
  }, []);

  const removePeer = useCallback((remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.pc.close();
      peer.audioEl.srcObject = null;
      peersRef.current.delete(remoteUserId);
    }
  }, []);

  // Initialize voice chat
  useEffect(() => {
    if (!roomCode || !userId) return;

    const socket = getSocket();
    let mounted = true;

    async function init() {
      // Request microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setMicAllowed(true);

        // Start with mic off
        for (const track of stream.getAudioTracks()) {
          track.enabled = false;
        }

        // Announce to room that we joined voice
        socket.emit('voice:join', { roomCode });
      } catch {
        if (mounted) {
          setMicAllowed(false);
        }
      }
    }

    // Socket event listeners for WebRTC signaling
    const handleVoiceJoined = async ({ userId: remoteId }: { userId: string }) => {
      if (remoteId === userId || !localStreamRef.current) return;

      // Create offer for the new peer
      const pc = createPeerConnection(remoteId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:offer', {
          targetId: remoteId,
          sdp: pc.localDescription?.toJSON(),
        });
      } catch (err) {
        console.warn('[voice] Failed to create offer:', err);
      }
    };

    const handleVoiceOffer = async ({
      fromId,
      sdp,
    }: {
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (fromId === userId) return;

      // We receive an offer, create answer
      let pc = peersRef.current.get(fromId)?.pc;
      if (!pc) {
        pc = createPeerConnection(fromId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', {
          targetId: fromId,
          sdp: pc.localDescription?.toJSON(),
        });
      } catch (err) {
        console.warn('[voice] Failed to handle offer:', err);
      }
    };

    const handleVoiceAnswer = async ({
      fromId,
      sdp,
    }: {
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const peer = peersRef.current.get(fromId);
      if (!peer) return;

      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.warn('[voice] Failed to handle answer:', err);
      }
    };

    const handleIceCandidate = async ({
      fromId,
      candidate,
    }: {
      fromId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const peer = peersRef.current.get(fromId);
      if (!peer) return;

      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[voice] Failed to add ICE candidate:', err);
      }
    };

    const handleVoiceLeft = ({ userId: remoteId }: { userId: string }) => {
      removePeer(remoteId);
    };

    socket.on('voice:joined', handleVoiceJoined);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:left', handleVoiceLeft);

    init();

    return () => {
      mounted = false;

      // Leave voice chat
      socket.emit('voice:leave', { roomCode });

      // Cleanup socket listeners
      socket.off('voice:joined', handleVoiceJoined);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:left', handleVoiceLeft);

      // Close all peer connections
      for (const [id] of peersRef.current) {
        removePeer(id);
      }
      peersRef.current.clear();

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomCode, userId, createPeerConnection, removePeer, setMicAllowed]);

  return {
    peerCount: peersRef.current.size,
  };
}
