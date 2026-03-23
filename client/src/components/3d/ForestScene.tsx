'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { buildCollisionData, type CollisionData } from './collision-utils';

// Preload the map model
const MAP_MODEL_PATH = '/models/map_model.glb';
useGLTF.preload(MAP_MODEL_PATH);

// ─── GLB Map Model ────────────────────────────────
function MapModel({
  onFireDetected,
  onMapSceneReady,
  onCollisionDataReady,
}: {
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
  onCollisionDataReady?: (data: CollisionData) => void;
}) {
  const { scene } = useGLTF(MAP_MODEL_PATH);
  const primitiveRef = useRef<THREE.Object3D>(null);

  // Enable receive-shadow only on large ground meshes (not all 307 meshes)
  // This significantly reduces draw calls — skip castShadow on map meshes entirely
  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        // Only large ground-like meshes receive shadows
        const name = (mesh.name || '').toLowerCase();
        if (name.includes('ground') || name.includes('grass') || name.includes('terrain') || name.includes('path') || name.includes('dirt') || name.includes('road') || name.includes('floor')) {
          mesh.receiveShadow = true;
        } else {
          mesh.receiveShadow = false;
        }
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

        // Build and emit collision data
        if (onCollisionDataReady) {
          const collisionData = buildCollisionData(primitiveRef.current);
          onCollisionDataReady(collisionData);
        }
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [onFireDetected, onMapSceneReady, onCollisionDataReady]);

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
function Fireflies({ count = 15 }: { count?: number }) {
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

  const frameRef = useRef(0);

  useFrame(({ clock }) => {
    if (ref.current) {
      // Update only every 3rd frame for performance
      frameRef.current++;
      if (frameRef.current % 3 !== 0) return;
      const t = clock.getElapsedTime();
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.005;
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
    <mesh position={[8, 12, -10]}>
      <sphereGeometry args={[1.5, 12, 12]} />
      <meshBasicMaterial color="#C4D7E0" />
    </mesh>
  );
}

// ─── Scene Content ────────────────────────────────
function SceneContent({
  isNight,
  onFireDetected,
  onMapSceneReady,
  onCollisionDataReady,
}: {
  isNight: boolean;
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
  onCollisionDataReady?: (data: CollisionData) => void;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  // Pre-allocate color targets to avoid GC per frame
  const _nightAmbientColor = useMemo(() => new THREE.Color('#556688'), []);
  const _dayAmbientColor = useMemo(() => new THREE.Color('#FFF8E7'), []);
  const _nightDirColor = useMemo(() => new THREE.Color('#7788BB'), []);
  const _dayDirColor = useMemo(() => new THREE.Color('#FFE4B5'), []);

  useFrame(() => {
    if (ambientRef.current) {
      const target = isNight ? 0.35 : 0.6;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.02;
      ambientRef.current.color.lerp(isNight ? _nightAmbientColor : _dayAmbientColor, 0.02);
    }
    if (dirRef.current) {
      const target = isNight ? 0.6 : 1.2;
      dirRef.current.intensity += (target - dirRef.current.intensity) * 0.02;
      dirRef.current.color.lerp(isNight ? _nightDirColor : _dayDirColor, 0.02);
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
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* GLB Map Model */}
      <MapModel onFireDetected={onFireDetected} onMapSceneReady={onMapSceneReady} onCollisionDataReady={onCollisionDataReady} />

      {/* Fog */}
      <fog attach="fog" args={[isNight ? '#1A2240' : '#C8DFF0', 18, 55]} />

      {/* Night elements */}
      {isNight && (
        <>
          <Moon />
          <Fireflies count={15} />
          <Stars radius={50} depth={30} count={800} factor={3} saturation={0} fade speed={0.3} />
        </>
      )}

      {/* Day elements — clouds removed for performance */}
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
  // How far ahead of the character the camera looks
  const lookAheadDist = 2.0;
  // Reusable vectors to avoid per-frame allocations
  const _targetPos = useMemo(() => new THREE.Vector3(), []);
  const _targetLook = useMemo(() => new THREE.Vector3(), []);

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

      _targetPos.set(
        playerPosition.x + offsetX,
        playerPosition.y + cameraOffset.current.y,
        playerPosition.z + offsetZ,
      );

      // Look ahead of the character in the direction they're facing
      _targetLook.set(
        playerPosition.x - Math.sin(rot) * lookAheadDist,
        playerPosition.y + 1.2,
        playerPosition.z - Math.cos(rot) * lookAheadDist,
      );

      // Smooth interpolation (faster for first frame)
      const lerpFactor = isFirstFrameRef.current ? 1.0 : Math.min(1.0, delta * 4.0);
      isFirstFrameRef.current = false;

      smoothPosRef.current.lerp(_targetPos, lerpFactor);
      smoothLookRef.current.lerp(_targetLook, lerpFactor);

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
  onCollisionDataReady,
  cameraMode,
  localPlayerPosition,
  localPlayerRotation,
}: {
  isNight: boolean;
  children?: React.ReactNode;
  onFireDetected?: (pos: THREE.Vector3) => void;
  onMapSceneReady?: (scene: THREE.Object3D) => void;
  onCollisionDataReady?: (data: CollisionData) => void;
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

  const collisionCallbackRef = useRef(onCollisionDataReady);
  collisionCallbackRef.current = onCollisionDataReady;
  const stableCollisionCallback = useCallback((data: CollisionData) => {
    collisionCallbackRef.current?.(data);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows="basic"
        camera={{ position: [3, 10, 16], fov: 50, near: 0.1, far: 150 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
        dpr={[1, 1.5]}
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
          onCollisionDataReady={stableCollisionCallback}
        />
        {children}
      </Canvas>
    </div>
  );
}
