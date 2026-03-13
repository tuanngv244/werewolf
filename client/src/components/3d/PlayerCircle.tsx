'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Role } from '@shared/types/game.types';
import { useAuthStore } from '@/stores/auth-store';
import { getSocket } from '@/lib/socket';
import { playSound } from '@/lib/sounds';
import { useUiStore } from '@/stores/ui-store';

interface PlayerData {
  id: string;
  username: string;
  isAlive: boolean;
  role?: Role;
  isSelected?: boolean;
}

// ─── Model paths ─────────────────────────────
const MODEL_PATHS = [
  '/models/b_model.glb',
  '/models/g_model.glb',
  '/models/m_model.glb',
  '/models/s_model.glb',
  '/models/w_model.glb',
];

// Preload all models so they're cached
MODEL_PATHS.forEach((path) => useGLTF.preload(path));

// ─── Deterministic model assignment per player ───────────────
// Uses a simple hash of the player ID to pick a model consistently
function getModelIndex(playerId: string): number {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % MODEL_PATHS.length;
}

// ─── Role Visual Config (kept for emoji, glow, etc.) ───────────────
interface RoleCostume {
  emoji: string;
  glowColor?: string;
}

const ROLE_COSTUMES: Record<string, RoleCostume> = {
  // ── Village Team — Active ──
  villager: { emoji: '🏘️' },
  doctor: { emoji: '💊', glowColor: '#3498DB' },
  gunner: { emoji: '🔫' },
  seer: { emoji: '🔮', glowColor: '#9B59B6' },
  aura_seer: { emoji: '✨', glowColor: '#E6E6FA' },
  medium: { emoji: '👻', glowColor: '#7FDBFF' },
  witch: { emoji: '🧙', glowColor: '#6C3483' },
  avenger: { emoji: '⚔️', glowColor: '#DC2626' },
  beast_hunter: { emoji: '🪤' },
  cursed: { emoji: '🌑' },
  bodyguard: { emoji: '🛡️', glowColor: '#3B82F6' },
  priest: { emoji: '✝️', glowColor: '#FBBF24' },
  // ── Village Team — Passive ──
  elder: { emoji: '👴' },
  baker: { emoji: '🍞' },
  drunk: { emoji: '🍺' },
  mayor: { emoji: '🎩', glowColor: '#D4AF37' },
  pacifist: { emoji: '☮️', glowColor: '#66BB6A' },
  sleepwalker: { emoji: '😴' },
  hermit: { emoji: '🏔️' },
  apprentice_seer: { emoji: '🌟', glowColor: '#C084FC' },
  // ── Werewolf Team ──
  werewolf: { emoji: '🐺', glowColor: '#8B0000' },
  alpha_werewolf: { emoji: '🐺', glowColor: '#B91C1C' },
  werewolf_shaman: { emoji: '🐺', glowColor: '#9333EA' },
  werewolf_seer: { emoji: '🐺', glowColor: '#3B82F6' },
  nightmare_wolf: { emoji: '🐺', glowColor: '#7C3AED' },
  shadow_wolf: { emoji: '🐺', glowColor: '#4B5563' },
  blood_moon_wolf: { emoji: '🐺', glowColor: '#DC2626' },
  howler_wolf: { emoji: '🐺', glowColor: '#D97706' },
  lone_wolf: { emoji: '🐺', glowColor: '#92400E' },
  venom_wolf: { emoji: '🐺', glowColor: '#16A34A' },
  // ── Solo Team ──
  headhunter: { emoji: '🎯', glowColor: '#EF4444' },
  fool: { emoji: '🃏', glowColor: '#FBBF24' },
  bomber: { emoji: '💣', glowColor: '#F97316' },
  serial_killer: { emoji: '🔪', glowColor: '#991B1B' },
  cupid: { emoji: '💘', glowColor: '#EC4899' },
  arsonist: { emoji: '🔥', glowColor: '#EF4444' },
  survivor: { emoji: '🦺' },
  amnesiac: { emoji: '❓', glowColor: '#A78BFA' },
  doppelganger: { emoji: '🪞', glowColor: '#818CF8' },
  jester: { emoji: '🤡', glowColor: '#FB923C' },
};

const DEFAULT_COSTUME: RoleCostume = { emoji: '❓' };

function getCostume(role?: Role | string): RoleCostume {
  if (!role) return DEFAULT_COSTUME;
  return ROLE_COSTUMES[role] || DEFAULT_COSTUME;
}

// ─── Ground & Collision Raycasting Utility ─────────────────────────────
// Shared raycaster instances (reused to avoid GC pressure)
const _groundRaycaster = new THREE.Raycaster();
const _collisionRaycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3(0, -1, 0);
const _collisionDir = new THREE.Vector3();
const _faceNormal = new THREE.Vector3();

