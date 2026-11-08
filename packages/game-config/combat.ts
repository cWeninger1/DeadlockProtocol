import { barriers, movement, range } from "./settings";
import type { Player } from "./movement";
import { createLoadout, type Loadout } from "./weapon";

export type Team = "Attackers" | "Defenders";
export type CombatState = {
  health: number;
  team: Team;
  loadout: Loadout;
  life: number;
  shots: number;
  hits: number;
  kills: number;
  deaths: number;
  diedAt: number;
  shotTick: number;
  recoil: number;
  burst: number;
};
export const combatRules = { health: 100, respawnTicks: 60 } as const;
export function createCombat(team: Team): CombatState {
  return {
    team,
    health: 100,
    loadout: createLoadout(),
    life: 0,
    shots: 0,
    hits: 0,
    kills: 0,
    deaths: 0,
    diedAt: -1000,
    shotTick: -1000,
    recoil: 0,
    burst: 0,
  };
}
type Point = { x: number; y: number; z: number };
type Box = { min: Point; max: Point };
function rayBox(origin: Point, direction: Point, box: Box): number {
  let near = 0,
    far = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    if (Math.abs(direction[axis]) < 1e-9) {
      if (origin[axis] < box.min[axis] || origin[axis] > box.max[axis])
        return Infinity;
      continue;
    }
    const a = (box.min[axis] - origin[axis]) / direction[axis];
    const b = (box.max[axis] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return Infinity;
  }
  return near;
}
const cover: Box[] = barriers.map((b) => ({
  min: { x: b.x - b.width / 2, y: 0, z: b.z - b.depth / 2 },
  max: { x: b.x + b.width / 2, y: b.height, z: b.z + b.depth / 2 },
}));
export function tracePlayerShot(
  shooter: Player,
  yaw: number,
  pitch: number,
  distance: number,
  targets: { id: string; player: Player }[],
): string | undefined {
  const origin = {
    x: shooter.x,
    y:
      shooter.y +
      (shooter.crouched ? movement.crouchEyeHeight : range.eyeHeight),
    z: shooter.z,
  };
  const direction = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  };
  let nearest = distance;
  for (const box of cover)
    nearest = Math.min(nearest, rayBox(origin, direction, box));
  let result: string | undefined;
  for (const target of targets) {
    const p = target.player;
    const hit = rayBox(origin, direction, {
      min: { x: p.x - 0.3, y: p.y, z: p.z - 0.3 },
      max: { x: p.x + 0.3, y: p.y + (p.crouched ? 1.1 : 1.8), z: p.z + 0.3 },
    });
    if (hit < nearest) {
      nearest = hit;
      result = target.id;
    }
  }
  return result;
}
