'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
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

// ─── Role Visual Config ───────────────────────────────
interface RoleCostume {
  bodyColor: string;
  hatColor?: string;
  hatType?:
    | 'pointy'
    | 'tophat'
    | 'hood'
    | 'crown'
    | 'jester'
    | 'helmet'
    | 'bandana'
    | 'goggles'
    | 'none';
  accessoryColor?: string;
  capeColor?: string;
  eyeColor?: string;
  glowColor?: string;
  emoji: string;
}

const ROLE_COSTUMES: Record<string, RoleCostume> = {
  // ── Village Team — Active ──
  villager: { bodyColor: '#8B7355', hatType: 'none', emoji: '🏘️', eyeColor: '#2C1810' },
  doctor: {
    bodyColor: '#FFFFFF',
    hatType: 'tophat',
    hatColor: '#FFFFFF',
    accessoryColor: '#E74C3C',
    emoji: '💊',
    glowColor: '#3498DB',
    eyeColor: '#2C5F8A',
  },
  gunner: {
    bodyColor: '#8B6914',
    hatType: 'bandana',
    hatColor: '#B8860B',
    accessoryColor: '#DAA520',
    emoji: '🔫',
    eyeColor: '#4A3728',
  },
  seer: {
    bodyColor: '#7B3FA0',
    hatType: 'pointy',
    hatColor: '#9B59B6',
    accessoryColor: '#D8B4FE',
    emoji: '🔮',
    glowColor: '#9B59B6',
    eyeColor: '#6B21A8',
  },
  aura_seer: {
    bodyColor: '#E6E6FA',
    hatType: 'hood',
    hatColor: '#F0E6FF',
    accessoryColor: '#C4B5FD',
    emoji: '✨',
    glowColor: '#E6E6FA',
    eyeColor: '#7C3AED',
  },
  medium: {
    bodyColor: '#4A6670',
    hatType: 'hood',
    hatColor: '#5A7A8A',
    accessoryColor: '#7FDBFF',
    emoji: '👻',
    glowColor: '#7FDBFF',
    eyeColor: '#0EA5E9',
  },
  witch: {
    bodyColor: '#4A1A6B',
    hatType: 'pointy',
    hatColor: '#6C3483',
    accessoryColor: '#27AE60',
    emoji: '🧙',
    glowColor: '#6C3483',
    eyeColor: '#A855F7',
  },
  avenger: {
    bodyColor: '#7A1A1A',
    hatType: 'hood',
    hatColor: '#8B2020',
    capeColor: '#C0392B',
    emoji: '⚔️',
    glowColor: '#DC2626',
    eyeColor: '#DC2626',
  },
  beast_hunter: {
    bodyColor: '#5C4A1E',
    hatType: 'helmet',
    hatColor: '#6B5A2E',
    accessoryColor: '#8B6914',
    emoji: '🪤',
    eyeColor: '#78350F',
  },
  cursed: { bodyColor: '#4A5568', hatType: 'none', emoji: '🌑', eyeColor: '#374151' },
  bodyguard: {
    bodyColor: '#2C3E8C',
    hatType: 'helmet',
    hatColor: '#1E3A7A',
    accessoryColor: '#C0C0C0',
    emoji: '🛡️',
    glowColor: '#3B82F6',
    eyeColor: '#1E40AF',
  },
  priest: {
    bodyColor: '#F5F5DC',
    hatType: 'hood',
    hatColor: '#F0EAD6',
    accessoryColor: '#FFD700',
    emoji: '✝️',
    glowColor: '#FBBF24',
    eyeColor: '#92400E',
  },

  // ── Village Team — Passive ──
  elder: {
    bodyColor: '#8B7D6B',
    hatType: 'none',
    accessoryColor: '#C0C0C0',
    emoji: '👴',
    eyeColor: '#5C4B3A',
  },
  baker: {
    bodyColor: '#DEB887',
    hatType: 'tophat',
    hatColor: '#F5DEB3',
    accessoryColor: '#D2691E',
    emoji: '🍞',
    eyeColor: '#8B4513',
  },
  drunk: {
    bodyColor: '#6B4423',
    hatType: 'none',
    accessoryColor: '#8B0000',
    emoji: '🍺',
    eyeColor: '#4A2810',
  },
  mayor: {
    bodyColor: '#2F4F4F',
    hatType: 'tophat',
    hatColor: '#1C1C1C',
    accessoryColor: '#FFD700',
    emoji: '🎩',
    glowColor: '#D4AF37',
    eyeColor: '#1F2937',
  },
  pacifist: {
    bodyColor: '#E8F5E9',
    hatType: 'none',
    accessoryColor: '#4CAF50',
    emoji: '☮️',
    glowColor: '#66BB6A',
    eyeColor: '#2E7D32',
  },
  sleepwalker: {
    bodyColor: '#B0C4DE',
    hatType: 'none',
    accessoryColor: '#778899',
    emoji: '😴',
    eyeColor: '#4682B4',
  },
  hermit: {
    bodyColor: '#556B2F',
    hatType: 'hood',
    hatColor: '#6B8E23',
    accessoryColor: '#8FBC8F',
    emoji: '🏔️',
    eyeColor: '#3B5323',
  },
  apprentice_seer: {
    bodyColor: '#9370DB',
    hatType: 'pointy',
    hatColor: '#BA55D3',
    accessoryColor: '#E6E6FA',
    emoji: '🌟',
    glowColor: '#C084FC',
    eyeColor: '#7B2FBE',
  },

  // ── Werewolf Team ──
  werewolf: {
    bodyColor: '#5A2020',
    hatType: 'none',
    accessoryColor: '#8B0000',
    emoji: '🐺',
    glowColor: '#8B0000',
    eyeColor: '#FFA500',
  },
  alpha_werewolf: {
    bodyColor: '#3D0A0A',
    hatType: 'crown',
    hatColor: '#8B0000',
    accessoryColor: '#4A0000',
    emoji: '🐺',
    glowColor: '#B91C1C',
    eyeColor: '#FF4500',
  },
  werewolf_shaman: {
    bodyColor: '#4A1A4A',
    hatType: 'hood',
    hatColor: '#5A2A5A',
    accessoryColor: '#800080',
    emoji: '🐺',
    glowColor: '#9333EA',
    eyeColor: '#D946EF',
  },
  werewolf_seer: {
    bodyColor: '#1A1A4A',
    hatType: 'hood',
    hatColor: '#2A2A6A',
    accessoryColor: '#191970',
    emoji: '🐺',
    glowColor: '#3B82F6',
    eyeColor: '#60A5FA',
  },
  nightmare_wolf: {
    bodyColor: '#1A0A2E',
    hatType: 'hood',
    hatColor: '#2D1B4E',
    accessoryColor: '#4B0082',
    emoji: '🐺',
    glowColor: '#7C3AED',
    eyeColor: '#A78BFA',
  },
  shadow_wolf: {
    bodyColor: '#1A1A1A',
    hatType: 'hood',
    hatColor: '#2A2A2A',
    accessoryColor: '#333333',
    emoji: '🐺',
    glowColor: '#4B5563',
    eyeColor: '#9CA3AF',
  },
  blood_moon_wolf: {
    bodyColor: '#4A0000',
    hatType: 'none',
    accessoryColor: '#8B0000',
    emoji: '🐺',
    glowColor: '#DC2626',
    eyeColor: '#EF4444',
  },
  howler_wolf: {
    bodyColor: '#4A3728',
    hatType: 'none',
    accessoryColor: '#8B6914',
    emoji: '🐺',
    glowColor: '#D97706',
    eyeColor: '#F59E0B',
  },
  lone_wolf: {
    bodyColor: '#3D2B1F',
    hatType: 'bandana',
    hatColor: '#5C4033',
    accessoryColor: '#6B4423',
    emoji: '🐺',
    glowColor: '#92400E',
    eyeColor: '#B45309',
  },
  venom_wolf: {
    bodyColor: '#1B4D3E',
    hatType: 'none',
    accessoryColor: '#228B22',
    emoji: '🐺',
    glowColor: '#16A34A',
    eyeColor: '#22C55E',
  },

  // ── Solo Team ──
  headhunter: {
    bodyColor: '#2C3E50',
    hatType: 'hood',
    hatColor: '#34495E',
    accessoryColor: '#E74C3C',
    emoji: '🎯',
    glowColor: '#EF4444',
    eyeColor: '#94A3B8',
  },
  fool: {
    bodyColor: '#FF6B6B',
    hatType: 'jester',
    hatColor: '#FFD93D',
    accessoryColor: '#FF6B6B',
    emoji: '🃏',
    glowColor: '#FBBF24',
    eyeColor: '#F59E0B',
  },
  bomber: {
    bodyColor: '#CC5500',
    hatType: 'goggles',
    hatColor: '#FF8C00',
    accessoryColor: '#FFD700',
    emoji: '💣',
    glowColor: '#F97316',
    eyeColor: '#EA580C',
  },
  serial_killer: {
    bodyColor: '#1C1C1C',
    hatType: 'hood',
    hatColor: '#2D2D2D',
    accessoryColor: '#B22222',
    emoji: '🔪',
    glowColor: '#991B1B',
    eyeColor: '#EF4444',
  },
  cupid: {
    bodyColor: '#FFB6C1',
    hatType: 'none',
    accessoryColor: '#FF69B4',
    emoji: '💘',
    glowColor: '#EC4899',
    eyeColor: '#DB2777',
  },
  arsonist: {
    bodyColor: '#8B2500',
    hatType: 'bandana',
    hatColor: '#CD3700',
    accessoryColor: '#FF4500',
    emoji: '🔥',
    glowColor: '#EF4444',
    eyeColor: '#F97316',
  },
  survivor: {
    bodyColor: '#696969',
    hatType: 'helmet',
    hatColor: '#808080',
    accessoryColor: '#A9A9A9',
    emoji: '🦺',
    eyeColor: '#6B7280',
  },
  amnesiac: {
    bodyColor: '#B8B8D1',
    hatType: 'none',
    accessoryColor: '#9898B8',
    emoji: '❓',
    glowColor: '#A78BFA',
    eyeColor: '#8B8BB8',
  },
  doppelganger: {
    bodyColor: '#4A4A6A',
    hatType: 'hood',
    hatColor: '#5A5A7A',
    accessoryColor: '#6A6A8A',
    emoji: '🪞',
    glowColor: '#818CF8',
    eyeColor: '#6366F1',
  },
  jester: {
    bodyColor: '#FF4500',
    hatType: 'jester',
    hatColor: '#FF6347',
    accessoryColor: '#FFD700',
    emoji: '🤡',
    glowColor: '#FB923C',
    eyeColor: '#EA580C',
  },
};

