/**
 * Collision utilities for the 3D character controller.
 *
 * Instead of raycasting against ALL 307 meshes in the map scene, we classify
 * meshes once on load into collision groups (walkable / blocking / passthrough)
 * so raycasts only target relevant geometry.
 */
import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────
export interface CollisionData {
  walkableMeshes: THREE.Mesh[];  // Terrain surfaces for ground detection
  blockingMeshes: THREE.Mesh[];  // Buildings, trunks, fences, rocks for wall collision
  waterMeshes: THREE.Mesh[];     // Water planes (block movement)
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

// ─── Constants ───────────────────────────────────────────
// Small Y offset to prevent character feet from clipping into the ground mesh
export const GROUND_Y_OFFSET = 0.02;
// Maximum Y drop per step before movement is blocked (prevents falling off cliffs/edges)
export const MAX_STEP_DOWN = 0.8;
// Maximum Y rise per step before movement is blocked (prevents climbing walls)
export const MAX_STEP_UP = 0.6;
// If ground Y is below this absolute value, treat as "off the map" (water/void)
export const MIN_GROUND_Y = -1.5;

// ─── Name pattern classification ─────────────────────────
const WALKABLE_PATTERNS = [
  'grass', 'ground', 'path', 'dirt', 'road', 'floor', 'terrain', 'stone',
  'bridge', 'platform', 'land', 'soil',
];

const BLOCKING_PATTERNS = [
  'cube', 'fence', 'wall', 'rock', 'cylinder', 'house', 'building',
  'bridge_rail', 'railing', 'barrel', 'crate', 'pillar', 'post',
  'trunk', 'stump',
];

const WATER_PATTERNS = ['river', 'water', 'pond', 'lake', 'stream'];

const PASSTHROUGH_PATTERNS = [
  'icosphere', 'leaf', 'leaves', 'light', 'lamp', 'fairy', 'particle',
  'cloud', 'fire', 'flame', 'smoke', 'spark', 'glow', 'canopy', 'crown',
  'sphere', 'fish', 'duck', 'mball', 'torus', 'bird',
];

function matchesPatterns(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function matchesPatternsDirect(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function getAncestorNames(obj: THREE.Object3D): string {
  const names: string[] = [];
  let current = obj.parent;
  while (current) {
    if (current.name) names.push(current.name.toLowerCase());
    current = current.parent;
  }
  return names.join(' ');
}

// ─── Normal analysis for unrecognized meshes ─────────────
function analyzeNormals(mesh: THREE.Mesh): 'walkable' | 'blocking' | 'passthrough' {
  const geometry = mesh.geometry;
  if (!geometry) return 'passthrough';

  // For non-indexed and indexed geometries, sample face normals
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | null;
  if (!normalAttr) return 'passthrough';

  const worldNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

  let totalY = 0;
  let count = 0;
  // Sample up to 50 normals for performance
  const step = Math.max(1, Math.floor(normalAttr.count / 50));

  for (let i = 0; i < normalAttr.count; i += step) {
    worldNormal.set(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
    worldNormal.applyMatrix3(normalMatrix).normalize();
    totalY += Math.abs(worldNormal.y);
    count++;
  }

  if (count === 0) return 'passthrough';

  const avgAbsY = totalY / count;
  // Mostly upward-facing → walkable
  if (avgAbsY > 0.6) return 'walkable';
  // Mostly vertical → blocking
  if (avgAbsY < 0.3) return 'blocking';
  // Ambiguous → passthrough (safer to let things through than block incorrectly
  // since the map has many decorative meshes that shouldn't block movement)
  return 'passthrough';
}

// ─── Terrain deduplication ───────────────────────────────
// Among walkable meshes at similar XZ positions, keep only the topmost to avoid
// raycast confusion from 5 overlapping terrain layers.
// Only deduplicates small meshes with very similar bounding boxes — large terrain
// meshes are always kept to avoid removing coverage.
function deduplicateTerrainLayers(meshes: THREE.Mesh[]): THREE.Mesh[] {
  if (meshes.length <= 1) return meshes;

  const _box = new THREE.Box3();
  const Y_THRESHOLD = 0.3; // Keep separate if Y difference > 0.3

  interface MeshEntry {
    mesh: THREE.Mesh;
    centerX: number;
    centerY: number;
    centerZ: number;
    sizeXZ: number; // Approximate XZ footprint
  }

  const entries: MeshEntry[] = meshes.map((mesh) => {
    _box.setFromObject(mesh);
    const center = _box.getCenter(new THREE.Vector3());
    const size = _box.getSize(new THREE.Vector3());
    return {
      mesh,
      centerX: center.x,
      centerY: center.y,
      centerZ: center.z,
      sizeXZ: Math.max(size.x, size.z),
    };
  });

  // Sort by centerY descending — highest first
  entries.sort((a, b) => b.centerY - a.centerY);

  const kept: MeshEntry[] = [];
  const removed = new Set<THREE.Mesh>();

  for (const entry of entries) {
    if (removed.has(entry.mesh)) continue;

    // Never remove large meshes (footprint > 3 units) — they likely cover unique terrain
    if (entry.sizeXZ > 3.0) {
      kept.push(entry);
      continue;
    }

    // Check if any already-kept mesh overlaps significantly in XZ
    let isDuplicate = false;
    for (const keptEntry of kept) {
      const dxCenter = Math.abs(entry.centerX - keptEntry.centerX);
      const dzCenter = Math.abs(entry.centerZ - keptEntry.centerZ);
      // Only deduplicate meshes of similar size that nearly perfectly overlap
      const sizeDiff = Math.abs(entry.sizeXZ - keptEntry.sizeXZ);
      const overlapThreshold = Math.min(entry.sizeXZ, keptEntry.sizeXZ) * 0.3;

      if (
        sizeDiff < 0.5 &&
        dxCenter < overlapThreshold &&
        dzCenter < overlapThreshold &&
        Math.abs(entry.centerY - keptEntry.centerY) < Y_THRESHOLD
      ) {
        isDuplicate = true;
        removed.add(entry.mesh);
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(entry);
    }
  }

  return kept.map((e) => e.mesh);
}

// ─── Build collision data from map scene ─────────────────
export function buildCollisionData(mapScene: THREE.Object3D): CollisionData {
  const walkable: THREE.Mesh[] = [];
  const blocking: THREE.Mesh[] = [];
  const water: THREE.Mesh[] = [];
  const _box = new THREE.Box3();
  const _size = new THREE.Vector3();

  // Ensure world matrices are up to date
  mapScene.updateMatrixWorld(true);

  mapScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    const name = (mesh.name || '').toLowerCase();
    const ancestorNames = getAncestorNames(mesh);
    const combinedName = `${name} ${ancestorNames}`;

    // 1. Check explicit passthrough first
    if (matchesPatterns(combinedName, PASSTHROUGH_PATTERNS)) {
      return; // Skip — visual only
    }

    // 2. Check water
    if (matchesPatterns(combinedName, WATER_PATTERNS)) {
      water.push(mesh);
      return;
    }

    // 3. Check explicit blocking on DIRECT mesh name first (before walkable)
    // This prevents 'stone_wall' from matching 'stone' as walkable via ancestor names
    if (matchesPatternsDirect(name, BLOCKING_PATTERNS)) {
      // Exclude very small meshes (decorative details)
      _box.setFromObject(mesh);
      _box.getSize(_size);
      if (_size.x > 0.1 && _size.y > 0.1 && _size.z > 0.1) {
        blocking.push(mesh);
      }
      return;
    }

    // 4. Check explicit walkable
    if (matchesPatterns(combinedName, WALKABLE_PATTERNS)) {
      walkable.push(mesh);
      return;
    }

    // 5. Check blocking on combined name (ancestor-based)
    if (matchesPatterns(combinedName, BLOCKING_PATTERNS)) {
      // Exclude very small meshes (decorative details)
      _box.setFromObject(mesh);
      _box.getSize(_size);
      if (_size.x > 0.1 && _size.y > 0.1 && _size.z > 0.1) {
        blocking.push(mesh);
      }
      return;
    }

    // 6. Unrecognized mesh — use normal analysis
    const classification = analyzeNormals(mesh);
    switch (classification) {
      case 'walkable':
        walkable.push(mesh);
        break;
      case 'blocking':
        // Exclude very small meshes
        _box.setFromObject(mesh);
        _box.getSize(_size);
        if (_size.x > 0.1 && _size.y > 0.1 && _size.z > 0.1) {
          blocking.push(mesh);
        }
        break;
      default:
        // passthrough — skip
        break;
    }
  });

  // Deduplicate terrain layers
  const deduplicatedWalkable = deduplicateTerrainLayers(walkable);

  // Debug: log classification results
  console.log('[CollisionData] Classification results:');
  console.log('  Walkable meshes (before dedup):', walkable.length);
  console.log('  Walkable meshes (after dedup):', deduplicatedWalkable.length);
  console.log('  Blocking meshes:', blocking.length);
  console.log('  Water meshes:', water.length);
  if (deduplicatedWalkable.length > 0) {
    console.log('  Walkable mesh names:', deduplicatedWalkable.slice(0, 10).map(m => m.name || '(unnamed)'));
    // Log world-space bounding boxes for walkable meshes
    deduplicatedWalkable.forEach(m => {
      const b = new THREE.Box3().setFromObject(m);
      console.log('    ' + (m.name || '(unnamed)') + ' world bounds:',
        'X[' + b.min.x.toFixed(1) + ',' + b.max.x.toFixed(1) + ']',
        'Y[' + b.min.y.toFixed(1) + ',' + b.max.y.toFixed(1) + ']',
        'Z[' + b.min.z.toFixed(1) + ',' + b.max.z.toFixed(1) + ']');
    });
    // Test raycast at origin to verify ground detection works
    const testRay = new THREE.Raycaster(new THREE.Vector3(0, 30, 0), new THREE.Vector3(0, -1, 0), 0, 50);
    const testHits = testRay.intersectObjects(deduplicatedWalkable, false);
    console.log('  [DEBUG] Test raycast at (0,30,0) downward hits:', testHits.length);
    testHits.forEach(h => {
      console.log('    hit Y=' + h.point.y.toFixed(3) + ' face normal Y=' + (h.face ? h.face.normal.y.toFixed(3) : 'null'));
    });
  }
  if (deduplicatedWalkable.length === 0) {
    console.warn('  ⚠️ No walkable meshes found! All walkable names:', walkable.map(m => m.name || '(unnamed)'));
  }

  // Compute bounds from walkable mesh positions with 1.0-unit margin
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  for (const mesh of deduplicatedWalkable) {
    _box.setFromObject(mesh);
    if (_box.min.x < minX) minX = _box.min.x;
    if (_box.max.x > maxX) maxX = _box.max.x;
    if (_box.min.z < minZ) minZ = _box.min.z;
    if (_box.max.z > maxZ) maxZ = _box.max.z;
  }

  // Add margin
  const MARGIN = 1.0;
  minX -= MARGIN;
  maxX += MARGIN;
  minZ -= MARGIN;
  maxZ += MARGIN;

  // Fallback if no walkable meshes found
  if (!isFinite(minX)) {
    minX = -20;
    maxX = 20;
    minZ = -20;
    maxZ = 20;
  }

  return {
    walkableMeshes: deduplicatedWalkable,
    blockingMeshes: blocking,
    waterMeshes: water,
    bounds: { minX, maxX, minZ, maxZ },
  };
}

// ─── Ground Y Cache (spatial hash) ──────────────────────
const groundYCache = new Map<string, { y: number; time: number }>();
const CACHE_GRID = 0.25; // 0.25-unit grid cells
const CACHE_TTL = 500; // 500ms cache lifetime

function getCacheKey(x: number, z: number): string {
  return `${Math.round(x / CACHE_GRID)},${Math.round(z / CACHE_GRID)}`;
}

// Clear expired cache entries periodically
let lastCachePurge = 0;
function purgeExpiredCache(now: number) {
  if (now - lastCachePurge < 2000) return; // Purge every 2 seconds max
  lastCachePurge = now;
  for (const [key, entry] of groundYCache) {
    if (now - entry.time > CACHE_TTL * 4) {
      groundYCache.delete(key);
    }
  }
}

// ─── Shared raycaster instances (reused to avoid GC pressure) ─────
const _groundRaycaster = new THREE.Raycaster();
const _collisionRaycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3(0, -1, 0);
const _collisionDir = new THREE.Vector3();
const _faceNormal = new THREE.Vector3();

/**
 * Cast a ray downward from (x, highY, z) to find the walkable ground surface Y.
 *
 * Only raycasts against the pre-classified walkable meshes (5-10 meshes)
 * instead of the entire scene (307 meshes).
 *
 * Strategy: find the TOPMOST walkable surface that is NOT a rooftop/canopy.
 * - If referenceY is given, skip surfaces more than maxAboveRef above it.
 * - Among remaining, pick the HIGHEST (first/topmost) walkable surface.
 */
export function getGroundYFromMeshes(
  meshes: THREE.Mesh[],
  x: number,
  z: number,
  fallbackY: number,
  referenceY?: number,
  highY = 30,
): number {
  if (meshes.length === 0) return fallbackY;

  // Check cache first
  const now = Date.now();
  purgeExpiredCache(now);
  const cacheKey = getCacheKey(x, z);
  const cached = groundYCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.y;
  }

  _rayOrigin.set(x, highY, z);
  _groundRaycaster.set(_rayOrigin, _rayDir);
  _groundRaycaster.far = highY + 20;

  const intersects = _groundRaycaster.intersectObjects(meshes, false);
  if (intersects.length === 0) {
    return fallbackY;
  }

  const maxAboveRef = 3.0;

  // Walk through top-to-bottom and return the FIRST walkable surface
  for (const hit of intersects) {
    // Check if this face is upward-facing (walkable)
    let isWalkable = false;
    if (hit.face) {
      _faceNormal.copy(hit.face.normal);
      if (hit.object.matrixWorld) {
        _faceNormal.transformDirection(hit.object.matrixWorld);
      }
      isWalkable = _faceNormal.y > 0.3;
    }
    // If face is null, skip this hit (don't assume walkable)

    if (!isWalkable) continue;

    // Skip surfaces way above reference (rooftops/canopies)
    if (referenceY !== undefined && hit.point.y > referenceY + maxAboveRef) {
      continue;
    }

    // Cache the result
    groundYCache.set(cacheKey, { y: hit.point.y, time: now });
    return hit.point.y;
  }

  return fallbackY;
}

/**
 * Check if moving from current position to target position is safe.
 *
 * Phase 1: Ground validity (raycast against walkable meshes only)
 * Phase 2: Height-diff check (MAX_STEP_UP / MAX_STEP_DOWN)
 * Phase 3: Horizontal raycast against blocking meshes only
 * Phase 4: Boundary check (reject if outside map bounds)
 * Phase 5: Water check (reject if water found at target)
 */
export function canMoveToWithMeshes(
  collisionData: CollisionData,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  currentY: number,
  characterHeight = 1.0,
): boolean {
  // Phase 4: Boundary check (fast, do it first)
  const { bounds } = collisionData;
  if (toX < bounds.minX || toX > bounds.maxX || toZ < bounds.minZ || toZ > bounds.maxZ) {
    return false;
  }

  // Phase 1: Ground validity
  const targetGroundY = getGroundYFromMeshes(
    collisionData.walkableMeshes,
    toX,
    toZ,
    -999,
    currentY,
  );

  // If no ground found at target, check if there's ground at the source position.
  // If we're currently standing on valid ground but the target has none, block movement
  // to prevent walking on air. If source also has no ground, allow (we're already in void).
  if (targetGroundY <= MIN_GROUND_Y) {
    const sourceGroundY = getGroundYFromMeshes(
      collisionData.walkableMeshes,
      fromX,
      fromZ,
      -999,
      currentY,
    );
    // If we're currently on valid ground, don't let us walk into void
    if (sourceGroundY > MIN_GROUND_Y) {
      return false;
    }
    // Both source and target have no ground — allow movement (graceful fallback)
    // to avoid getting permanently stuck in unclassified areas
    return true;
  }

  // Phase 2: Height-diff check
  const yDiff = targetGroundY - currentY;
  if (yDiff > MAX_STEP_UP) {
    return false;
  }
  if (yDiff < -MAX_STEP_DOWN) {
    return false;
  }

  // Phase 3: Horizontal collision against blocking meshes only
  // Cast rays at multiple heights to catch short obstacles and tall walls
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 0.001 && collisionData.blockingMeshes.length > 0) {
    _collisionDir.set(dx / dist, 0, dz / dist);

    // Ray heights: low (0.15 — catches fences/short walls), mid (0.5), high (0.8)
    const rayHeights = [0.15, 0.5, 0.8];
    for (const hFraction of rayHeights) {
      _rayOrigin.set(fromX, currentY + characterHeight * hFraction, fromZ);
      _collisionRaycaster.set(_rayOrigin, _collisionDir);
      _collisionRaycaster.far = dist + 0.15;

      const hits = _collisionRaycaster.intersectObjects(collisionData.blockingMeshes, false);
      for (const hit of hits) {
        if (hit.face) {
          _faceNormal.copy(hit.face.normal);
          if (hit.object.matrixWorld) {
            _faceNormal.transformDirection(hit.object.matrixWorld);
          }
          if (Math.abs(_faceNormal.y) < 0.5) {
            return false;
          }
        } else {
          // No face normal available — treat blocking mesh hit as a wall
          return false;
        }
      }
    }
  }

  // Phase 5: Water check
  if (collisionData.waterMeshes.length > 0) {
    _rayOrigin.set(toX, 30, toZ);
    _groundRaycaster.set(_rayOrigin, _rayDir);
    _groundRaycaster.far = 50;

    const waterHits = _groundRaycaster.intersectObjects(collisionData.waterMeshes, false);
    if (waterHits.length > 0) {
      // Water found at target — check if it's above ground level
      const waterY = waterHits[0].point.y;
      if (waterY >= targetGroundY - 0.5) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Try sliding along walls when diagonal movement is blocked.
 *
 * If the full movement is blocked, try X-only, then Z-only movement.
 * Returns the best valid position or allowed: false if completely blocked.
 */
export function trySlideMovement(
  collisionData: CollisionData,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  currentY: number,
  characterHeight = 1.0,
): { x: number; z: number; allowed: boolean } {
  // First try the full movement
  if (canMoveToWithMeshes(collisionData, fromX, fromZ, toX, toZ, currentY, characterHeight)) {
    return { x: toX, z: toZ, allowed: true };
  }

  // Try X-only movement (slide along Z-aligned walls)
  if (
    Math.abs(toX - fromX) > 0.001 &&
    canMoveToWithMeshes(collisionData, fromX, fromZ, toX, fromZ, currentY, characterHeight)
  ) {
    return { x: toX, z: fromZ, allowed: true };
  }

  // Try Z-only movement (slide along X-aligned walls)
  if (
    Math.abs(toZ - fromZ) > 0.001 &&
    canMoveToWithMeshes(collisionData, fromX, fromZ, fromX, toZ, currentY, characterHeight)
  ) {
    return { x: fromX, z: toZ, allowed: true };
  }

  // Completely blocked
  return { x: fromX, z: fromZ, allowed: false };
}
