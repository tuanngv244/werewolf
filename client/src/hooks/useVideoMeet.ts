'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────
interface VideoPeer {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
}

export interface VideoMeetState {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isJoined: boolean;
  error: string | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Bandwidth limits for video — prevents WebRTC from using too much bandwidth
const MAX_VIDEO_BITRATE = 100_000; // 100 kbps (enough for 120×120 thumbnails)
const MAX_AUDIO_BITRATE = 32_000;  // 32 kbps (voice quality)

/**
 * Apply bandwidth constraints to an RTCPeerConnection's senders.
 * This limits video/audio encoding bitrate to reduce CPU/network load.
 */
async function applyBandwidthConstraints(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    const isVideo = sender.track?.kind === 'video';
    for (const encoding of params.encodings) {
      encoding.maxBitrate = isVideo ? MAX_VIDEO_BITRATE : MAX_AUDIO_BITRATE;
    }
    try {
      await sender.setParameters(params);
    } catch {
      // Some browsers don't support setParameters; ignore
    }
  }
}

// ─── Hook ──────────────────────────────
export function useVideoMeet(roomCode: string | null) {
  const peersRef = useRef<Map<string, VideoPeer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true); // Start with video OFF
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for callbacks (avoids stale closures)
  const roomCodeRef = useRef(roomCode);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Queue for offers that arrive before local stream is ready
  const pendingOffersRef = useRef<Array<{ fromId: string; sdp: RTCSessionDescriptionInit }>>([]);

  // Debounced syncRemoteStreams to avoid thrashing state on rapid peer events
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRemoteStreams = useCallback(() => {
    // Debounce: batch multiple sync calls into a single state update
    if (syncTimerRef.current) return;
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      const map = new Map<string, MediaStream>();
      for (const [id, peer] of peersRef.current) {
        if (peer.stream) {
          map.set(id, peer.stream);
        }
      }
      setRemoteStreams(map);
    }, 50);
  }, []);

  // Ref-based removePeer to avoid stale closure in RTCPeerConnection callbacks
  const removePeerRef = useRef<(remoteUserId: string) => void>(() => {});

  const removePeer = useCallback((remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.pc.close();
      peer.stream = null;
      peersRef.current.delete(remoteUserId);
      syncRemoteStreams();
    }
  }, [syncRemoteStreams]);

  // Keep removePeerRef always up-to-date
  useEffect(() => { removePeerRef.current = removePeer; }, [removePeer]);

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks (audio + video)
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    // Handle remote tracks
    pc.ontrack = (e) => {
      if (e.streams[0]) {
        const peer = peersRef.current.get(remoteUserId);
        if (peer) {
          peer.stream = e.streams[0];
        }
        syncRemoteStreams();
      }
    };

    // ICE candidate exchange — reuse existing voice:* events
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice:ice-candidate', {
          targetId: remoteUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    // Apply bandwidth constraints once connection is established
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        applyBandwidthConstraints(pc);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeerRef.current(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, { pc, stream: null });
    return pc;
  }, [syncRemoteStreams]);

  // ─── Lazy Join — only register socket listeners; do NOT auto-start getUserMedia ───
  // Socket listeners must be registered so we can respond to incoming offers.
  // But getUserMedia is only called when user explicitly clicks "Join".
  useEffect(() => {
    if (!roomCode || !userId) return;

    const socket = getSocket();

    // Internal offer handler (shared by socket handler and pending queue)
    async function handleOfferInternal(fromId: string, sdp: RTCSessionDescriptionInit) {
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
        console.warn('[video-meet] Failed to handle offer:', err);
      }
    }

    // ─── Socket signaling handlers ───────────
    const handleVoiceJoined = async ({ userId: remoteId }: { userId: string }) => {
      if (remoteId === userId || !localStreamRef.current) return;

      const pc = createPeerConnection(remoteId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:offer', {
          targetId: remoteId,
          sdp: pc.localDescription?.toJSON(),
        });
      } catch (err) {
        console.warn('[video-meet] Failed to create offer:', err);
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

      // If local stream isn't ready yet, queue the offer for later
      if (!localStreamRef.current) {
        pendingOffersRef.current.push({ fromId, sdp });
        return;
      }

      await handleOfferInternal(fromId, sdp);
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
        console.warn('[video-meet] Failed to handle answer:', err);
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
        console.warn('[video-meet] Failed to add ICE candidate:', err);
      }
    };

    const handleVoiceLeft = ({ userId: remoteId }: { userId: string }) => {
      removePeerRef.current(remoteId);
    };

    socket.on('voice:joined', handleVoiceJoined);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:left', handleVoiceLeft);

    return () => {
      socket.emit('voice:leave', { roomCode });

      socket.off('voice:joined', handleVoiceJoined);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:left', handleVoiceLeft);

      // Close all peers — snapshot keys first to avoid iterator invalidation
      const peerIds = Array.from(peersRef.current.keys());
      for (const id of peerIds) {
        const peer = peersRef.current.get(id);
        if (peer) {
          peer.pc.close();
          peer.stream = null;
        }
      }
      peersRef.current.clear();

      // Clear pending offers queue
      pendingOffersRef.current = [];

      // Clear sync timer
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStreams(new Map());
      setIsJoined(false);
    };
  }, [roomCode, userId, createPeerConnection]);

  // ─── Manual Join (user clicks "Join") ───────────
  const join = useCallback(async () => {
    if (!roomCodeRef.current || isJoined) return;

    const socket = getSocket();

    try {
      // Request audio only first (lower resource usage than video)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 100, max: 160 },
          height: { ideal: 100, max: 160 },
          frameRate: { ideal: 10, max: 15 },
        },
      });

      localStreamRef.current = stream;

      // Start with audio muted AND video muted — user opts in manually
      for (const track of stream.getAudioTracks()) {
        track.enabled = false;
      }
      for (const track of stream.getVideoTracks()) {
        track.enabled = false;
      }

      setLocalStream(stream);
      setIsJoined(true);
      setIsVideoMuted(true);
      setIsAudioMuted(true);
      setError(null);

      // Process any offers that arrived before local stream was ready
      if (pendingOffersRef.current.length > 0) {
        const pending = [...pendingOffersRef.current];
        pendingOffersRef.current = [];
        for (const { fromId, sdp } of pending) {
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
            console.warn('[video-meet] Failed to handle pending offer:', err);
          }
        }
      }

      // Announce to room
      socket.emit('voice:join', { roomCode: roomCodeRef.current });
    } catch {
      // If video fails, try audio-only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        localStreamRef.current = stream;
        for (const track of stream.getAudioTracks()) {
          track.enabled = false;
        }

        setLocalStream(stream);
        setIsJoined(true);
        setIsAudioMuted(true);
        setIsVideoMuted(true);
        setError('Camera not available — audio only');

        // Process pending offers
        if (pendingOffersRef.current.length > 0) {
          const pending = [...pendingOffersRef.current];
          pendingOffersRef.current = [];
          for (const { fromId, sdp } of pending) {
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
              console.warn('[video-meet] Failed to handle pending offer:', err);
            }
          }
        }

        socket.emit('voice:join', { roomCode: roomCodeRef.current });
      } catch {
        setError('Camera & microphone access denied');
      }
    }
  }, [isJoined, createPeerConnection]);

  // ─── Controls ───────────
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !isAudioMuted;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !newMuted;
    }
    setIsAudioMuted(newMuted);
  }, [isAudioMuted]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !isVideoMuted;
    for (const track of stream.getVideoTracks()) {
      track.enabled = !newMuted;
    }
    setIsVideoMuted(newMuted);
  }, [isVideoMuted]);

  const toggleSound = useCallback(() => {
    setIsSoundMuted((prev) => !prev);
  }, []);

  const hangup = useCallback(() => {
    const socket = getSocket();
    socket.emit('voice:leave', { roomCode: roomCodeRef.current });

    // Snapshot keys first to avoid iterator invalidation during removePeer
    const peerIds = Array.from(peersRef.current.keys());
    for (const id of peerIds) {
      removePeer(id);
    }
    peersRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsJoined(false);
  }, [removePeer]);

  return {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoMuted,
    isSoundMuted,
    isJoined,
    error,
    join,
    toggleAudio,
    toggleVideo,
    toggleSound,
    hangup,
  };
}