const DEFAULT_COSTUME: RoleCostume = {
  bodyColor: '#6B8CFF',
  hatType: 'none',
  emoji: '❓',
  eyeColor: '#2C1810',
};

function getCostume(role?: Role | string): RoleCostume {
  if (!role) return DEFAULT_COSTUME;
  return ROLE_COSTUMES[role] || DEFAULT_COSTUME;
}

// ─── Hat Components ──────────────────────────────
function PointyHat({ color }: { color: string }) {
  return (
    <group position={[0, 1.35, 0]}>
      {/* Hat brim */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.38, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Hat cone */}
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.22, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Hat tip star */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

function TopHat({ color }: { color: string }) {
  return (
    <group position={[0, 1.35, 0]}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.35, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.3, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Red cross band */}
      <mesh position={[0, 0.06, 0.19]}>
        <boxGeometry args={[0.08, 0.08, 0.01]} />
        <meshBasicMaterial color="#E74C3C" />
      </mesh>
    </group>
  );
}

function Hood({ color }: { color: string }) {
  return (
    <group position={[0, 1.25, -0.05]}>
      <mesh>
        <sphereGeometry args={[0.34, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Crown({ color }: { color: string }) {
  return (
    <group position={[0, 1.38, 0]}>
      <mesh>
        <cylinderGeometry args={[0.25, 0.28, 0.12, 6]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Crown points */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 0.1, Math.sin(a) * 0.22]}>
            <coneGeometry args={[0.04, 0.12, 4]} />
            <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function JesterHat({ color, color2 }: { color: string; color2: string }) {
  return (
    <group position={[0, 1.35, 0]}>
      {/* Left droop */}
      <mesh position={[-0.2, 0.15, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.12, 0.35, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[-0.3, 0.28, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Right droop */}
      <mesh position={[0.2, 0.15, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.12, 0.35, 6]} />
        <meshStandardMaterial color={color2} roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.28, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Center droop */}
      <mesh position={[0, 0.22, 0.05]}>
        <coneGeometry args={[0.1, 0.3, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.35, 0.08]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

function Helmet({ color }: { color: string }) {
  return (
    <group position={[0, 1.3, 0]}>
      <mesh>
        <sphereGeometry args={[0.33, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, -0.05, 0.25]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.28, 0.06, 0.08]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Bandana({ color }: { color: string }) {
  return (
    <group position={[0, 1.2, 0]}>
      {/* Headband */}
      <mesh rotation={[0.15, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Knot tails at back */}
      <mesh position={[0.08, 0, -0.25]} rotation={[0.5, 0.3, 0]}>
        <boxGeometry args={[0.06, 0.18, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.06, -0.05, -0.25]} rotation={[0.7, -0.2, 0]}>
        <boxGeometry args={[0.06, 0.15, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Goggles({ color }: { color: string }) {
  return (
    <group position={[0, 1.35, 0]}>
      {/* Strap */}
      <mesh rotation={[0.1, 0, 0]}>
        <torusGeometry args={[0.3, 0.02, 6, 16]} />
        <meshStandardMaterial color="#555" roughness={0.5} />
      </mesh>
      {/* Left lens */}
      <mesh position={[-0.12, -0.08, 0.26]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[-0.12, -0.08, 0.28]}>
        <circleGeometry args={[0.06, 8]} />
        <meshBasicMaterial color="#88DDFF" transparent opacity={0.6} />
      </mesh>
      {/* Right lens */}
      <mesh position={[0.12, -0.08, 0.26]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0.12, -0.08, 0.28]}>
        <circleGeometry args={[0.06, 8]} />
        <meshBasicMaterial color="#88DDFF" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function RoleHat({ type, color, color2 }: { type: string; color: string; color2?: string }) {
  switch (type) {
    case 'pointy':
      return <PointyHat color={color} />;
    case 'tophat':
      return <TopHat color={color} />;
    case 'hood':
      return <Hood color={color} />;
    case 'crown':
      return <Crown color={color} />;
    case 'jester':
      return <JesterHat color={color} color2={color2 || '#6B6BFF'} />;
    case 'helmet':
      return <Helmet color={color} />;
    case 'bandana':
      return <Bandana color={color} />;
    case 'goggles':
      return <Goggles color={color} />;
    default:
      return null;
  }
}

// ─── Werewolf Ears ───────────────────────────────
function WolfEars({ color }: { color: string }) {
  return (
    <>
      {/* Left ear */}
      <group position={[-0.2, 1.38, 0]} rotation={[0, 0, -0.3]}>
        <mesh>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.02, 0.01]} scale={0.65}>
          <coneGeometry args={[0.06, 0.14, 4]} />
          <meshStandardMaterial color="#FFB0B0" roughness={0.6} />
        </mesh>
      </group>
      {/* Right ear */}
      <group position={[0.2, 1.38, 0]} rotation={[0, 0, 0.3]}>
        <mesh>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.02, 0.01]} scale={0.65}>
          <coneGeometry args={[0.06, 0.14, 4]} />
          <meshStandardMaterial color="#FFB0B0" roughness={0.6} />
        </mesh>
      </group>
    </>
  );
}

// ─── Cape ────────────────────────────────────────
function Cape({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.65, -0.22]} rotation={[0.15, 0, 0]}>
      <boxGeometry args={[0.4, 0.55, 0.04]} />
      <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Role-specific Accessory ────────────────────────
function RoleAccessory({ role, color }: { role: string; color: string }) {
  switch (role) {
    case 'doctor':
      return (
        <group position={[0, 0.82, 0.18]}>
          <mesh>
            <torusGeometry args={[0.08, 0.015, 6, 8, Math.PI]} />
            <meshStandardMaterial color="#888" roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      );
    case 'gunner':
      return (
        <group position={[0, 0.45, 0]}>
          <mesh rotation={[0, 0, 0.3]}>
            <torusGeometry args={[0.26, 0.025, 6, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0]}
                rotation={[0, 0, a]}
              >
                <cylinderGeometry args={[0.015, 0.015, 0.05, 4]} />
                <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.7} />
              </mesh>
            );
          })}
        </group>
      );
    case 'seer':
      return (
        <group position={[0.35, 0.7, 0.1]}>
          <Float speed={3} floatIntensity={0.1}>
            <mesh>
              <sphereGeometry args={[0.08, 10, 10]} />
              <meshStandardMaterial
                color="#D8B4FE"
                roughness={0.1}
                metalness={0.3}
                transparent
                opacity={0.8}
              />
            </mesh>
            <pointLight color="#9B59B6" intensity={0.5} distance={1} />
          </Float>
        </group>
      );
    case 'witch':
      return (
        <>
          <group position={[0.3, 0.8, 0.1]}>
            <Float speed={2} floatIntensity={0.08}>
              <mesh>
                <cylinderGeometry args={[0.025, 0.04, 0.1, 6]} />
                <meshStandardMaterial color="#27AE60" roughness={0.2} transparent opacity={0.8} />
              </mesh>
            </Float>
          </group>
          <group position={[-0.3, 0.75, 0.1]}>
            <Float speed={2.5} floatIntensity={0.08}>
              <mesh>
                <cylinderGeometry args={[0.025, 0.04, 0.1, 6]} />
                <meshStandardMaterial color="#E74C3C" roughness={0.2} transparent opacity={0.8} />
              </mesh>
            </Float>
          </group>
        </>
      );
    case 'bomber':
      return (
        <group position={[0.28, 0.4, 0.1]} rotation={[0, 0, 0.3]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
            <meshStandardMaterial color="#CC3333" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.06, 4]} />
            <meshStandardMaterial color="#333" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial color="#FFAA00" />
          </mesh>
          <pointLight position={[0, 0.12, 0]} color="#FF6600" intensity={0.3} distance={0.5} />
        </group>
      );
    case 'medium':
      return (
        <group position={[0.32, 0.6, 0.1]}>
          <Float speed={1.5} floatIntensity={0.06}>
            <mesh>
              <boxGeometry args={[0.06, 0.1, 0.06]} />
              <meshStandardMaterial color="#5A7A8A" roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.04, 0.06, 0.04]} />
              <meshBasicMaterial color="#7FDBFF" transparent opacity={0.6} />
            </mesh>
            <pointLight color="#7FDBFF" intensity={0.4} distance={0.8} />
          </Float>
        </group>
      );
    case 'headhunter':
      return (
        <group position={[0.15, 1.12, 0.27]}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.06, 0.008, 6, 12]} />
            <meshStandardMaterial color="#E74C3C" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      );
    case 'beast_hunter':
      return (
        <group position={[0.32, 0.35, 0.1]} rotation={[0, 0, 0.2]}>
          <mesh>
            <torusGeometry args={[0.06, 0.015, 6, 8]} />
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.7} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0]}>
                <coneGeometry args={[0.01, 0.04, 3]} />
                <meshStandardMaterial color="#999" roughness={0.3} metalness={0.6} />
              </mesh>
            );
          })}
        </group>
      );
    default:
      return null;
  }
}

