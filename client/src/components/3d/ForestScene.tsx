'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Cloud, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Procedural Tree ────────────────────────────────
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkColor = useMemo(() => new THREE.Color('#4A3728'), []);
  const leafColor = useMemo(() => new THREE.Color('#2D5A27'), []);
  const darkLeafColor = useMemo(() => new THREE.Color('#1A3A15'), []);

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 1.6, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      {/* Leaves - bottom layer */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.9, 1.4, 7]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} flatShading />
      </mesh>
      {/* Leaves - middle layer */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.7, 1.2, 7]} />
        <meshStandardMaterial color={darkLeafColor} roughness={0.8} flatShading />
      </mesh>
      {/* Leaves - top layer */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <coneGeometry args={[0.45, 0.9, 6]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// ─── Ground ────────────────────────────────
function Ground({ isNight }: { isNight: boolean }) {
  const groundColor = useMemo(
    () => (isNight ? new THREE.Color('#1A2A15') : new THREE.Color('#5A8A3A')),
    [isNight],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <circleGeometry args={[30, 32]} />
      <meshStandardMaterial color={groundColor} roughness={1} />
    </mesh>
  );
}

// ─── Fireflies (Night) ────────────────────────────────
function Fireflies({ count = 30 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 4 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.002;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#FFFF88" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

// ─── Moon ────────────────────────────────
function Moon() {
  return (
    <Float speed={0.5} floatIntensity={0.3}>
      <mesh position={[8, 12, -10]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#C4D7E0" />
      </mesh>
      {/* Moon glow */}
      <pointLight position={[8, 12, -10]} color="#8899BB" intensity={2} distance={40} />
    </Float>
  );
}

// ─── Forest Ring (trees around the clearing) ────────────────────────
function ForestRing() {
  const trees = useMemo(() => {
    const result: { pos: [number, number, number]; scale: number }[] = [];

    // Inner ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const r = 6 + Math.random() * 2;
      result.push({
        pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        scale: 0.7 + Math.random() * 0.6,
      });
    }

    // Outer ring
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.2;
      const r = 10 + Math.random() * 4;
      result.push({
        pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        scale: 0.8 + Math.random() * 0.8,
      });
    }

    // Scattered background
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 10;
      result.push({
        pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        scale: 0.5 + Math.random() * 1.0,
      });
    }

    return result;
  }, []);

  return (
    <>
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}
    </>
  );
}

// ─── Scene Content ────────────────────────────────
function SceneContent({ isNight }: { isNight: boolean }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (ambientRef.current) {
      const target = isNight ? 0.15 : 0.6;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.02;
      const color = isNight ? new THREE.Color('#334466') : new THREE.Color('#FFF8E7');
      ambientRef.current.color.lerp(color, 0.02);
    }
    if (dirRef.current) {
      const target = isNight ? 0.3 : 1.2;
      dirRef.current.intensity += (target - dirRef.current.intensity) * 0.02;
      const color = isNight ? new THREE.Color('#6677AA') : new THREE.Color('#FFE4B5');
      dirRef.current.color.lerp(color, 0.02);
    }
  });

  return (
    <>
      {/* Lights */}
      <ambientLight ref={ambientRef} intensity={isNight ? 0.15 : 0.6} />
      <directionalLight
        ref={dirRef}
        position={isNight ? [5, 10, -5] : [10, 15, 5]}
        intensity={isNight ? 0.3 : 1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Ground */}
      <Ground isNight={isNight} />

      {/* Forest */}
      <ForestRing />

      {/* Fog */}
      <fog attach="fog" args={[isNight ? '#0B1026' : '#C8DFF0', 8, 30]} />

      {/* Night elements */}
      {isNight && (
        <>
          <Moon />
          <Fireflies count={40} />
          <Stars radius={50} depth={30} count={1500} factor={3} saturation={0} fade speed={0.5} />
        </>
      )}

      {/* Day elements */}
      {!isNight && (
        <>
          <Cloud position={[-5, 10, -8]} speed={0.2} opacity={0.3} />
          <Cloud position={[8, 12, -12]} speed={0.1} opacity={0.2} />
        </>
      )}
    </>
  );
}

// ─── Main Export ────────────────────────────────
export function ForestScene({
  isNight,
  children,
}: {
  isNight: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: isNight ? '#0B1026' : '#87CEEB' }}
      >
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.3}
          enableDamping
          dampingFactor={0.05}
          target={[0, 0.5, 0]}
        />
        <SceneContent isNight={isNight} />
        {children}
      </Canvas>
    </div>
  );
}
