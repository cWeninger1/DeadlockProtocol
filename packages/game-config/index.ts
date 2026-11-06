export const range = {
  width: 32,
  length: 44,
  eyeHeight: 1.7,
  radius: 0.35,
  speed: 5,
  spawnZ: -16,
} as const;

export const barriers = [
  { x: -5, z: -4, width: 6, depth: 3, height: 3 },
  { x: 5, z: 3, width: 4, depth: 5, height: 4 },
  { x: -3, z: 12, width: 9, depth: 2, height: 2 },
] as const;

type Position = { x: number; z: number };
export function walk(
  position: Position,
  forward: number,
  right: number,
  yaw: number,
  seconds: number,
): Position {
  const distance =
    (range.speed * Math.max(0, Math.min(seconds, 0.05))) /
    Math.max(1, Math.hypot(forward, right));
  const dx = (forward * Math.sin(yaw) + right * Math.cos(yaw)) * distance;
  const dz = (forward * Math.cos(yaw) - right * Math.sin(yaw)) * distance;
  const open = (x: number, z: number) =>
    Math.abs(x) <= range.width / 2 - range.radius &&
    Math.abs(z) <= range.length / 2 - range.radius &&
    barriers.every(
      (b) =>
        Math.abs(x - b.x) >= b.width / 2 + range.radius - 1e-9 ||
        Math.abs(z - b.z) >= b.depth / 2 + range.radius - 1e-9,
    );
  const x = open(position.x + dx, position.z) ? position.x + dx : position.x;
  return { x, z: open(x, position.z + dz) ? position.z + dz : position.z };
}