// ─── Keyboard Input Hook ─────────────────────────
function useKeyboard() {
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      // Capture arrow keys + F for attack, avoid interfering with chat input
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'f', 'F'].includes(e.key)) {
        // Don't capture if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        keys.current.add(e.key.toLowerCase());
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const onBlur = () => keys.current.clear();
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return keys;
}

// ─── Wandering Logic (for NPC/bots) ──────────────────────────────
function useWander(homePos: [number, number, number], isAlive: boolean, seed: number) {
  const posRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const targetRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const timerRef = useRef(seed * 10); // stagger start
  const speedRef = useRef(0.3 + Math.random() * 0.3);
  const rotRef = useRef(0);
  const isMovingRef = useRef(false);
  const wanderRadius = 1.2;

  useFrame((_, delta) => {
    if (!isAlive) {
      isMovingRef.current = false;
      return;
    }

    timerRef.current -= delta;

    // Pick a new random target near home
    if (timerRef.current <= 0) {
      timerRef.current = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * wanderRadius;
      targetRef.current.set(
        homePos[0] + Math.cos(angle) * dist,
        homePos[1],
        homePos[2] + Math.sin(angle) * dist,
      );
    }

    // Move towards target
    const current = posRef.current;
    const target = targetRef.current;
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      isMovingRef.current = true;
      const step = Math.min(delta * speedRef.current, dist);
      current.x += (dx / dist) * step;
      current.z += (dz / dist) * step;

      // Rotate to face movement direction
      const targetRot = Math.atan2(dx, dz);
      let rotDiff = targetRot - rotRef.current;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      rotRef.current += rotDiff * delta * 3;
    } else {
      isMovingRef.current = false;
    }
  });

  return { posRef, rotRef, isMovingRef };
}

