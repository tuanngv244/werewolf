'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Cloud, Float, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Preload the map model
const MAP_MODEL_PATH = '/models/map_model.glb';
useGLTF.preload(MAP_MODEL_PATH);

// ─── GLB Map Model ────────────────────────────────
function MapModel({
  onFireDetected,
  onMapSceneReady,
}: {
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
}) {
  const { scene } = useGLTF(MAP_MODEL_PATH);
  const primitiveRef = useRef<THREE.Object3D>(null);

  // Enable shadows on all meshes
  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  // After primitive is mounted and world matrices are computed,
  // detect fire/lamp positions in TRUE world space and notify parent
  useEffect(() => {
    if (primitiveRef.current) {
      const timeout = setTimeout(() => {
        if (!primitiveRef.current) return;

        // Ensure world matrices are up to date (includes primitive position/scale)
        primitiveRef.current.updateMatrixWorld(true);

        // Detect campfire position in world space.
        // Strategy: Find ground-level meshes with warm emissive materials (fire glow).
        // Filter: Y < 1.5 (ground level, not fairy lights high up).
        // Fall back to lamp posts if no ground-level emissive found.
        if (onFireDetected) {
          const campfirePositions: THREE.Vector3[] = [];
          const lampPositions: THREE.Vector3[] = [];

          primitiveRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const mat of materials) {
                const stdMat = mat as THREE.MeshStandardMaterial;
                if (stdMat.emissive && stdMat.emissiveIntensity > 0) {
                  const e = stdMat.emissive;
                  // Warm/fire-colored emissive (red/orange dominant)
                  if (e.r > 0.3 && e.g < e.r) {
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    // Only ground-level emissive sources (campfire, not fairy lights)
                    if (worldPos.y < 1.5) {
                      campfirePositions.push(worldPos);
                    }
                    break;
                  }
                }
              }
            }
            // Also collect lamp positions as fallback
            const name = (child.name || '').toLowerCase();
            if (name.includes('lamp') || name.includes('fire') || name.includes('flame')) {
              const worldPos = new THREE.Vector3();
              child.getWorldPosition(worldPos);
              lampPositions.push(worldPos);
            }
          });

          // Prefer campfire (ground-level emissive) over lamp posts
          const positions = campfirePositions.length > 0 ? campfirePositions : lampPositions;

          if (positions.length > 0) {
            const avg = new THREE.Vector3();
            positions.forEach((p) => avg.add(p));
            avg.divideScalar(positions.length);
            onFireDetected(avg);
          }
        }

        // Notify parent that map scene is ready for raycasting
        if (onMapSceneReady) {
          onMapSceneReady(primitiveRef.current);
        }
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [onFireDetected, onMapSceneReady]);

  // The map model — scale=1, position adjusted so ground is near Y=0
  return (
    <primitive
      ref={primitiveRef}
      object={scene}
      scale={1.0}
      position={[0, -1.0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ─── Fireflies (Night) ────────────────────────────────
function Fireflies({ count = 30 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 3 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
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
      <pointLight position={[8, 12, -10]} color="#8899BB" intensity={4} distance={50} />
    </Float>
  );
}

// ─── Scene Content ────────────────────────────────
function SceneContent({
  isNight,
  onFireDetected,
  onMapSceneReady,
}: {
  isNight: boolean;
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (ambientRef.current) {
      const target = isNight ? 0.35 : 0.6;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.02;
      const color = isNight ? new THREE.Color('#556688') : new THREE.Color('#FFF8E7');
      ambientRef.current.color.lerp(color, 0.02);
    }
    if (dirRef.current) {
      const target = isNight ? 0.6 : 1.2;
      dirRef.current.intensity += (target - dirRef.current.intensity) * 0.02;
      const color = isNight ? new THREE.Color('#7788BB') : new THREE.Color('#FFE4B5');
      dirRef.current.color.lerp(color, 0.02);
    }
  });

  return (
    <>
      {/* Lights */}
      <ambientLight ref={ambientRef} intensity={isNight ? 0.35 : 0.6} />
      <directionalLight
        ref={dirRef}
        position={isNight ? [5, 15, -5] : [15, 20, 10]}
        intensity={isNight ? 0.6 : 1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      {/* GLB Map Model */}
      <MapModel onFireDetected={onFireDetected} onMapSceneReady={onMapSceneReady} />

      {/* Fog */}
      <fog attach="fog" args={[isNight ? '#1A2240' : '#C8DFF0', 18, 55]} />

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

// ─── Camera Controller (Panoramic vs Third-Person) ────────────────────
type CameraMode = 'panoramic' | 'thirdPerson';

function CameraController({
  mode,
  playerPosition,
  playerRotation,
}: {
  mode: CameraMode;
  playerPosition?: THREE.Vector3 | null;
  playerRotation?: number;
}) {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const smoothPosRef = useRef(new THREE.Vector3(0, 2, 0));
  const smoothLookRef = useRef(new THREE.Vector3(0, 1.5, 0));
  const isFirstFrameRef = useRef(true);

  // Third-person camera offset: behind and above the character
  const cameraOffset = useRef(new THREE.Vector3(0, 3.5, 5.5));

  useFrame((_, delta) => {
    if (mode === 'thirdPerson' && playerPosition) {
      // Disable orbit controls in third-person mode
      if (orbitRef.current) {
        orbitRef.current.enabled = false;
      }

      const rot = playerRotation ?? 0;

      // Calculate desired camera position: behind the player
      const offsetX = Math.sin(rot) * cameraOffset.current.z;
      const offsetZ = Math.cos(rot) * cameraOffset.current.z;

      const targetPos = new THREE.Vector3(
        playerPosition.x + offsetX,
        playerPosition.y + cameraOffset.current.y,
        playerPosition.z + offsetZ,
      );

      const targetLook = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + 1.2,
        playerPosition.z,
      );

      // Smooth interpolation (faster for first frame)
      const lerpFactor = isFirstFrameRef.current ? 1.0 : Math.min(1.0, delta * 4.0);
      isFirstFrameRef.current = false;

      smoothPosRef.current.lerp(targetPos, lerpFactor);
      smoothLookRef.current.lerp(targetLook, lerpFactor);

      camera.position.copy(smoothPosRef.current);
      camera.lookAt(smoothLookRef.current);
    } else {
      // Panoramic mode — enable orbit controls
      if (orbitRef.current) {
        orbitRef.current.enabled = true;
      }
      isFirstFrameRef.current = true;
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      minDistance={6}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={0.3}
      enableDamping
      dampingFactor={0.05}
      target={[3, 1.0, 0]}
    />
  );
}

// ─── Main Export ────────────────────────────────
export function ForestScene({
  isNight,
  children,
  onFireDetected,
  onMapSceneReady,
  cameraMode,
  localPlayerPosition,
  localPlayerRotation,
}: {
  isNight: boolean;
  children?: React.ReactNode;
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
  cameraMode?: CameraMode;
  localPlayerPosition?: THREE.Vector3 | null;
  localPlayerRotation?: number;
}) {
  // Stable callback ref to avoid re-renders
  const fireCallbackRef = useRef(onFireDetected);
  fireCallbackRef.current = onFireDetected;
  const stableFireCallback = useCallback((pos: THREE.Vector3) => {
    fireCallbackRef.current?.(pos);
  }, []);

  const mapSceneCallbackRef = useRef(onMapSceneReady);
  mapSceneCallbackRef.current = onMapSceneReady;
  const stableMapSceneCallback = useCallback((scene: THREE.Object3D) => {
    mapSceneCallbackRef.current?.(scene);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        camera={{ position: [3, 10, 16], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: isNight ? '#1A2240' : '#87CEEB' }}
      >
        <CameraController
          mode={cameraMode ?? 'panoramic'}
          playerPosition={localPlayerPosition}
          playerRotation={localPlayerRotation}
        />
        <SceneContent
          isNight={isNight}
          onFireDetected={stableFireCallback}
          onMapSceneReady={stableMapSceneCallback}
        />
        {children}
      </Canvas>
    </div>
  );
}
