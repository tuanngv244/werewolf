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

// ─── Hook ──────────────────────────────
export function useVideoMeet(roomCode: string | null) {
  const peersRef = useRef<Map<string, VideoPeer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for callbacks
  const roomCodeRef = useRef(roomCode);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Helper: update remoteStreams state from peersRef
  const syncRemoteStreams = useCallback(() => {
    const map = new Map<string, MediaStream>();
    for (const [id, peer] of peersRef.current) {
      if (peer.stream) {
        map.set(id, peer.stream);
      }
    }
    setRemoteStreams(new Map(map));
  }, []);

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

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, { pc, stream: null });
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncRemoteStreams]);

  const removePeer = useCallback((remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.pc.close();
      peer.stream = null;
      peersRef.current.delete(remoteUserId);
      syncRemoteStreams();
    }
  }, [syncRemoteStreams]);

  // Initialize video meeting
  useEffect(() => {
    if (!roomCode || !userId) return;

    const socket = getSocket();
    let mounted = true;

    async function init() {
      try {
        // Request camera + microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 120, max: 180 },
            height: { ideal: 120, max: 180 },
            frameRate: { ideal: 15, max: 24 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Start with audio muted (avoid echo surprise), but video ON
        for (const track of stream.getAudioTracks()) {
          track.enabled = false;
        }
        // Video tracks stay enabled — user granted camera permission

        setLocalStream(stream);
        setIsJoined(true);
        setIsVideoMuted(false);
        setIsAudioMuted(true);
        setError(null);

        // Announce to room
        socket.emit('voice:join', { roomCode });
      } catch (err) {
        if (!mounted) return;
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

          if (!mounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          localStreamRef.current = stream;
          // Audio-only: mic starts muted
          for (const track of stream.getAudioTracks()) {
            track.enabled = false;
          }

          setLocalStream(stream);
          setIsJoined(true);
          setIsAudioMuted(true);
          setIsVideoMuted(true);
          setError('Camera not available — audio only');

          socket.emit('voice:join', { roomCode });
        } catch {
          if (mounted) {
            setError('Camera & microphone access denied');
          }
        }
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

      socket.emit('voice:leave', { roomCode });

      socket.off('voice:joined', handleVoiceJoined);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:left', handleVoiceLeft);

      // Close all peers
      for (const [id] of peersRef.current) {
        removePeer(id);
      }
      peersRef.current.clear();

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStreams(new Map());
      setIsJoined(false);
    };
  }, [roomCode, userId, createPeerConnection, removePeer]);

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

    for (const [id] of peersRef.current) {
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
    toggleAudio,
    toggleVideo,
    toggleSound,
    hangup,
  };
}