// ─── Player-controlled Movement ──────────────────────────────
function usePlayerControl(
  homePos: [number, number, number],
  isAlive: boolean,
  keys: React.RefObject<Set<string>>,
) {
  const posRef = useRef(new THREE.Vector3(homePos[0], homePos[1], homePos[2]));
  const rotRef = useRef(0);
  const isMovingRef = useRef(false);
  const speed = 2.0;
  const maxRadius = 5; // max distance from home

  useFrame((_, delta) => {
    if (!isAlive || !keys.current) {
      isMovingRef.current = false;
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    if (keys.current.has('arrowup')) moveZ -= 1;
    if (keys.current.has('arrowdown')) moveZ += 1;
    if (keys.current.has('arrowleft')) moveX -= 1;
    if (keys.current.has('arrowright')) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;
    isMovingRef.current = isMoving;

    if (isMoving) {
      // Normalize diagonal movement
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;

      const newX = posRef.current.x + moveX * speed * delta;
      const newZ = posRef.current.z + moveZ * speed * delta;

      // Boundary check — stay within maxRadius of home
      const distFromHome = Math.sqrt((newX - homePos[0]) ** 2 + (newZ - homePos[2]) ** 2);

      if (distFromHome < maxRadius) {
        posRef.current.x = newX;
        posRef.current.z = newZ;
      }

      // Face movement direction
      const targetRot = Math.atan2(moveX, moveZ);
      let rotDiff = targetRot - rotRef.current;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      rotRef.current += rotDiff * delta * 8; // faster rotation for player
    }
  });

  return { posRef, rotRef, isMovingRef };
}

// ─── Single Chibi Character ─────────────────────────
function ChibiCharacter({
  player,
  homePosition,
  onClick,
  isNight,
  index,
  isLocalPlayer,
  keys,
  chatBubble,
  isAttacking,
  isBeingHit,
  hitEmoji,
}: {
  player: PlayerData;
  homePosition: [number, number, number];
  onClick?: () => void;
  isNight: boolean;
  index: number;
  isLocalPlayer: boolean;
  keys: React.RefObject<Set<string>>;
  chatBubble?: { content: string; timestamp: number };
  isAttacking?: boolean;
  isBeingHit?: boolean;
  hitEmoji?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const costume = useMemo(() => getCostume(player.role), [player.role]);
  const bodyColor = useMemo(() => new THREE.Color(costume.bodyColor), [costume.bodyColor]);
  const deadColor = useMemo(() => new THREE.Color('#888888'), []); // grey for dead players
  const skinColor = useMemo(() => new THREE.Color('#FFD5B8'), []);
  const eyeColor = useMemo(
    () => new THREE.Color(costume.eyeColor || '#2C1810'),
    [costume.eyeColor],
  );
  const isWolf =
    player.role &&
    [
      'werewolf',
      'alpha_werewolf',
      'werewolf_shaman',
      'werewolf_seer',
      'nightmare_wolf',
      'shadow_wolf',
      'blood_moon_wolf',
      'howler_wolf',
      'lone_wolf',
      'venom_wolf',
    ].includes(player.role);

  // Movement — local player uses keyboard, bots/others use AI wander
  const wanderState = useWander(homePosition, !isLocalPlayer && player.isAlive, index);
  const playerState = usePlayerControl(homePosition, isLocalPlayer && player.isAlive, keys);

  const posRef = isLocalPlayer ? playerState.posRef : wanderState.posRef;
  const rotRef = isLocalPlayer ? playerState.rotRef : wanderState.rotRef;
  const isMovingRef = isLocalPlayer ? playerState.isMovingRef : wanderState.isMovingRef;

  // Animation refs
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const bodyMeshRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  // Animation state
  const blinkTimerRef = useRef(3 + Math.random() * 5);
  const isBlinkingRef = useRef(false);
  const blinkDurationRef = useRef(0);
  const idleFidgetTimerRef = useRef(5 + Math.random() * 8);
  const fidgetTypeRef = useRef(0); // 0 = none, 1 = look left, 2 = look right, 3 = bounce
  const fidgetProgressRef = useRef(0);
  const prevVelRef = useRef({ x: 0, z: 0 });

  // Attack/hit animation state
  const attackAnimRef = useRef(0); // 0 = no attack, >0 = attack progress in seconds
  const hitAnimRef = useRef(0); // 0 = no hit, >0 = hit reaction progress
  const hitShakeRef = useRef(0);

  // Trigger attack animation when isAttacking changes to true
  useEffect(() => {
    if (isAttacking) {
      attackAnimRef.current = 0.001; // start the animation
    }
  }, [isAttacking]);

  // Trigger hit animation when isBeingHit changes to true
  useEffect(() => {
    if (isBeingHit) {
      hitAnimRef.current = 0.001; // start hit reaction
      hitShakeRef.current = 1.0;
    }
  }, [isBeingHit]);

  // Position + full animation loop
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (player.isAlive) {
      // ── Position sync ──
      groupRef.current.position.x = posRef.current.x;
      groupRef.current.position.z = posRef.current.z;
      groupRef.current.rotation.y = rotRef.current;

      const isMoving = isMovingRef.current;

      // ── Walking bounce ──
      const walkBounce = isMoving ? Math.abs(Math.sin(t * 10)) * 0.06 : 0;
      const breathe = Math.sin(t * 1.5 + index) * 0.03;
      groupRef.current.position.y = homePosition[1] + breathe + walkBounce;

      // ── Leg animation (alternating legs) ──
      if (leftLegRef.current && rightLegRef.current) {
        if (isMoving) {
          const legSwing = Math.sin(t * 10) * 0.4;
          leftLegRef.current.rotation.x = legSwing;
          rightLegRef.current.rotation.x = -legSwing;
        } else {
          leftLegRef.current.rotation.x *= 0.85;
          rightLegRef.current.rotation.x *= 0.85;
        }
      }

      // ── Arm swing ──
      if (leftArmRef.current && rightArmRef.current) {
        // Attack animation — right arm punch forward
        if (attackAnimRef.current > 0) {
          attackAnimRef.current += delta;
          const p = attackAnimRef.current;
          if (p < 0.15) {
            // Wind up — pull arm back
            rightArmRef.current.rotation.x = -(p / 0.15) * 1.5;
            rightArmRef.current.rotation.z = -(0.3 + (p / 0.15) * 0.3);
          } else if (p < 0.25) {
            // Punch forward!
            const t2 = (p - 0.15) / 0.1;
            rightArmRef.current.rotation.x = -1.5 + t2 * 3.0;
            rightArmRef.current.rotation.z = -0.6 + t2 * 0.6;
          } else if (p < 0.45) {
            // Hold + return
            const t2 = (p - 0.25) / 0.2;
            rightArmRef.current.rotation.x = 1.5 * (1 - t2);
            rightArmRef.current.rotation.z = -0.3 * (1 - t2) - 0.3;
          } else {
            // Done
            attackAnimRef.current = 0;
            rightArmRef.current.rotation.x = 0;
            rightArmRef.current.rotation.z = -0.3;
          }
          // Left arm stays still during attack
          leftArmRef.current.rotation.x = 0;
        } else if (isMoving) {
          const armSwing = Math.sin(t * 10) * 0.35;
          leftArmRef.current.rotation.x = -armSwing;
          rightArmRef.current.rotation.x = armSwing;
        } else {
          // Idle arm sway
          leftArmRef.current.rotation.x = Math.sin(t * 0.8 + 1) * 0.05;
          rightArmRef.current.rotation.x = Math.sin(t * 0.8 + 2) * 0.05;
        }
      }

      // ── Hit reaction — shake body ──
      if (hitShakeRef.current > 0) {
        hitShakeRef.current -= delta * 3;
        if (hitShakeRef.current < 0) hitShakeRef.current = 0;
        const shake = Math.sin(t * 40) * hitShakeRef.current * 0.15;
        groupRef.current.position.x = posRef.current.x + shake;
        // Tilt head back from impact
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = -hitShakeRef.current * 0.3;
        }
      }

      // ── Hit animation progress ──
      if (hitAnimRef.current > 0) {
        hitAnimRef.current += delta;
        if (hitAnimRef.current > 1.0) {
          hitAnimRef.current = 0;
        }
      }

      // ── Body tilt when turning ──
      if (bodyMeshRef.current) {
        // Calculate velocity delta for lean
        const vx = posRef.current.x - (prevVelRef.current.x || posRef.current.x);
        const vz = posRef.current.z - (prevVelRef.current.z || posRef.current.z);
        prevVelRef.current = { x: posRef.current.x, z: posRef.current.z };

        // Lean into movement direction
        const targetLeanZ = isMoving ? -vx * 3 : 0;
        const targetLeanX = isMoving ? vz * 3 : 0;
        bodyMeshRef.current.rotation.z +=
          (THREE.MathUtils.clamp(targetLeanZ, -0.15, 0.15) - bodyMeshRef.current.rotation.z) * 0.1;
        bodyMeshRef.current.rotation.x +=
          (THREE.MathUtils.clamp(targetLeanX, -0.1, 0.1) - bodyMeshRef.current.rotation.x) * 0.1;
      }

      // ── Head bobbing while walking ──
      if (headGroupRef.current) {
        if (isMoving) {
          headGroupRef.current.position.y = 1.0 + Math.sin(t * 10 + Math.PI / 4) * 0.02;
        } else {
          headGroupRef.current.position.y += (1.0 - headGroupRef.current.position.y) * 0.1;
        }

        // ── Idle fidget — head look around ──
        if (!isMoving) {
          idleFidgetTimerRef.current -= delta;
          if (idleFidgetTimerRef.current <= 0 && fidgetTypeRef.current === 0) {
            fidgetTypeRef.current = Math.floor(Math.random() * 3) + 1; // 1-3
            fidgetProgressRef.current = 0;
            idleFidgetTimerRef.current = 5 + Math.random() * 8;
          }

          if (fidgetTypeRef.current > 0) {
            fidgetProgressRef.current += delta;
            const p = fidgetProgressRef.current;

            if (fidgetTypeRef.current === 1 || fidgetTypeRef.current === 2) {
              // Look left or right
              const dir = fidgetTypeRef.current === 1 ? 1 : -1;
              if (p < 0.3) {
                headGroupRef.current.rotation.y = dir * (p / 0.3) * 0.4;
              } else if (p < 1.0) {
                headGroupRef.current.rotation.y = dir * 0.4;
              } else if (p < 1.3) {
                headGroupRef.current.rotation.y = dir * 0.4 * (1 - (p - 1.0) / 0.3);
              } else {
                headGroupRef.current.rotation.y = 0;
                fidgetTypeRef.current = 0;
              }
            } else if (fidgetTypeRef.current === 3) {
              // Little bounce/nod
              if (p < 0.15) {
                headGroupRef.current.rotation.x = -(p / 0.15) * 0.15;
              } else if (p < 0.3) {
                headGroupRef.current.rotation.x = -0.15 * (1 - (p - 0.15) / 0.15);
              } else if (p < 0.45) {
                headGroupRef.current.rotation.x = (-(p - 0.3) / 0.15) * 0.1;
              } else if (p < 0.6) {
                headGroupRef.current.rotation.x = -0.1 * (1 - (p - 0.45) / 0.15);
              } else {
                headGroupRef.current.rotation.x = 0;
                fidgetTypeRef.current = 0;
              }
            }
          } else {
            headGroupRef.current.rotation.y *= 0.95;
            headGroupRef.current.rotation.x *= 0.95;
          }
        } else {
          // Reset head rotation when moving
          headGroupRef.current.rotation.y *= 0.9;
          headGroupRef.current.rotation.x *= 0.9;
          fidgetTypeRef.current = 0;
        }
      }

      // ── Eye blink ──
      if (leftEyeRef.current && rightEyeRef.current) {
        blinkTimerRef.current -= delta;
        if (blinkTimerRef.current <= 0 && !isBlinkingRef.current) {
          isBlinkingRef.current = true;
          blinkDurationRef.current = 0;
          blinkTimerRef.current = 2 + Math.random() * 5;
        }

        if (isBlinkingRef.current) {
          blinkDurationRef.current += delta;
          const blinkT = blinkDurationRef.current;
          const blinkScale =
            blinkT < 0.06 ? 1 - blinkT / 0.06 : blinkT < 0.12 ? (blinkT - 0.06) / 0.06 : 1;
          leftEyeRef.current.scale.y = Math.max(0.05, blinkScale);
          rightEyeRef.current.scale.y = Math.max(0.05, blinkScale);
          if (blinkT >= 0.12) {
            isBlinkingRef.current = false;
            leftEyeRef.current.scale.y = 1;
            rightEyeRef.current.scale.y = 1;
          }
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
      {/* Dead ghost overlay — reduce opacity of the entire character */}
      {!player.isAlive && (
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.01, 2, 2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {/* Selection ring */}
      {player.isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.62, 24]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.25, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={player.isAlive ? 0.2 : 0.1} />
      </mesh>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.08, 0.15, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.06, 0.15, 3, 6]} />
          <meshStandardMaterial
            color={player.isAlive ? bodyColor : deadColor}
            roughness={0.7}
            transparent={!player.isAlive}
            opacity={player.isAlive ? 1 : 0.5}
          />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.11, 0.03]}>
          <sphereGeometry args={[0.065, 6, 6]} />
          <meshStandardMaterial color={player.isAlive ? '#3A2518' : '#444'} roughness={0.8} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.08, 0.15, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.06, 0.15, 3, 6]} />
          <meshStandardMaterial
            color={player.isAlive ? bodyColor : deadColor}
            roughness={0.7}
            transparent={!player.isAlive}
            opacity={player.isAlive ? 1 : 0.5}
          />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.11, 0.03]}>
          <sphereGeometry args={[0.065, 6, 6]} />
          <meshStandardMaterial color={player.isAlive ? '#3A2518' : '#444'} roughness={0.8} />
        </mesh>
      </group>

      {/* Body */}
      <mesh ref={bodyMeshRef} position={[0, 0.52, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.3, 4, 8]} />
        <meshStandardMaterial
          color={player.isAlive ? bodyColor : deadColor}
          roughness={0.6}
          metalness={0.05}
          transparent={!player.isAlive}
          opacity={player.isAlive ? 1 : 0.5}
        />
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.28, 0.55, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.055, 0.2, 3, 6]} />
        <meshStandardMaterial
          color={player.isAlive ? bodyColor : deadColor}
          roughness={0.7}
          transparent={!player.isAlive}
          opacity={player.isAlive ? 1 : 0.5}
        />
      </mesh>
      {/* Left Hand */}
      <mesh position={[-0.34, 0.36, 0]}>
        <sphereGeometry args={[0.055, 6, 6]} />
        <meshStandardMaterial
          color={player.isAlive ? skinColor : deadColor}
          roughness={0.5}
          transparent={!player.isAlive}
          opacity={player.isAlive ? 1 : 0.45}
        />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.28, 0.55, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.055, 0.2, 3, 6]} />
        <meshStandardMaterial
          color={player.isAlive ? bodyColor : deadColor}
          roughness={0.7}
          transparent={!player.isAlive}
          opacity={player.isAlive ? 1 : 0.5}
        />
      </mesh>
      {/* Right Hand */}
      <mesh position={[0.34, 0.36, 0]}>
        <sphereGeometry args={[0.055, 6, 6]} />
        <meshStandardMaterial
          color={player.isAlive ? skinColor : deadColor}
          roughness={0.5}
          transparent={!player.isAlive}
          opacity={player.isAlive ? 1 : 0.45}
        />
      </mesh>

      {/* Cape (if role has one) */}
      {player.isAlive && costume.capeColor && <Cape color={costume.capeColor} />}

      {/* Head group — for fidget rotation */}
      <group ref={headGroupRef} position={[0, 1.0, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.28, 14, 14]} />
          <meshStandardMaterial
            color={player.isAlive ? skinColor : deadColor}
            roughness={0.5}
            transparent={!player.isAlive}
            opacity={player.isAlive ? 1 : 0.5}
          />
        </mesh>

        {/* Cheek blush */}
        {player.isAlive && (
          <>
            <mesh position={[-0.18, -0.05, 0.2]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshStandardMaterial color="#FFB0A0" roughness={0.8} transparent opacity={0.5} />
            </mesh>
            <mesh position={[0.18, -0.05, 0.2]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshStandardMaterial color="#FFB0A0" roughness={0.8} transparent opacity={0.5} />
            </mesh>
          </>
        )}

        {/* Eyes */}
        {player.isAlive ? (
          <>
            {/* Eye whites */}
            <group ref={leftEyeRef}>
              <mesh position={[-0.09, 0.03, 0.22]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Pupil */}
              <mesh position={[-0.09, 0.04, 0.26]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshBasicMaterial color={eyeColor} />
              </mesh>
              {/* Shine */}
              <mesh position={[-0.07, 0.06, 0.28]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
            <group ref={rightEyeRef}>
              <mesh position={[0.09, 0.03, 0.22]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Pupil */}
              <mesh position={[0.09, 0.04, 0.26]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshBasicMaterial color={eyeColor} />
              </mesh>
              {/* Shine */}
              <mesh position={[0.11, 0.06, 0.28]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
            {/* Mouth - small happy curve */}
            <mesh position={[0, -0.07, 0.26]}>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshBasicMaterial color="#D4856A" />
            </mesh>
          </>
        ) : (
          <>
            {/* Dead X eyes */}
            <mesh position={[-0.09, 0.04, 0.26]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.06, 0.015, 0.01]} />
              <meshBasicMaterial color="#444" />
            </mesh>
            <mesh position={[-0.09, 0.04, 0.26]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.06, 0.015, 0.01]} />
              <meshBasicMaterial color="#444" />
            </mesh>
            <mesh position={[0.09, 0.04, 0.26]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.06, 0.015, 0.01]} />
              <meshBasicMaterial color="#444" />
            </mesh>
            <mesh position={[0.09, 0.04, 0.26]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.06, 0.015, 0.01]} />
              <meshBasicMaterial color="#444" />
            </mesh>
            {/* Dead mouth */}
            <mesh position={[0, -0.08, 0.26]}>
              <boxGeometry args={[0.06, 0.012, 0.01]} />
              <meshBasicMaterial color="#555" />
            </mesh>
          </>
        )}

        {/* Wolf ears (werewolf team only) */}
        {player.isAlive && isWolf && <WolfEars color={costume.bodyColor} />}

        {/* Hat / Headwear — positions are relative to head group now at [0,0,0] */}
        {player.isAlive && costume.hatType && costume.hatType !== 'none' && (
          <group position={[0, -1.0, 0]}>
            <RoleHat
              type={costume.hatType}
              color={costume.hatColor || costume.bodyColor}
              color2={costume.accessoryColor}
            />
          </group>
        )}
      </group>

      {/* Role-specific accessories */}
      {player.isAlive && player.role && (
        <RoleAccessory role={player.role} color={costume.accessoryColor || '#888'} />
      )}

      {/* Chat bubble */}
      {chatBubble && bubbleOpacity > 0 && (
        <Html
          position={[0, 2.1, 0]}
          center
          distanceFactor={8}
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
            {/* Tail */}
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

      {/* Hit reaction emoji — 💥 SLAP! floating above head */}
      {hitAnimRef.current > 0 && (
        <Html
          position={[0, 2.3, 0]}
          center
          distanceFactor={8}
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
        position={[0, 1.7, 0]}
        center
        distanceFactor={8}
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
}: {
  players: PlayerData[];
  selectedId?: string | null;
  onSelect?: (playerId: string) => void;
  isNight: boolean;
  chatBubbles?: Map<string, { content: string; timestamp: number }>;
}) {
  // Deduplicate players by ID to prevent duplicate key warnings
  const uniquePlayers = useMemo(() => {
    const seen = new Set<string>();
    return players.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [players]);

  const radius = Math.max(3, uniquePlayers.length * 0.4);
  const keys = useKeyboard();
  const localUserId = useAuthStore((s) => s.user?.id);
  const emptyBubbles = useMemo(() => new Map<string, { content: string; timestamp: number }>(), []);
  const activeBubbles = chatBubbles || emptyBubbles;

  // Attack state — track who is attacking and who is being hit
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [hitEmoji, setHitEmoji] = useState('💥');
  const attackCooldownRef = useRef(0);
  // Track all player positions via refs for proximity detection
  const playerPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  // Listen for F key to trigger attack
  useFrame((_, delta) => {
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    if (keys.current.has('f') && attackCooldownRef.current <= 0 && localUserId) {
      keys.current.delete('f'); // consume the keypress
      attackCooldownRef.current = 0.8; // cooldown between attacks

      // Find the nearest other player within attack range
      const myPos = playerPositionsRef.current.get(localUserId);
      if (!myPos) return;

      let nearestId: string | null = null;
      let nearestDist = 2.0; // attack range

      for (const p of uniquePlayers) {
        if (p.id === localUserId || !p.isAlive) continue;
        const otherPos = playerPositionsRef.current.get(p.id);
        if (!otherPos) continue;
        const dist = myPos.distanceTo(otherPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = p.id;
        }
      }

      if (nearestId) {
        // Trigger attack animation locally
        setAttackingId(localUserId);
        setTimeout(() => setAttackingId(null), 500);

        // Emit to server so all players see it
        const socket = getSocket();
        socket.emit('fun:slap', { targetId: nearestId });

        // Play slap sound locally
        if (useUiStore.getState().isSoundEnabled) {
          playSound('slap');
        }
      }
    }
  });

  // Listen for slap events from server
  useEffect(() => {
    const socket = getSocket();

    const onSlapped = ({ attackerId, targetId }: { attackerId: string; targetId: string }) => {
      // Show attacker punching
      setAttackingId(attackerId);
      setTimeout(() => setAttackingId(null), 500);

      // Show target getting hit
      const emojis = ['💥', '⭐', '💫', '🌟', '😵', '🤕', '👊', '🫨'];
      setHitEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
      setHitTargetId(targetId);
      setTimeout(() => setHitTargetId(null), 1000);

      // Play bonk sound for the target (or slap for attacker)
      if (useUiStore.getState().isSoundEnabled) {
        if (targetId === localUserId) {
          playSound('bonk');
        } else if (attackerId !== localUserId) {
          // Other players see someone else slapping — play lighter sound
          playSound('slap');
        }
      }
    };

    socket.on('fun:slapped', onSlapped);
    return () => {
      socket.off('fun:slapped', onSlapped);
    };
  }, [localUserId]);

  return (
    <group position={[0, 0, 0]}>
      {/* Campfire in center */}
      <CampFire isNight={isNight} />

      {uniquePlayers.map((player, i) => {
        const angle = (i / uniquePlayers.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const isLocal = player.id === localUserId;

        return (
          <ChibiCharacterWithPosTracking
            key={player.id}
            player={{ ...player, isSelected: selectedId === player.id }}
            homePosition={[x, 0, z]}
            onClick={() => onSelect?.(player.id)}
            isNight={isNight}
            index={i}
            isLocalPlayer={isLocal}
            keys={keys}
            chatBubble={activeBubbles.get(player.id)}
            isAttacking={attackingId === player.id}
            isBeingHit={hitTargetId === player.id}
            hitEmoji={hitEmoji}
            positionsRef={playerPositionsRef}
          />
        );
      })}
    </group>
  );
}

// ─── Wrapper that tracks position for proximity detection ────────
function ChibiCharacterWithPosTracking(props: {
  player: PlayerData;
  homePosition: [number, number, number];
  onClick?: () => void;
  isNight: boolean;
  index: number;
  isLocalPlayer: boolean;
  keys: React.RefObject<Set<string>>;
  chatBubble?: { content: string; timestamp: number };
  isAttacking?: boolean;
  isBeingHit?: boolean;
  hitEmoji?: string;
  positionsRef: React.RefObject<Map<string, THREE.Vector3>>;
}) {
  const { positionsRef, ...charProps } = props;
  const trackRef = useRef<THREE.Group>(null);

  // Update position tracking every frame
  useFrame(() => {
    if (trackRef.current && positionsRef.current) {
      positionsRef.current.set(
        props.player.id,
        trackRef.current.getWorldPosition(new THREE.Vector3()),
      );
    }
  });

  return (
    <group ref={trackRef}>
      <ChibiCharacter {...charProps} />
    </group>
  );
}

// ─── Campfire ────────────────────────────────
function CampFire({ isNight }: { isNight: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flame1Ref = useRef<THREE.Mesh>(null);
  const flame2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (lightRef.current) {
      lightRef.current.intensity =
        (isNight ? 2.5 : 0.5) + Math.sin(t * 5) * 0.3 + Math.sin(t * 7) * 0.2;
    }
    if (flame1Ref.current) {
      flame1Ref.current.scale.y = 1 + Math.sin(t * 6) * 0.2;
      flame1Ref.current.scale.x = 1 + Math.sin(t * 4 + 1) * 0.1;
      flame1Ref.current.position.x = Math.sin(t * 3) * 0.02;
    }
    if (flame2Ref.current) {
      flame2Ref.current.scale.y = 1 + Math.sin(t * 8 + 2) * 0.3;
      flame2Ref.current.position.x = Math.sin(t * 5 + 1) * 0.03;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Stone ring */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35]}>
            <sphereGeometry args={[0.07, 5, 5]} />
            <meshStandardMaterial color="#666" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Log 1 */}
      <mesh position={[-0.12, 0.1, 0.05]} rotation={[0, 0.3, 0.1]}>
        <cylinderGeometry args={[0.05, 0.06, 0.45, 6]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.9} />
      </mesh>
      {/* Log 2 */}
      <mesh position={[0.12, 0.1, -0.03]} rotation={[0, -0.4, -0.1]}>
        <cylinderGeometry args={[0.05, 0.06, 0.45, 6]} />
        <meshStandardMaterial color="#4A2E16" roughness={0.9} />
      </mesh>
      {/* Log 3 */}
      <mesh position={[0, 0.1, 0.1]} rotation={[0.1, 1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.4, 6]} />
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </mesh>

      {/* Fire light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.5, 0]}
        color="#FF6B35"
        intensity={isNight ? 2.5 : 0.5}
        distance={10}
        decay={2}
      />

      {/* Flame 1 - main */}
      <mesh ref={flame1Ref} position={[0, 0.35, 0]}>
        <coneGeometry args={[0.1, 0.35, 7]} />
        <meshBasicMaterial color="#FF6622" transparent opacity={0.85} />
      </mesh>

      {/* Flame 2 - inner bright */}
      <mesh ref={flame2Ref} position={[0, 0.38, 0]}>
        <coneGeometry args={[0.06, 0.2, 6]} />
        <meshBasicMaterial color="#FFCC44" transparent opacity={0.7} />
      </mesh>

      {/* Flame 3 - tip */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.03, 0.12, 5]} />
        <meshBasicMaterial color="#FFEE88" transparent opacity={0.5} />
      </mesh>

      {/* Embers / sparks */}
      <mesh position={[0.05, 0.6, 0.02]}>
        <sphereGeometry args={[0.01, 4, 4]} />
        <meshBasicMaterial color="#FF8844" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.03, 0.55, -0.02]}>
        <sphereGeometry args={[0.008, 4, 4]} />
        <meshBasicMaterial color="#FFAA44" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