/**
 * Cast a ray downward from (x, highY, z) to find the walkable ground surface Y.
 *
 * Strategy: The raycaster returns hits sorted top-to-bottom (nearest first from Y=highY).
 * The map model has multiple stacked terrain layers (grass top, dirt paths, underside).
 * We want the TOPMOST walkable surface that is NOT a rooftop/canopy.
 *
 * - If referenceY is given, skip surfaces more than maxAboveRef above it (those are rooftops).
 * - Among remaining, pick the HIGHEST (first/topmost) walkable surface = actual ground top.
 * - If no referenceY, pick the first walkable surface (topmost).
 */
function getGroundY(
  mapScene: THREE.Object3D | null,
  x: number,
  z: number,
  fallbackY: number,
  highY = 30,
  referenceY?: number,
): number {
  if (!mapScene) return fallbackY;

  _rayOrigin.set(x, highY, z);
  _groundRaycaster.set(_rayOrigin, _rayDir);
  _groundRaycaster.far = highY + 20;

  const intersects = _groundRaycaster.intersectObject(mapScene, true);
  if (intersects.length === 0) return fallbackY;

  // How far above the reference a surface can be before we consider it a rooftop
  const maxAboveRef = 3.0;

  // Intersects are sorted by distance from ray origin (Y=highY), so first hit = highest Y surface.
  // Walk through top-to-bottom and return the FIRST walkable surface that isn't a rooftop.
  for (const hit of intersects) {
    // Check if this face is upward-facing (walkable)
    let isWalkable = true;
    if (hit.face) {
      _faceNormal.copy(hit.face.normal);
      if (hit.object.matrixWorld) {
        _faceNormal.transformDirection(hit.object.matrixWorld);
      }
      isWalkable = _faceNormal.y > 0.3;
    }

    if (!isWalkable) continue;

    // If we have a reference Y, skip surfaces that are way above it (rooftops/canopies)
    if (referenceY !== undefined && hit.point.y > referenceY + maxAboveRef) {
      continue;
    }

    // This is the topmost valid walkable ground surface
    return hit.point.y;
  }

  // No valid walkable surface found — use fallback
  return fallbackY;
}

// Small Y offset to prevent character feet from clipping into the ground mesh
const GROUND_Y_OFFSET = 0.02;

// Model facing offset: Adjust if the GLB model's front doesn't align with Three.js -Z convention.
// Set to 0 if model faces -Z (Blender default), or Math.PI if model faces +Z.
const MODEL_FACING_OFFSET = 0;

/**
 * Check if moving from (fromX, fromZ) to (toX, toZ) at height Y is blocked by a WALL object.
 *
 * NOTE: Horizontal collision is currently disabled because the terrain model
 * has a complex transform chain (Sketchfab wrapper with -90° X rotation) that
 * causes world-space face normals to be unreliable. The terrain's "up-facing"
 * normals get rotated to appear wall-like, blocking ALL movement.
 * Movement boundaries are enforced by the maxRadius check and slope guard instead.
 */
function canMoveTo(
  _mapScene: THREE.Object3D | null,
  _fromX: number,
  _fromZ: number,
  _toX: number,
  _toZ: number,
  _currentY: number,
  _characterHeight = 1.2,
): boolean {
  // Disabled — terrain model normals in world space are unreliable due to
  // the Sketchfab → GLTF root rotation chain. All movement appears blocked.
  // Relying on maxRadius + slope guard for movement boundaries.
  return true;
}

// ─── Emoji List for Picker ─────────────────────────
const EMOJI_LIST = ['😀', '😂', '😍', '😎', '🤔', '😱', '🤣', '😡', '👍', '👏', '🔥', '💀', '🐺', '😈', '🙏', '❤️'];

// ─── Keyboard Input Hook (with Tab + Enter for emoji picker) ─────────────────────────
function useKeyboard() {
  const keys = useRef<Set<string>>(new Set());
  const justPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'f', 'F', ' ', 'Tab', 'Enter', 'y', 'Y'].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const key = e.key.toLowerCase();
        if (!keys.current.has(key)) {
          justPressed.current.add(key);
        }
        keys.current.add(key);
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const onBlur = () => {
      keys.current.clear();
      justPressed.current.clear();
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return { keys, justPressed };
}

// ─── Wandering Logic (for NPC/bots) ──────────────────────────────
function useWander(
  homePos: [number, number, number],
  isAlive: boolean,
  seed: number,
  mapScene: THREE.Object3D | null,
) {
  const posRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const targetRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const timerRef = useRef(seed * 10);
  const speedRef = useRef(0.3 + Math.random() * 0.3);
  const rotRef = useRef(0);
  const isMovingRef = useRef(false);
  const walkPhaseRef = useRef(seed * 5); // Walk animation phase
  const wanderRadius = 2.0;

  // Set initial ground Y
  const initialGroundSet = useRef(false);

  useFrame((_, delta) => {
    if (!isAlive) {
      isMovingRef.current = false;
      return;
    }

    // Set initial Y from homePosition (already computed correctly from campfire ground level)
    if (!initialGroundSet.current) {
      posRef.current.y = homePos[1];
      initialGroundSet.current = true;
    }

    timerRef.current -= delta;

    if (timerRef.current <= 0) {
      timerRef.current = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * wanderRadius;
      const newX = homePos[0] + Math.cos(angle) * dist;
      const newZ = homePos[2] + Math.sin(angle) * dist;
      targetRef.current.set(newX, homePos[1], newZ);
    }

    const current = posRef.current;
    const target = targetRef.current;
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      isMovingRef.current = true;
      walkPhaseRef.current += delta * 8;
      const step = Math.min(delta * speedRef.current, dist);
      const newX = current.x + (dx / dist) * step;
      const newZ = current.z + (dz / dist) * step;

      // Check horizontal collision before moving
      const pathClear = canMoveTo(mapScene, current.x, current.z, newX, newZ, current.y);

      if (pathClear) {
        // Raycast to find ground at the new position, using current Y as reference
        if (mapScene) {
          const groundY = getGroundY(mapScene, newX, newZ, current.y, 30, current.y);
          // Allow moderate slopes (max 2.0 per step), block extreme cliffs
          const yDiff = Math.abs(groundY - current.y);
          if (yDiff < 2.0) {
            current.y = groundY + GROUND_Y_OFFSET;
            current.x = newX;
            current.z = newZ;
          } else {
            // Blocked by steep terrain — pick a new target
            timerRef.current = 0;
            isMovingRef.current = false;
          }
        } else {
          current.x = newX;
          current.z = newZ;
        }
      } else {
        // Blocked by collision — pick a new target
        timerRef.current = 0;
        isMovingRef.current = false;
      }

      // Face in the direction of movement (Three.js: rotation.y=0 faces -Z)
      const targetRot = Math.atan2(-dx, -dz);
      let rotDiff = targetRot - rotRef.current;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      rotRef.current += rotDiff * delta * 3;
    } else {
      isMovingRef.current = false;
    }
  });

  return { posRef, rotRef, isMovingRef, walkPhaseRef };
}

// ─── Player-controlled Movement ──────────────────────────────
function usePlayerControl(
  homePos: [number, number, number],
  isAlive: boolean,
  keys: React.RefObject<Set<string>>,
  mapScene: THREE.Object3D | null,
) {
  const posRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const rotRef = useRef(0);
  const isMovingRef = useRef(false);
  const walkPhaseRef = useRef(0); // Walk animation phase
  const speed = 2.5;
  const maxRadius = 12; // Allow free roaming across the map

  // Set initial ground Y
  const initialGroundSet = useRef(false);

  useFrame((_, delta) => {
    if (!isAlive || !keys.current) {
      isMovingRef.current = false;
      return;
    }

    // Set initial Y from homePosition (already computed correctly from campfire ground level)
    if (!initialGroundSet.current) {
      posRef.current.y = homePos[1];
      initialGroundSet.current = true;
    }

    let moveX = 0;
    let moveZ = 0;

    // Support both Arrow keys and WASD
    if (keys.current.has('arrowup') || keys.current.has('w')) moveZ -= 1;
    if (keys.current.has('arrowdown') || keys.current.has('s')) moveZ += 1;
    if (keys.current.has('arrowleft') || keys.current.has('a')) moveX -= 1;
    if (keys.current.has('arrowright') || keys.current.has('d')) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;
    isMovingRef.current = isMoving;

    if (isMoving) {
      walkPhaseRef.current += delta * 10;
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;

      const newX = posRef.current.x + moveX * speed * delta;
      const newZ = posRef.current.z + moveZ * speed * delta;
      const distFromHome = Math.sqrt((newX - homePos[0]) ** 2 + (newZ - homePos[2]) ** 2);

      if (distFromHome < maxRadius) {
        // Check horizontal collision before moving
        const pathClear = canMoveTo(mapScene, posRef.current.x, posRef.current.z, newX, newZ, posRef.current.y);

        if (pathClear) {
          // Raycast to find ground at the new position
          if (mapScene) {
            const groundY = getGroundY(mapScene, newX, newZ, posRef.current.y, 30, posRef.current.y);
            // Allow moderate slopes (max 2.0 per step), block extreme cliffs
            const yDiff = Math.abs(groundY - posRef.current.y);
            if (yDiff < 2.0) {
              posRef.current.x = newX;
              posRef.current.z = newZ;
              posRef.current.y = groundY + GROUND_Y_OFFSET;
            }
            // If too steep, don't move (acts as collision with steep terrain)
          } else {
            posRef.current.x = newX;
            posRef.current.z = newZ;
          }
        }
        // If collision detected, don't move (blocked by object)
      }

      // Face in the direction of movement
      // Three.js: rotation.y=0 faces -Z. atan2(-moveX, -moveZ) aligns model front with movement.
      const targetRot = Math.atan2(-moveX, -moveZ);
      let rotDiff = targetRot - rotRef.current;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      rotRef.current += rotDiff * delta * 8;
    }
  });

  return { posRef, rotRef, isMovingRef, walkPhaseRef };
}

// ─── Emoji Picker Component (circular layout) ─────────────────────────
function EmojiPicker({
  selectedIndex,
  isVisible,
}: {
  selectedIndex: number;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  const count = EMOJI_LIST.length;
  const circleRadius = 72; // px radius of the emoji circle

  return (
    <Html
      position={[0, 2.0, 0]}
      center
      distanceFactor={8}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          position: 'relative',
          width: circleRadius * 2 + 40,
          height: circleRadius * 2 + 40,
        }}
      >
        {/* Circular background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.75)',
            border: '2px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        />
        {/* Emojis positioned in a circle */}
        {EMOJI_LIST.map((emoji, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2; // Start from top
          const x = Math.cos(angle) * circleRadius + circleRadius + 20;
          const y = Math.sin(angle) * circleRadius + circleRadius + 20;
          const isSelected = i === selectedIndex;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.5 : 1})`,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: isSelected ? 'rgba(255,200,0,0.5)' : 'transparent',
                border: isSelected ? '2px solid #FFD700' : '2px solid transparent',
                filter: isSelected ? 'drop-shadow(0 0 6px #FFD700)' : 'none',
                transition: 'transform 0.15s, background 0.15s',
                fontSize: isSelected ? 18 : 14,
                lineHeight: 1,
                zIndex: isSelected ? 2 : 1,
              }}
            >
              {emoji}
            </div>
          );
        })}
        {/* Center hint text */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 2 }}>{EMOJI_LIST[selectedIndex]}</div>
          <div>Tab ↻</div>
          <div>Enter ✓</div>
        </div>
      </div>
    </Html>
  );
}

// ─── Floating Emoji Display (shows above character head for 3s) ─────────
function FloatingEmoji({ emoji, timestamp }: { emoji: string; timestamp: number }) {
  const elapsed = (Date.now() - timestamp) / 1000;
  if (elapsed > 3) return null;

  // Fade out in the last 0.5s
  const opacity = elapsed > 2.5 ? 1 - (elapsed - 2.5) / 0.5 : 1;
  // Gentle float up
  const yOffset = elapsed * 3;

  return (
    <Html
      position={[0, 1.7, 0]}
      center
      distanceFactor={8}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className="text-3xl drop-shadow-lg"
        style={{
          opacity,
          transform: `translateY(${-yOffset}px) scale(${1 + elapsed * 0.08})`,
          transition: 'none',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {emoji}
      </div>
    </Html>
  );
}

// ─── GLB Character Component ─────────────────────────
function GLBCharacter({
  player,
  homePosition,
  onClick,
  isNight,
  index,
  isLocalPlayer,
  keys,
  chatBubble,
  isBeingHit,
  isJumping: isJumpingProp,
  hitEmoji,
  emojiPickerOpen,
  emojiSelectedIndex,
  floatingEmoji,
  mapScene,
}: {
  player: PlayerData;
  homePosition: [number, number, number];
  onClick?: () => void;
  isNight: boolean;
  index: number;
  isLocalPlayer: boolean;
  keys: React.RefObject<Set<string>>;
  chatBubble?: { content: string; timestamp: number };
  isBeingHit?: boolean;
  isJumping?: boolean;
  hitEmoji?: string;
  emojiPickerOpen?: boolean;
  emojiSelectedIndex?: number;
  floatingEmoji?: { emoji: string; timestamp: number };
  mapScene?: THREE.Object3D | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const costume = useMemo(() => getCostume(player.role), [player.role]);

  // Deterministic model selection per player ID
  const modelPath = useMemo(() => MODEL_PATHS[getModelIndex(player.id)], [player.id]);
  const { scene } = useGLTF(modelPath);

  // Clone the scene so each instance is independent
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Traverse and clone materials so each instance can be tinted independently
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Apply dead state (grayscale + transparent)
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          if (!player.isAlive) {
            mat.color.set('#888888');
            mat.transparent = true;
            mat.opacity = 0.5;
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0;
          } else {
            mat.transparent = false;
            mat.opacity = 1.0;
          }
        }
      }
    });
  }, [clonedScene, player.isAlive]);

  // Movement — local player uses keyboard, bots/others use AI wander
  const wanderState = useWander(homePosition, !isLocalPlayer && player.isAlive, index, mapScene ?? null);
  const playerState = usePlayerControl(homePosition, isLocalPlayer && player.isAlive, keys, mapScene ?? null);

  const posRef = isLocalPlayer ? playerState.posRef : wanderState.posRef;
  const rotRef = isLocalPlayer ? playerState.rotRef : wanderState.rotRef;
  const isMovingRef = isLocalPlayer ? playerState.isMovingRef : wanderState.isMovingRef;
  const walkPhaseRef = isLocalPlayer ? playerState.walkPhaseRef : wanderState.walkPhaseRef;

  // Hit animation state
  const hitAnimRef = useRef(0);
  const hitShakeRef = useRef(0);

  // Jump animation state
  const jumpVelocityRef = useRef(0);
  const jumpHeightRef = useRef(0);
  const isJumpingRef = useRef(false);
  const jumpCooldownRef = useRef(0);

  // Trigger jump from external prop
  useEffect(() => {
    if (isJumpingProp && !isJumpingRef.current) {
      isJumpingRef.current = true;
      jumpVelocityRef.current = 3.5;
    }
  }, [isJumpingProp]);

  // Trigger hit animation
  useEffect(() => {
    if (isBeingHit) {
      hitAnimRef.current = 0.001;
      hitShakeRef.current = 1.0;
    }
  }, [isBeingHit]);

  // Main animation loop
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (player.isAlive) {
      // ── Jump trigger (Space key — local player only) ──
      if (isLocalPlayer && keys.current.has(' ') && !isJumpingRef.current && jumpCooldownRef.current <= 0) {
        keys.current.delete(' ');
        isJumpingRef.current = true;
        jumpVelocityRef.current = 3.5;
        jumpCooldownRef.current = 0.5;
      }
      if (jumpCooldownRef.current > 0) {
        jumpCooldownRef.current -= delta;
      }

      // ── Jump physics ──
      if (isJumpingRef.current) {
        jumpVelocityRef.current -= 12.0 * delta;
        jumpHeightRef.current += jumpVelocityRef.current * delta;
        if (jumpHeightRef.current <= 0) {
          jumpHeightRef.current = 0;
          jumpVelocityRef.current = 0;
          isJumpingRef.current = false;
        }
      }

      // ── Position sync ──
      groupRef.current.position.x = posRef.current.x;
      groupRef.current.position.z = posRef.current.z;
      // Apply model facing offset so the model's visual front faces the movement direction
      groupRef.current.rotation.y = rotRef.current + MODEL_FACING_OFFSET;

      const isMoving = isMovingRef.current;
      const walkPhase = walkPhaseRef.current;

      // ── Walking animation — realistic body mechanics ──
      if (isMoving && !isJumpingRef.current) {
        // Walk bounce: asymmetric double-bump (each foot contact)
        const stepCycle = Math.sin(walkPhase * 2); // Full step cycle
        const walkBounce = Math.abs(stepCycle) * 0.04 + Math.abs(Math.sin(walkPhase * 4)) * 0.02;

        // Slight side-to-side sway (weight transfer between feet)
        const sway = Math.sin(walkPhase) * 0.03;

        // Forward lean while walking
        clonedScene.rotation.x = 0.06;
        // Body sway (lean into the stride)
        clonedScene.rotation.z = sway;
        // Subtle body twist (counter-rotation to arm swing)
        clonedScene.rotation.y = Math.sin(walkPhase) * 0.02;

        const breathe = Math.sin(t * 2.0 + index) * 0.01;
        groupRef.current.position.y = posRef.current.y + walkBounce + breathe + jumpHeightRef.current;
        groupRef.current.scale.set(1, 1, 1);
      } else if (isJumpingRef.current || jumpHeightRef.current > 0) {
        // ── Jump squash & stretch ──
        const stretchY = 1.0 + jumpVelocityRef.current * 0.03;
        const squashXZ = 1.0 / Math.sqrt(Math.max(stretchY, 0.7));
        groupRef.current.scale.set(squashXZ, Math.max(stretchY, 0.85), squashXZ);
        clonedScene.rotation.x = jumpVelocityRef.current > 0 ? -0.1 : 0.15; // Lean back on ascent, forward on descent
        clonedScene.rotation.z *= 0.9;
        clonedScene.rotation.y *= 0.9;

        const breathe = Math.sin(t * 1.5 + index) * 0.03;
        groupRef.current.position.y = posRef.current.y + breathe + jumpHeightRef.current;
      } else {
        // ── Idle animation — subtle breathing and micro-movements ──
        const breathe = Math.sin(t * 1.5 + index) * 0.03;
        const idleSway = Math.sin(t * 0.5 + index * 2.3) * 0.005;
        groupRef.current.position.y = posRef.current.y + breathe + jumpHeightRef.current;
        groupRef.current.scale.set(1, 1, 1);

        // Slowly return lean to neutral
        clonedScene.rotation.x *= 0.92;
        clonedScene.rotation.z = clonedScene.rotation.z * 0.92 + idleSway;
        clonedScene.rotation.y *= 0.92;
      }

      // ── Hit reaction — shake body ──
      if (hitShakeRef.current > 0) {
        hitShakeRef.current -= delta * 3;
        if (hitShakeRef.current < 0) hitShakeRef.current = 0;
        const shake = Math.sin(t * 40) * hitShakeRef.current * 0.15;
        groupRef.current.position.x = posRef.current.x + shake;
      }

      // ── Hit animation progress ──
      if (hitAnimRef.current > 0) {
        hitAnimRef.current += delta;
        if (hitAnimRef.current > 1.0) {
          hitAnimRef.current = 0;
        }
      }
    } else {
      groupRef.current.position.set(homePosition[0], homePosition[1], homePosition[2]);
    }
  });

  // Calculate bubble age for fade
  const bubbleOpacity = chatBubble
    ? Math.max(0, 1 - (Date.now() - chatBubble.timestamp) / 4000)
    : 0;

  // Model scale — reduce to make characters feel like they live inside the map
  const modelScale = 0.55;

  return (
    <group
      ref={groupRef}
      position={homePosition}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      scale={player.isAlive ? 1 : 0.7}
    >
      {/* Selection ring */}
      {player.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.62, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={player.isAlive ? 0.25 : 0.1} />
      </mesh>

      {/* GLB Model */}
      <primitive
        object={clonedScene}
        scale={modelScale}
        position={[0, 0, 0]}
      />

      {/* Emoji Picker (only for local player) */}
      {isLocalPlayer && (
        <EmojiPicker
          selectedIndex={emojiSelectedIndex ?? 0}
          isVisible={!!emojiPickerOpen}
        />
      )}

      {/* Floating Emoji (above character head) */}
      {floatingEmoji && (
        <FloatingEmoji emoji={floatingEmoji.emoji} timestamp={floatingEmoji.timestamp} />
      )}

      {/* Chat bubble */}
      {chatBubble && bubbleOpacity > 0 && (
        <Html
          position={[0, 1.5, 0]}
          center
          distanceFactor={8}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className="relative px-3 py-1.5 rounded-xl text-xs font-medium max-w-[140px] text-center leading-tight shadow-lg"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a1a2e',
              opacity: bubbleOpacity,
              transition: 'opacity 0.3s',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            {chatBubble.content}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '6px solid rgba(255,255,255,0.95)',
              }}
            />
          </div>
        </Html>
      )}

      {/* Hit reaction emoji */}
      {hitAnimRef.current > 0 && (
        <Html
          position={[0, 1.7, 0]}
          center
          distanceFactor={8}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className="text-center animate-bounce"
            style={{
              opacity: Math.max(0, 1 - hitAnimRef.current),
              transform: `translateY(${-hitAnimRef.current * 30}px) scale(${1 + hitAnimRef.current * 0.5})`,
              transition: 'none',
            }}
          >
            <div className="text-2xl font-bold drop-shadow-lg">{hitEmoji || '💥'}</div>
            <div
              className="text-xs font-black text-red-500 drop-shadow-lg"
              style={{ textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff' }}
            >
              SLAP!
            </div>
          </div>
        </Html>
      )}

      {/* Name tag + role emoji */}
      <Html
        position={[0, 1.3, 0]}
        center
        distanceFactor={8}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {player.role && (
            <span className="text-lg leading-none drop-shadow-md">{costume.emoji}</span>
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm shadow-sm ${
              player.isAlive
                ? isNight
                  ? 'bg-night-card/80 text-night-text'
                  : 'bg-white/80 text-day-text'
                : 'bg-gray-800/80 text-gray-400 line-through'
            } ${player.isSelected ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {isLocalPlayer ? `⭐ ${player.username}` : player.username}
          </span>
        </div>
      </Html>

      {/* Role glow effect */}
      {player.isAlive && costume.glowColor && (
        <pointLight
          position={[0, 0.6, 0]}
          color={costume.glowColor}
          intensity={player.isSelected ? 1.5 : 0.4}
          distance={player.isSelected ? 3 : 1.5}
        />
      )}

      {/* Selected glow */}
      {player.isSelected && (
        <pointLight position={[0, 0.5, 0]} color="#FFD700" intensity={1.2} distance={2.5} />
      )}
    </group>
  );
}

// ─── Player Circle ────────────────────────────────
export function PlayerCircle({
  players,
  selectedId,
  onSelect,
  isNight,
  chatBubbles,
  firePosition,
  mapScene,
  onLocalPlayerPosition,
  onCameraToggle,
}: {
  players: PlayerData[];
  selectedId?: string | null;
  onSelect?: (playerId: string) => void;
  isNight: boolean;
  chatBubbles?: Map<string, { content: string; timestamp: number }>;
  firePosition?: [number, number, number];
  mapScene?: THREE.Object3D | null;
  onLocalPlayerPosition?: (pos: THREE.Vector3, rot: number) => void;
  onCameraToggle?: () => void;
}) {
  // Deduplicate players by ID
  const uniquePlayers = useMemo(() => {
    const seen = new Set<string>();
    return players.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [players]);

  const radius = Math.max(2.5, uniquePlayers.length * 0.35);
  const { keys, justPressed } = useKeyboard();
  const localUserId = useAuthStore((s) => s.user?.id);
  const localUsername = useAuthStore((s) => s.user?.username);
  const emptyBubbles = useMemo(() => new Map<string, { content: string; timestamp: number }>(), []);
  const activeBubbles = chatBubbles || emptyBubbles;

  // Fire/campfire center position (detected from map model, or fallback)
  // Fallback Y=0.5 is a reasonable default above the map surface
  const fireCenterX = firePosition ? firePosition[0] : 0;
  const fireCenterY = firePosition ? firePosition[1] : 0.5;
  const fireCenterZ = firePosition ? firePosition[2] : 0;

  // Attack state (kept for slap hit detection without shuriken)
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [hitEmoji, setHitEmoji] = useState('💥');
  const playerPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  // Emoji picker state
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSelectedIndex, setEmojiSelectedIndex] = useState(0);

  // Floating emojis per player: { playerId -> { emoji, timestamp } }
  const [floatingEmojis, setFloatingEmojis] = useState<Map<string, { emoji: string; timestamp: number }>>(new Map());

  // Jump state
  const [jumpingId, setJumpingId] = useState<string | null>(null);
  const jumpCooldownRef = useRef(0);

  // Track local player's facing direction
  const playerFacingRef = useRef(new THREE.Vector3(0, 0, -1));

  // Emoji picker logic + jump in useFrame
  useFrame((_, delta) => {
    if (jumpCooldownRef.current > 0) {
      jumpCooldownRef.current -= delta;
    }

    // ── Y key → toggle camera mode ──
    if (justPressed.current.has('y') && localUserId) {
      justPressed.current.delete('y');
      onCameraToggle?.();
    }

    // ── F key → toggle emoji picker ──
    if (justPressed.current.has('f') && localUserId) {
      justPressed.current.delete('f');
      if (!emojiPickerOpen) {
        // Open picker
        setEmojiPickerOpen(true);
        setEmojiSelectedIndex(0);
      } else {
        // Close picker without selecting
        setEmojiPickerOpen(false);
      }
    }

    // ── Tab key → cycle emoji selection ──
    if (justPressed.current.has('tab') && emojiPickerOpen) {
      justPressed.current.delete('tab');
      setEmojiSelectedIndex((prev) => (prev + 1) % EMOJI_LIST.length);
    }

    // ── Enter key → confirm emoji selection ──
    if (justPressed.current.has('enter') && emojiPickerOpen && localUserId) {
      justPressed.current.delete('enter');
      const selectedEmoji = EMOJI_LIST[emojiSelectedIndex];
      setEmojiPickerOpen(false);

      // Show floating emoji above local player's head
      setFloatingEmojis((prev) => {
        const next = new Map(prev);
        next.set(localUserId, { emoji: selectedEmoji, timestamp: Date.now() });
        return next;
      });

      // Clear after 3 seconds
      setTimeout(() => {
        setFloatingEmojis((prev) => {
          const next = new Map(prev);
          if (next.get(localUserId)?.emoji === selectedEmoji) {
            next.delete(localUserId);
          }
          return next;
        });
      }, 3100);

      // Broadcast emoji to other players via socket
      const socket = getSocket();
      socket.emit('fun:emoji', { emoji: selectedEmoji });

      if (useUiStore.getState().isSoundEnabled) {
        playSound('slap');
      }
    }

    // ── Space key → jump ──
    if (keys.current.has(' ') && jumpCooldownRef.current <= 0 && localUserId) {
      keys.current.delete(' ');
      jumpCooldownRef.current = 0.6;
      setJumpingId(localUserId);
      setTimeout(() => setJumpingId(null), 600);

      const socket = getSocket();
      socket.emit('fun:jump');
    }

    // Clear justPressed at end of frame
    justPressed.current.clear();
  });

  // Listen for emoji events from server (from other players)
  useEffect(() => {
    const socket = getSocket();

    const onEmoji = ({ playerId, emoji }: { playerId: string; emoji: string }) => {
      if (playerId === localUserId) return; // Already handled locally
      setFloatingEmojis((prev) => {
        const next = new Map(prev);
        next.set(playerId, { emoji, timestamp: Date.now() });
        return next;
      });
      // Clear after 3 seconds
      setTimeout(() => {
        setFloatingEmojis((prev) => {
          const next = new Map(prev);
          if (next.get(playerId)?.emoji === emoji) {
            next.delete(playerId);
          }
          return next;
        });
      }, 3100);
    };

    socket.on('fun:emoji', onEmoji);
    return () => {
      socket.off('fun:emoji', onEmoji);
    };
  }, [localUserId]);

  // Listen for slap events from server
  useEffect(() => {
    const socket = getSocket();

    const onSlapped = ({ attackerId, targetId }: { attackerId: string; targetId: string }) => {
      // Show target getting hit
      const emojis = ['💥', '⭐', '💫', '🌟', '😵', '🤕', '👊', '🫨'];
      setHitEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
      setHitTargetId(targetId);
      setTimeout(() => setHitTargetId(null), 1000);

      if (useUiStore.getState().isSoundEnabled) {
        if (targetId === localUserId) {
          playSound('bonk');
        } else if (attackerId !== localUserId) {
          playSound('slap');
        }
      }
    };

    socket.on('fun:slapped', onSlapped);
    return () => {
      socket.off('fun:slapped', onSlapped);
    };
  }, [localUserId]);

  // Listen for jump events from server
  useEffect(() => {
    const socket = getSocket();

    const onJumped = ({ playerId }: { playerId: string }) => {
      setJumpingId(playerId);
      setTimeout(() => setJumpingId(null), 600);
    };

    socket.on('fun:jumped', onJumped);
    return () => {
      socket.off('fun:jumped', onJumped);
    };
  }, []);

  // Pre-compute ground Y for each player's home position.
  // The campfire sits on flat ground, and all players are arranged in a small circle
  // around it. The campfire object sits ON the terrain surface, so fireCenterY
  // IS the ground level at the gathering area. Use it directly for all player positions
  // instead of raycasting (which is unreliable due to 5 overlapping terrain mesh layers).
  const homeGroundYs = useMemo(() => {
    if (!mapScene) return null;
    // Use campfire Y as ground level for all players in the circle
    const results = uniquePlayers.map(() => fireCenterY + GROUND_Y_OFFSET);
    return results;
  }, [mapScene, uniquePlayers.length, fireCenterY]);

  return (
    <group position={[0, 0, 0]}>
      {uniquePlayers.map((player, i) => {
        const angle = (i / uniquePlayers.length) * Math.PI * 2 - Math.PI / 2;
        const x = fireCenterX + Math.cos(angle) * radius;
        const z = fireCenterZ + Math.sin(angle) * radius;
        const homeY = homeGroundYs ? homeGroundYs[i] : fireCenterY;
        const isLocal = player.id === localUserId || (!!localUsername && player.username === localUsername);

        return (
          <GLBCharacterWithPosTracking
            key={player.id}
            player={{ ...player, isSelected: selectedId === player.id }}
            homePosition={[x, homeY, z]}
            onClick={() => onSelect?.(player.id)}
            isNight={isNight}
            index={i}
            isLocalPlayer={isLocal}
            keys={keys}
            chatBubble={activeBubbles.get(player.id)}
            isBeingHit={hitTargetId === player.id}
            isJumping={jumpingId === player.id}
            hitEmoji={hitEmoji}
            positionsRef={playerPositionsRef}
            facingRef={isLocal ? playerFacingRef : undefined}
            emojiPickerOpen={isLocal ? emojiPickerOpen : false}
            emojiSelectedIndex={isLocal ? emojiSelectedIndex : 0}
            floatingEmoji={floatingEmojis.get(player.id)}
            mapScene={mapScene}
            onLocalPlayerPosition={isLocal ? onLocalPlayerPosition : undefined}
          />
        );
      })}
    </group>
  );
}

// ─── Wrapper that tracks position + facing for proximity detection ────────
function GLBCharacterWithPosTracking(props: {
  player: PlayerData;
  homePosition: [number, number, number];
  onClick?: () => void;
  isNight: boolean;
  index: number;
  isLocalPlayer: boolean;
  keys: React.RefObject<Set<string>>;
  chatBubble?: { content: string; timestamp: number };
  isBeingHit?: boolean;
  isJumping?: boolean;
  hitEmoji?: string;
  positionsRef: React.RefObject<Map<string, THREE.Vector3>>;
  facingRef?: React.RefObject<THREE.Vector3>;
  emojiPickerOpen?: boolean;
  emojiSelectedIndex?: number;
  floatingEmoji?: { emoji: string; timestamp: number };
  mapScene?: THREE.Object3D | null;
  onLocalPlayerPosition?: (pos: THREE.Vector3, rot: number) => void;
}) {
  const { positionsRef, facingRef, mapScene, onLocalPlayerPosition, ...charProps } = props;
  const trackRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (trackRef.current && positionsRef.current) {
      positionsRef.current.set(
        props.player.id,
        trackRef.current.getWorldPosition(new THREE.Vector3()),
      );
      // Track facing direction for local player
      if (facingRef && trackRef.current) {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(trackRef.current.quaternion);
        // Get rotation from child group (the actual character group)
        const child = trackRef.current.children[0];
        if (child) {
          dir.set(0, 0, -1).applyQuaternion(child.quaternion);
        }
        facingRef.current.copy(dir);
      }
      // Report local player position for third-person camera
      // Use the logical facing rotation (without model offset) for correct camera placement
      if (onLocalPlayerPosition && props.isLocalPlayer) {
        const worldPos = trackRef.current.getWorldPosition(new THREE.Vector3());
        // The child group's rotation.y includes MODEL_FACING_OFFSET, subtract it for logical rotation
        const child = trackRef.current.children[0];
        const visualRot = child ? child.rotation.y : 0;
        const logicalRot = visualRot - MODEL_FACING_OFFSET;
        onLocalPlayerPosition(worldPos, logicalRot);
      }
    }
  });

  return (
    <group ref={trackRef}>
      <GLBCharacter {...charProps} mapScene={mapScene} />
    </group>
  );
}
